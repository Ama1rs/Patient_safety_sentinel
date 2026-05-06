---
name: Palantir Blueprint Design System
colors:
  surface: '#202B33'
  surface-dim: '#101417'
  surface-bright: '#36393e'
  surface-container-lowest: '#0b0e12'
  surface-container-low: '#191c20'
  surface-container: '#1d2024'
  surface-container-high: '#272a2e'
  surface-container-highest: '#323539'
  on-surface: '#e0e2e8'
  on-surface-variant: '#c0c7d1'
  inverse-surface: '#e0e2e8'
  inverse-on-surface: '#2d3135'
  outline: '#8a919a'
  outline-variant: '#40474f'
  surface-tint: '#95ccff'
  primary: '#95ccff'
  on-primary: '#003352'
  primary-container: '#106ba3'
  on-primary-container: '#d2e7ff'
  inverse-primary: '#006399'
  secondary: '#67dc9d'
  on-secondary: '#003920'
  secondary-container: '#26a46a'
  on-secondary-container: '#00311b'
  tertiary: '#ffb871'
  on-tertiary: '#4a2800'
  tertiary-container: '#965700'
  on-tertiary-container: '#ffdfc4'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#95ccff'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#004a75'
  secondary-fixed: '#84f9b7'
  secondary-fixed-dim: '#67dc9d'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#005231'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#ffb871'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6a3c00'
  background: '#182026'
  on-background: '#e0e2e8'
  surface-variant: '#323539'
  surface-elevated: '#293742'
  cobalt-blue: '#106BA3'
  forest-green: '#0F9960'
  cinnabar-red: '#DB3737'
  gold-amber: '#D99E06'
  border-subtle: '#30404D'
  text-primary: '#F5F8FA'
  text-muted: '#A7B6C2'
typography:
  h1:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  body-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  mono-data:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-gap: 2px
  pane-padding: 12px
  table-cell-padding-x: 8px
  table-cell-padding-y: 4px
  sidebar-width-collapsed: 48px
  sidebar-width-expanded: 240px
---

The "Palantir Blueprint" UI Prompt

Copy and paste the block below:

System Role: Act as a Senior Product Designer specializing in complex data systems and Palantir’s "Blueprint" design language.

Task: Generate a high-fidelity desktop UI for a [Insert App Name, e.g., Global Supply Chain Intelligence] dashboard.

Design Principles to Follow:





Information Density: Prioritize data over white space. The UI should feel "compact" and "utilitarian," allowing for maximum data visibility.



Color Palette: Use the "Blueprint Dark" theme. Background: #182026. Surface: #202B33. Accents: Cobalt Blue for primary actions, Forest Green for success/active, and Cinnabar Red for alerts.



Typography: Use a clean, highly legible sans-serif (like Inter or Gridnik). Use monospace for numerical data and timestamps.



Component Logic:





Navigation: A slim, collapsible left-hand sidebar with high-contrast icons.



Header: Breadcrumbs for deep nesting and a global search bar with a "command-K" feel.



Data Display: Use dense data tables with "striped" rows, micro-sparklines, and status tags.



Visuals: Integrated node-link graphs or geospatial map layers (Leaflet/Mapbox style) within modular, resizable panes.



Interaction: Include "Action Bars" at the top of data modules for filtering, exporting, and viewing history. Buttons should have subtle borders and clear hover states.

Layout Requirements:





A multi-pane "Analytic" view.



A central workspace containing a complex data table and a side-panel for "Object Metadata."



Subtle "Light/Dark" mode toggle and a "Density" setting (Compact vs. Cozy)