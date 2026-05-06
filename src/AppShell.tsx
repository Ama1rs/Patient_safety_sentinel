import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

type Density = 'compact' | 'cozy';
type Mode = 'dark' | 'light';
type ViewKey = 'overview' | 'signals' | 'sources' | 'extraction' | 'intelligence' | 'settings';

type PageSnapshot = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  links: { text: string; href: string }[];
  fetchedAt: string;
};

type SignalRow = {
  id: string;
  source: string;
  type: string;
  status: 'Active' | 'Review' | 'Escalated';
  confidence: number;
  trend: string;
  timestamp: string;
};

type SourceRow = {
  name: string;
  channel: string;
  coverage: string;
  freshness: string;
  health: 'Healthy' | 'Degraded' | 'Paused';
};

type GraphNode = {
  label: string;
  top: string;
  left: string;
  tone: 'accent' | 'success' | 'warning' | 'danger';
};

const navItems: { key: ViewKey; label: string; kicker: string }[] = [
  { key: 'overview', label: 'Dashboard', kicker: 'Analytic summary' },
  { key: 'signals', label: 'Signals', kicker: 'Alerts and cases' },
  { key: 'sources', label: 'Sources', kicker: 'Feed inventory' },
  { key: 'extraction', label: 'Extraction', kicker: 'Page capture' },
  { key: 'intelligence', label: 'Intelligence', kicker: 'Graph and map' },
  { key: 'settings', label: 'Settings', kicker: 'Modes and controls' },
];

const signalRows: SignalRow[] = [
  { id: 'SG-2041', source: 'X / public post', type: 'Suicide risk', status: 'Escalated', confidence: 94, trend: '+18%', timestamp: '2026-05-05 08:14' },
  { id: 'SG-2033', source: 'Forum thread', type: 'ADR report', status: 'Review', confidence: 81, trend: '+8%', timestamp: '2026-05-05 07:50' },
  { id: 'SG-2028', source: 'YouTube comments', type: 'Misinformation', status: 'Active', confidence: 67, trend: '+3%', timestamp: '2026-05-05 07:31' },
  { id: 'SG-2022', source: 'News / social', type: 'Community spread', status: 'Active', confidence: 72, trend: '+11%', timestamp: '2026-05-05 06:58' },
  { id: 'SG-2018', source: 'Reddit thread', type: 'Self-harm language', status: 'Review', confidence: 88, trend: '+5%', timestamp: '2026-05-05 06:22' },
];

const sourceRows: SourceRow[] = [
  { name: 'X ingest', channel: 'Streaming API', coverage: 'High', freshness: '30 sec', health: 'Healthy' },
  { name: 'Forums', channel: 'RSS + scrape', coverage: 'Medium', freshness: '2 min', health: 'Healthy' },
  { name: 'YouTube', channel: 'Comments', coverage: 'High', freshness: '4 min', health: 'Degraded' },
  { name: 'News watch', channel: 'Headlines', coverage: 'High', freshness: '1 min', health: 'Healthy' },
  { name: 'Community boards', channel: 'Headless browser', coverage: 'Medium', freshness: 'Paused', health: 'Paused' },
];

const graphNodes: GraphNode[] = [
  { label: 'Signal cluster', top: '18%', left: '18%', tone: 'accent' },
  { label: 'Risk vector', top: '40%', left: '48%', tone: 'danger' },
  { label: 'Source bridge', top: '58%', left: '22%', tone: 'success' },
  { label: 'Escalation', top: '28%', left: '72%', tone: 'warning' },
  { label: 'Review desk', top: '72%', left: '66%', tone: 'accent' },
];

const mapPins = [
  { label: 'Midwest', value: '42 active signals', top: '46%', left: '34%' },
  { label: 'Northeast', value: '18 active signals', top: '28%', left: '67%' },
  { label: 'Southwest', value: '9 active signals', top: '68%', left: '24%' },
];

const metadataItems = [
  ['Entity', 'Subject cluster 41A'],
  ['Region', 'North America / Midwest'],
  ['Risk vector', 'Suicide + ADR'],
  ['Last ingest', '3 min ago'],
  ['Source count', '14 active feeds'],
  ['Queue depth', '27 items'],
];

