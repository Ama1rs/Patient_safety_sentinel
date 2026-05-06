#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::{env, process::Command};

#[derive(Serialize)]
struct PageLink {
    text: String,
    href: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PageSnapshot {
    url: String,
    title: String,
    description: String,
    headings: Vec<String>,
    links: Vec<PageLink>,
    fetched_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotRequest {
    target: String,

    #[serde(default)]
    render_js: bool,
}

#[tauri::command]
async fn fetch_page_snapshot(request: SnapshotRequest) -> Result<PageSnapshot, String> {
    let body = if request.render_js {
        let target = request.target.clone();
        tauri::async_runtime::spawn_blocking(move || fetch_rendered_html(&target))
            .await
            .map_err(|error| error.to_string())??
    } else {
        fetch_static_html(&request.target).await?
    };

    parse_page_snapshot(&request.target, &body)
}

async fn fetch_static_html(target: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("PatientSafetySentinel/0.1")
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .get(target)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    response.text().await.map_err(|error| error.to_string())
}

fn fetch_rendered_html(target: &str) -> Result<String, String> {
    let mut last_error = None;

    for browser in browser_candidates() {
        let output = Command::new(&browser)
            .args([
                "--headless",
                "--disable-gpu",
                "--dump-dom",
                "--virtual-time-budget=7000",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-extensions",
                "--disable-background-networking",
                "--disable-sync",
                "--mute-audio",
                target,
            ])
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let body = String::from_utf8(output.stdout)
                    .map_err(|error| format!("browser returned invalid UTF-8: {error}"))?;

                if body.trim().is_empty() {
                    return Err(format!("browser returned an empty document for {target}"));
                }

                return Ok(body);
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                last_error = Some(format!(
                    "{browser} exited with status {}{}",
                    output.status,
                    if stderr.is_empty() {
                        String::new()
                    } else {
                        format!(": {stderr}")
                    }
                ));
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => return Err(format!("failed to launch {browser}: {error}")),
        }
    }

    Err(last_error.unwrap_or_else(|| {
        "no supported headless browser was found. Install Microsoft Edge or Google Chrome, or add them to PATH.".to_string()
    }))
}

fn browser_candidates() -> Vec<String> {
    let mut candidates = Vec::new();

    if cfg!(target_os = "windows") {
        if let Some(program_files) = env::var_os("ProgramFiles") {
            candidates.push(format!(
                "{}\\Microsoft\\Edge\\Application\\msedge.exe",
                program_files.to_string_lossy()
            ));
            candidates.push(format!(
                "{}\\Google\\Chrome\\Application\\chrome.exe",
                program_files.to_string_lossy()
            ));
        }

        if let Some(program_files_x86) = env::var_os("ProgramFiles(x86)") {
            candidates.push(format!(
                "{}\\Microsoft\\Edge\\Application\\msedge.exe",
                program_files_x86.to_string_lossy()
            ));
            candidates.push(format!(
                "{}\\Google\\Chrome\\Application\\chrome.exe",
                program_files_x86.to_string_lossy()
            ));
        }

        candidates.extend(["msedge", "chrome", "chromium"].into_iter().map(String::from));
    } else if cfg!(target_os = "macos") {
        candidates.extend([
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "msedge",
            "google-chrome",
            "chromium",
        ]
        .into_iter()
        .map(String::from));
    } else {
        candidates.extend([
            "google-chrome",
            "chromium",
            "chromium-browser",
            "microsoft-edge",
        ]
        .into_iter()
        .map(String::from));
    }

    candidates
}

fn parse_page_snapshot(target: &str, body: &str) -> Result<PageSnapshot, String> {
    let document = Html::parse_document(body);

    let title_selector = Selector::parse("title").map_err(|error| error.to_string())?;
    let meta_selector = Selector::parse("meta[name='description']").map_err(|error| error.to_string())?;
    let heading_selector = Selector::parse("h1, h2, h3").map_err(|error| error.to_string())?;
    let link_selector = Selector::parse("a[href]").map_err(|error| error.to_string())?;

    let title = document
        .select(&title_selector)
        .next()
        .map(|node| node.text().collect::<Vec<_>>().join(" "))
        .unwrap_or_default();

    let description = document
        .select(&meta_selector)
        .next()
        .and_then(|node| node.value().attr("content"))
        .unwrap_or_default()
        .to_string();

    let headings = document
        .select(&heading_selector)
        .map(|node| node.text().collect::<Vec<_>>().join(" ").trim().to_string())
        .filter(|heading| !heading.is_empty())
        .take(12)
        .collect::<Vec<_>>();

    let links = document
        .select(&link_selector)
        .map(|node| PageLink {
            text: node.text().collect::<Vec<_>>().join(" ").trim().to_string(),
            href: node.value().attr("href").unwrap_or_default().to_string(),
        })
        .filter(|link| !link.href.is_empty())
        .take(16)
        .collect::<Vec<_>>();

    Ok(PageSnapshot {
        url: target.to_string(),
        title,
        description,
        headings,
        links,
        fetched_at: chrono_like_timestamp(),
    })
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}.{:03}Z", now.as_secs(), now.subsec_millis())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fetch_page_snapshot])
        .run(tauri::generate_context!())
        .expect("failed to run application");
}
