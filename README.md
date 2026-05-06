# Patient Safety Sentinel

A Tauri desktop shell for patient safety surveillance and page-based data extraction.

## What is included

- Blueprint-inspired analytic dashboard UI
- Signal table and object metadata pane
- Page fetch and extraction command in Rust
- Light and dark modes plus density switching

## Development

Install dependencies, then run the app in two layers:

- `npm install`
- `npm run tauri:dev`

## Data extraction

The first backend command fetches a page and extracts:

- title
- meta description
- headings
- links

This is the first pass for the page-data pipeline. It can later be swapped to a headless browser flow if the target pages need client-side rendering.