function AppShell() {
  const [mode, setMode] = useState<Mode>('dark');
  const [density, setDensity] = useState<Density>('compact');
  const [activeView, setActiveView] = useState<ViewKey>('overview');
  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const rowClass = density === 'compact' ? 'row row-compact' : 'row row-cozy';
  const currentView = navItems.find((item) => item.key === activeView) ?? navItems[0];

  const statusSummary = useMemo(
    () => [
      { label: 'Signals', value: '128' },
      { label: 'Escalations', value: '14' },
      { label: 'Feeds', value: '23' },
      { label: 'Latency', value: '1.4s' },
    ],
    [],
  );

  async function handleFetchPage() {
    setLoading(true);
    try {
      const result = await invoke<PageSnapshot>('fetch_page_snapshot', { target: targetUrl });
      setSnapshot(result);
    } catch (error) {
      setSnapshot({
        url: targetUrl,
        title: 'Fetch failed',
        description: String(error),
        headings: [],
        links: [],
        fetchedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  function renderOverview() {
    return (
      <>
        <section className="summary-grid">
          {statusSummary.map((item) => (
            <article className="panel metric" key={item.label}>
              <div className="metric-label">{item.label}</div>
              <div className="metric-value">{item.value}</div>
            </article>
          ))}
        </section>

        <section className="page-grid overview-grid">
          <section className="panel table-pane">
            <div className="module-bar">
              <div>
                <div className="module-kicker">Active monitoring</div>
                <h2>Signal Table</h2>
              </div>
              <div className="module-actions">
                <button>Filter</button>
                <button>Export</button>
                <button>History</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Trend</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {signalRows.map((row) => (
                    <tr className={rowClass} key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.source}</td>
                      <td>{row.type}</td>
                      <td><span className={`pill pill-${row.status.toLowerCase()}`}>{row.status}</span></td>
                      <td>{row.confidence}%</td>
                      <td>{row.trend}</td>
                      <td>{row.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel metadata-pane">
            <div className="module-bar">
              <div>
                <div className="module-kicker">Object metadata</div>
                <h2>Cluster 41A</h2>
              </div>
            </div>
            <dl className="metadata-list">
              {metadataItems.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        <section className="page-grid bottom-grid">
          <section className="panel viz-pane">
            <div className="module-bar">
              <div>
                <div className="module-kicker">Network view</div>
                <h2>Propagation graph</h2>
              </div>
            </div>
            <div className="graph-board">
              <div className="graph-link graph-link-a" />
              <div className="graph-link graph-link-b" />
              <div className="graph-link graph-link-c" />
              {graphNodes.map((node) => (
                <div key={node.label} className={`graph-node graph-node-${node.tone}`} style={{ top: node.top, left: node.left }}>
                  {node.label}
                </div>
              ))}
            </div>
          </section>

          <section className="panel map-pane">
            <div className="module-bar">
              <div>
                <div className="module-kicker">Geospatial layer</div>
                <h2>Regional heat map</h2>
              </div>
            </div>
            <div className="map-board">
              {mapPins.map((pin) => (
                <div key={pin.label} className="map-pin" style={{ top: pin.top, left: pin.left }}>
                  <strong>{pin.label}</strong>
                  <span>{pin.value}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </>
    );
  }

  function renderSignals() {
    return (
      <section className="page-grid three-column-grid">
        <section className="panel table-pane span-two">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Escalation queue</div>
              <h2>Case review</h2>
            </div>
            <div className="module-actions">
              <button>Assign</button>
              <button>Hold</button>
              <button>Close</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Trend</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {signalRows.map((row) => (
                  <tr className={rowClass} key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.source}</td>
                    <td>{row.type}</td>
                    <td><span className={`pill pill-${row.status.toLowerCase()}`}>{row.status}</span></td>
                    <td>{row.confidence}%</td>
                    <td>{row.trend}</td>
                    <td>{row.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel detail-pane">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Explainability</div>
              <h2>Why it was flagged</h2>
            </div>
          </div>
          <div className="detail-stack">
            <article>
              <h3>Pattern match</h3>
              <p>Language patterns align with recent distress phrasing and elevated symptom references.</p>
            </article>
            <article>
              <h3>Source convergence</h3>
              <p>The same cluster surfaced in two communities within the last 18 minutes.</p>
            </article>
            <article>
              <h3>Recommended action</h3>
              <p>Route to review desk, attach case notes, and preserve source context.</p>
            </article>
          </div>
        </aside>

        <section className="panel viz-pane span-two">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Thread propagation</div>
              <h2>Signal lineage</h2>
            </div>
          </div>
          <div className="graph-board graph-board-wide">
            <div className="graph-link graph-link-a" />
            <div className="graph-link graph-link-b" />
            <div className="graph-link graph-link-c" />
            <div className="graph-node graph-node-accent" style={{ top: '20%', left: '12%' }}>Origin</div>
            <div className="graph-node graph-node-warning" style={{ top: '50%', left: '42%' }}>Amplifier</div>
            <div className="graph-node graph-node-danger" style={{ top: '30%', left: '72%' }}>Escalated case</div>
            <div className="graph-node graph-node-success" style={{ top: '72%', left: '58%' }}>Verified thread</div>
          </div>
        </section>
      </section>
    );
  }

  function renderSources() {
    return (
      <section className="page-grid sources-grid">
        <section className="panel table-pane">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Source registry</div>
              <h2>Live feeds</h2>
            </div>
            <div className="module-actions">
              <button>Add feed</button>
              <button>Test</button>
              <button>Pause</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Channel</th>
                  <th>Coverage</th>
                  <th>Freshness</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((row) => (
                  <tr className={rowClass} key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.channel}</td>
                    <td>{row.coverage}</td>
                    <td>{row.freshness}</td>
                    <td><span className={`pill pill-${row.health.toLowerCase()}`}>{row.health}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel source-side">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Coverage</div>
              <h2>Ingestion status</h2>
            </div>
          </div>
          <div className="status-cards">
            <article>
              <strong>23</strong>
              <span>Active feeds</span>
            </article>
            <article>
              <strong>4</strong>
              <span>Transform errors</span>
            </article>
            <article>
              <strong>97%</strong>
              <span>Delivery success</span>
            </article>
          </div>
        </aside>

        <section className="panel span-two source-band">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Provenance</div>
              <h2>Regional and channel spread</h2>
            </div>
          </div>
          <div className="coverage-strip">
            <div>
              <strong>North America</strong>
              <span>High-volume streams with the fastest refresh cycle.</span>
            </div>
            <div>
              <strong>Community boards</strong>
              <span>Lower volume, high-context threads with longer retention.</span>
            </div>
            <div>
              <strong>News and alerts</strong>
              <span>Structured summaries with strong confidence scoring.</span>
            </div>
          </div>
        </section>
      </section>
    );
  }

  function renderExtraction() {
    return (
      <section className="page-grid extraction-grid">
        <section className="panel ingest-pane span-two">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Page extraction</div>
              <h2>Headless data input</h2>
            </div>
          </div>
          <div className="ingest-form">
            <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} />
            <button onClick={handleFetchPage} disabled={loading}>{loading ? 'Fetching...' : 'Fetch page'}</button>
          </div>
          <div className="snapshot-card">
            <div><strong>Title:</strong> {snapshot?.title ?? 'No page loaded'}</div>
            <div><strong>Description:</strong> {snapshot?.description ?? 'Use the fetch button to extract page metadata.'}</div>
            <div><strong>Fetched:</strong> {snapshot?.fetchedAt ?? '-'}</div>
          </div>
        </section>

        <aside className="panel detail-pane">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Queue</div>
              <h2>Capture steps</h2>
            </div>
          </div>
          <div className="detail-stack">
            <article>
              <h3>1. Load page</h3>
              <p>Send the target URL to the Rust command layer.</p>
            </article>
            <article>
              <h3>2. Extract HTML</h3>
              <p>Read title, metadata, headings, and links.</p>
            </article>
            <article>
              <h3>3. Extend later</h3>
              <p>Swap in a headless browser flow for rendered pages when needed.</p>
            </article>
          </div>
        </aside>

        <section className="panel snapshot-pane span-two">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Extracted content</div>
              <h2>Links and headings</h2>
            </div>
          </div>
          <div className="snapshot-grid">
            <div>
              <h3>Headings</h3>
              <ul>
                {(snapshot?.headings.length ? snapshot.headings : ['Waiting for a fetch...']).map((heading) => (
                  <li key={heading}>{heading}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Links</h3>
              <ul>
                {(snapshot?.links.length ? snapshot.links : [{ text: 'No extracted links yet', href: '' }]).map((link) => (
                  <li key={`${link.text}-${link.href}`}>
                    <span>{link.text}</span>
                    {link.href ? <small>{link.href}</small> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </section>
    );
  }

  function renderIntelligence() {
    return (
      <section className="page-grid intelligence-grid">
        <section className="panel viz-pane span-two">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Intelligence canvas</div>
              <h2>Node-link graph</h2>
            </div>
          </div>
          <div className="graph-board graph-board-wide">
            <div className="graph-link graph-link-a" />
            <div className="graph-link graph-link-b" />
            <div className="graph-link graph-link-c" />
            {graphNodes.map((node) => (
              <div key={node.label} className={`graph-node graph-node-${node.tone}`} style={{ top: node.top, left: node.left }}>
                {node.label}
              </div>
            ))}
          </div>
        </section>

        <aside className="panel map-pane">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Map layers</div>
              <h2>Regional context</h2>
            </div>
          </div>
          <div className="map-board map-board-tall">
            {mapPins.map((pin) => (
              <div key={pin.label} className="map-pin" style={{ top: pin.top, left: pin.left }}>
                <strong>{pin.label}</strong>
                <span>{pin.value}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="panel detail-pane span-two">
          <div className="module-bar">
            <div>
              <div className="module-kicker">XAI notes</div>
              <h2>Why the cluster matters</h2>
            </div>
          </div>
          <div className="coverage-strip compact-strip">
            <div>
              <strong>Risk vector</strong>
              <span>Cross-source similarity exceeded the threshold.</span>
            </div>
            <div>
              <strong>Context</strong>
              <span>Nearby posts and threads reinforce the same theme.</span>
            </div>
            <div>
              <strong>Action</strong>
              <span>Escalate, annotate, and preserve the evidence chain.</span>
            </div>
          </div>
        </section>
      </section>
    );
  }

  function renderSettings() {
    return (
      <section className="page-grid settings-grid">
        <section className="panel detail-pane">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Interface</div>
              <h2>Display controls</h2>
            </div>
          </div>
          <div className="settings-stack">
            <article>
              <strong>Theme mode</strong>
              <p>{mode === 'dark' ? 'Dark palette enabled' : 'Light palette enabled'}</p>
            </article>
            <article>
              <strong>Density</strong>
              <p>{density === 'compact' ? 'Compact tables and tight spacing' : 'Cozy spacing with broader rows'}</p>
            </article>
            <article>
              <strong>Command search</strong>
              <p>Command palette style search remains pinned in the header.</p>
            </article>
          </div>
        </section>

        <aside className="panel source-side">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Runtime</div>
              <h2>Platform status</h2>
            </div>
          </div>
          <div className="status-cards">
            <article>
              <strong>Tauri</strong>
              <span>Desktop shell</span>
            </article>
            <article>
              <strong>Rust</strong>
              <span>Page command layer</span>
            </article>
            <article>
              <strong>Vite</strong>
              <span>Frontend build</span>
            </article>
          </div>
        </aside>

        <section className="panel span-two source-band">
          <div className="module-bar">
            <div>
              <div className="module-kicker">Delivery</div>
              <h2>Next work</h2>
            </div>
          </div>
          <div className="coverage-strip compact-strip">
            <div>
              <strong>Headless browser</strong>
              <span>Swap the fetch command when pages require JS rendering.</span>
            </div>
            <div>
              <strong>Persistence</strong>
              <span>Add local storage for cases, feeds, and extracted page snapshots.</span>
            </div>
            <div>
              <strong>Page shells</strong>
              <span>Split these sections into dedicated routes when the workflow grows.</span>
            </div>
          </div>
        </section>
      </section>
    );
  }

  function renderActiveView() {
    switch (activeView) {
      case 'signals':
        return renderSignals();
      case 'sources':
        return renderSources();
      case 'extraction':
        return renderExtraction();
      case 'intelligence':
        return renderIntelligence();
      case 'settings':
        return renderSettings();
      case 'overview':
      default:
        return renderOverview();
    }
  }

  async function handleFetchPage() {
    setLoading(true);
    try {
      const result = await invoke<PageSnapshot>('fetch_page_snapshot', { target: targetUrl });
      setSnapshot(result);
    } catch (error) {
      setSnapshot({
        url: targetUrl,
        title: 'Fetch failed',
        description: String(error),
        headings: [],
        links: [],
        fetchedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`shell shell-${mode}`} data-density={density}>
      <aside className="sidebar">
        <div className="brand">PSS</div>
        <div className="sidebar-panel">
          <div className="sidebar-kicker">Analytic view</div>
          <nav className="nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${activeView === item.key ? 'active' : ''}`}
                onClick={() => setActiveView(item.key)}
              >
                <span className="nav-label">{item.label}</span>
                <span className="nav-kicker">{item.kicker}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar panel">
          <div>
            <div className="breadcrumbs">Sentinel / Analytic / {currentView.label}</div>
            <h1>{currentView.label}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search">
              <span>Search</span>
              <input placeholder="Command-K" />
            </label>
            <button className="toggle" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
              {mode === 'dark' ? 'Dark' : 'Light'}
            </button>
            <select value={density} onChange={(event) => setDensity(event.target.value as Density)}>
              <option value="compact">Compact</option>
              <option value="cozy">Cozy</option>
            </select>
          </div>
        </header>

        {renderActiveView()}
      </main>
    </div>
  );
}

export default AppShell;
