import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

type TabKey = 'overview' | 'signals' | 'audit' | 'sources' | 'extraction' | 'intelligence' | 'settings';
type Mode = 'dark' | 'light';
type Density = 'compact' | 'cozy';
type SignalFilter = 'all' | 'active' | 'review' | 'escalated' | 'resolved';
type SignalStatus = 'Active' | 'Review' | 'Escalated' | 'Resolved';
type Sentiment = 'NEG' | 'NEU' | 'POS';
type SourceHealth = 'Healthy' | 'Degraded' | 'Paused';
type AuditTone = 'accent' | 'success' | 'warning' | 'danger';
type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

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
  sourceCode: string;
  source: string;
  type: string;
  status: SignalStatus;
  sentiment: Sentiment;
  confidence: number;
  trend: string;
  timestamp: string;
  summary: string;
  region: string;
};

type SourceRow = {
  name: string;
  channel: string;
  coverage: string;
  freshness: string;
  health: SourceHealth;
  enabled: boolean;
};

type AuditItem = {
  time: string;
  system: string;
  message: string;
  tone: AuditTone;
};

type ConfigDraft = {
  projectName: string;
  ownerGroup: string;
  latency: 'Real-time' | 'Daily Batch' | 'Weekly Batch';
  renderJs: boolean;
};

type StoredPreferences = {
  mode: Mode;
  density: Density;
  renderJs: boolean;
  targetUrl: string;
  configDraft: ConfigDraft;
  terms: string[];
};

type Notice = {
  tone: NoticeTone;
  message: string;
};

type TriageStatus = 'Investigating' | 'Reported' | 'Redacted';

type TriageEvent = {
  id: string;
  description: string;
  confidence: number;
  status: TriageStatus;
};

type EntityExtract = {
  name: string;
  meta: string;
  confidence: number;
  tone: 'accent' | 'warning' | 'danger';
};

type AlertTone = 'danger' | 'warning' | 'info';

type AlertCard = {
  title: string;
  description: string;
  delta: string;
  tag: string;
  tone: AlertTone;
};

type PulseTone = 'positive' | 'negative';

type PulseBar = {
  value: number;
  tone: PulseTone;
};

type PulseFeed = {
  label: string;
  bars: PulseBar[];
};

const viewMeta: Record<TabKey, { label: string; kicker: string }> = {
  overview: { label: 'Global View', kicker: 'Executive pulse' },
  signals: { label: 'Recent Alerts', kicker: 'Signal analysis' },
  audit: { label: 'Audit Logs', kicker: 'Compliance trail' },
  sources: { label: 'Sources', kicker: 'Feed inventory' },
  extraction: { label: 'Extraction', kicker: 'Page capture' },
  intelligence: { label: 'Intelligence', kicker: 'Graph and map' },
  settings: { label: 'Config', kicker: 'Project setup' },
};

const railTabs: { key: TabKey; icon: string; title: string }[] = [
  { key: 'overview', icon: 'dashboard', title: 'Dashboard' },
  { key: 'settings', icon: 'settings_input_component', title: 'Config' },
  { key: 'signals', icon: 'analytics', title: 'Signal analysis' },
  { key: 'audit', icon: 'security', title: 'Safety & compliance' },
  { key: 'sources', icon: 'rss_feed', title: 'Feed registry' },
  { key: 'extraction', icon: 'pageview', title: 'Extraction' },
  { key: 'intelligence', icon: 'hub', title: 'Intelligence' },
];

const initialSignals: SignalRow[] = [
  {
    id: 'SG-2041',
    sourceCode: 'TWTR',
    source: 'X / public post',
    type: 'Suicide risk',
    status: 'Escalated',
    sentiment: 'NEG',
    confidence: 94,
    trend: '+18%',
    timestamp: '2026-05-05 08:14',
    summary: 'Crisis phrasing with repeated medication references and direct self-harm language.',
    region: 'North America',
  },
  {
    id: 'SG-2033',
    sourceCode: 'REDD',
    source: 'Forum thread',
    type: 'ADR report',
    status: 'Review',
    sentiment: 'NEU',
    confidence: 81,
    trend: '+8%',
    timestamp: '2026-05-05 07:50',
    summary: 'Adverse reaction narrative with layered symptom descriptors and timing clues.',
    region: 'Europe',
  },
  {
    id: 'SG-2028',
    sourceCode: 'NYT',
    source: 'YouTube comments',
    type: 'Misinformation',
    status: 'Active',
    sentiment: 'POS',
    confidence: 67,
    trend: '+3%',
    timestamp: '2026-05-05 07:31',
    summary: 'Medication rumor cluster with weak evidence but high amplification potential.',
    region: 'APAC',
  },
  {
    id: 'SG-2022',
    sourceCode: 'FDA_DB',
    source: 'News / social',
    type: 'Community spread',
    status: 'Active',
    sentiment: 'NEG',
    confidence: 72,
    trend: '+11%',
    timestamp: '2026-05-05 06:58',
    summary: 'Discussion wave on a regional story with repeated mention of delayed care.',
    region: 'North America',
  },
  {
    id: 'SG-2018',
    sourceCode: 'INT_LOG',
    source: 'Reddit thread',
    type: 'Self-harm language',
    status: 'Review',
    sentiment: 'NEU',
    confidence: 88,
    trend: '+5%',
    timestamp: '2026-05-05 06:22',
    summary: 'Thread convergence around hopelessness wording and crisis escalation cues.',
    region: 'Global',
  },
];

const initialSources: SourceRow[] = [
  { name: 'Reddit API (r/Health)', channel: 'Streaming API', coverage: 'High', freshness: '30 sec', health: 'Healthy', enabled: true },
  { name: 'X (Twitter) Firehose', channel: 'Streaming API', coverage: 'High', freshness: '2 min', health: 'Paused', enabled: false },
  { name: 'Quora Medical', channel: 'RSS + scrape', coverage: 'Medium', freshness: '4 min', health: 'Healthy', enabled: true },
  { name: 'News watch', channel: 'Headlines', coverage: 'High', freshness: '1 min', health: 'Healthy', enabled: true },
  { name: 'Community boards', channel: 'Headless browser', coverage: 'Medium', freshness: 'Paused', health: 'Paused', enabled: false },
];

const initialAudit: AuditItem[] = [
  {
    time: '14:02:45.002Z',
    system: 'SYS_AUTH',
    message: 'Data acquisition initiated from source endpoint /v2/ingest.',
    tone: 'accent',
  },
  {
    time: '14:02:46.215Z',
    system: 'NLP_ENGINE',
    message: 'PII masking policy MASK_LVL_2 applied to incoming payload.',
    tone: 'warning',
  },
  {
    time: '14:02:48.102Z',
    system: 'DATA_VAULT',
    message: 'Record securely committed to immutable ledger. Hash: 0x8f2a9...',
    tone: 'success',
  },
];

const defaultConfig: ConfigDraft = {
  projectName: 'Paxlovid Adverse Events Phase 2',
  ownerGroup: 'Pharmacovigilance Team Alpha',
  latency: 'Daily Batch',
  renderJs: true,
};

const initialTerms = ['Paxlovid', 'Nirmatrelvir', 'Ritonavir', 'Fatigue', 'Rebound', 'Dysgeusia'];

const confidenceBars = [0.3, 0.54, 0.8, 0.6, 0.45, 0.9, 0.35, 0.7, 0.5, 0.78];

const observatories = [
  { name: 'PROJ-Alpha-7', status: 'Active', volume: 12402, latency: 'Real-time' },
  { name: 'PROJ-Beta-2', status: 'Critical', volume: 8931, latency: '45ms' },
  { name: 'PROJ-Gamma-9', status: 'Warning', volume: 3120, latency: '1.2s' },
  { name: 'PROJ-Delta-1', status: 'Active', volume: 1405, latency: 'Real-time' },
  { name: 'PROJ-Epsilon-4', status: 'Paused', volume: 0, latency: 'N/A' },
  { name: 'PROJ-Zeta-8', status: 'Active', volume: 892, latency: 'Real-time' },
];

const criticalAlerts: AlertCard[] = [
  {
    title: 'SYS_ERR_092',
    description: 'Spike in severe palpitations. Mentions linked to node PROJ-Beta-2.',
    delta: 'T+02m',
    tag: 'SRC: REDDIT',
    tone: 'danger',
  },
  {
    title: 'NLP_TRG_114',
    description: 'Cluster formation: batch recall intent detected in EU zone.',
    delta: 'T+14m',
    tag: 'CONF: 84%',
    tone: 'warning',
  },
  {
    title: 'LAT_WARN_001',
    description: 'Ingestion latency exceeding 1.2s threshold on PROJ-Gamma-9.',
    delta: 'T+45m',
    tag: 'VOL: 2.4K',
    tone: 'info',
  },
];

const triageEvents: TriageEvent[] = [
  {
    id: 'AE-9921',
    description: 'Potential off-label usage indicator detected in forum post.',
    confidence: 0.94,
    status: 'Investigating',
  },
  {
    id: 'AE-9920',
    description: 'Unverified formulation claim across three nodes.',
    confidence: 0.82,
    status: 'Reported',
  },
  {
    id: 'AE-9918',
    description: 'PII detected in unstructured feedback form.',
    confidence: 0.99,
    status: 'Redacted',
  },
];

const entityExtracts: EntityExtract[] = [
  { name: 'Lexapro', meta: 'Pharmacological / Drug', confidence: 0.98, tone: 'warning' },
  { name: 'Mercy General Hospital', meta: 'Organization / Facility', confidence: 0.91, tone: 'accent' },
  { name: 'John Doe', meta: 'PII redacted', confidence: 0, tone: 'danger' },
];

const sentimentPulse = [0.2, 0.3, 0.25, 0.4, 0.32, 0.5, 0.72, 0.6, 0.9, 0.42, 0.55, 0.36];

const pulseFeeds: PulseFeed[] = [
  {
    label: 'X (Twitter)',
    bars: [
      { value: 0.2, tone: 'positive' },
      { value: 0.4, tone: 'positive' },
      { value: 0.3, tone: 'positive' },
      { value: 0.7, tone: 'negative' },
      { value: 0.9, tone: 'negative' },
      { value: 1, tone: 'negative' },
      { value: 0.6, tone: 'negative' },
      { value: 0.2, tone: 'positive' },
      { value: 0.3, tone: 'positive' },
      { value: 0.5, tone: 'positive' },
      { value: 0.4, tone: 'positive' },
      { value: 0.2, tone: 'positive' },
    ],
  },
  {
    label: 'Reddit',
    bars: [
      { value: 0.1, tone: 'positive' },
      { value: 0.2, tone: 'positive' },
      { value: 0.15, tone: 'positive' },
      { value: 0.25, tone: 'positive' },
      { value: 0.4, tone: 'negative' },
      { value: 0.8, tone: 'negative' },
      { value: 0.5, tone: 'negative' },
      { value: 0.3, tone: 'positive' },
      { value: 0.4, tone: 'positive' },
      { value: 0.35, tone: 'positive' },
      { value: 0.2, tone: 'positive' },
      { value: 0.1, tone: 'positive' },
    ],
  },
  {
    label: 'Medical Forums',
    bars: [
      { value: 0.5, tone: 'positive' },
      { value: 0.45, tone: 'positive' },
      { value: 0.6, tone: 'positive' },
      { value: 0.55, tone: 'positive' },
      { value: 0.7, tone: 'positive' },
      { value: 0.65, tone: 'positive' },
      { value: 0.3, tone: 'negative' },
      { value: 0.2, tone: 'negative' },
      { value: 0.5, tone: 'positive' },
      { value: 0.6, tone: 'positive' },
      { value: 0.75, tone: 'positive' },
      { value: 0.8, tone: 'positive' },
    ],
  },
];

const graphNodes = [
  { label: 'Signal cluster', top: '18%', left: '18%', tone: 'accent' },
  { label: 'Risk vector', top: '40%', left: '48%', tone: 'danger' },
  { label: 'Source bridge', top: '58%', left: '22%', tone: 'success' },
  { label: 'Escalation', top: '28%', left: '72%', tone: 'warning' },
  { label: 'Review desk', top: '72%', left: '66%', tone: 'accent' },
] as const;

const mapPins = [
  { label: 'NA-EAST', region: 'North America', value: 'Vol: 4.2k', top: '52%', left: '36%', tone: 'risk' },
  { label: 'EU-CENTRAL', region: 'Europe', value: 'Vol: 3.1k', top: '46%', left: '54%', tone: 'warning' },
  { label: 'APAC', region: 'APAC', value: 'Vol: 1.1k', top: '62%', left: '64%', tone: 'nominal' },
];

type StoredJson = Partial<StoredPreferences> & {
  signalFilter?: SignalFilter;
  sortDescending?: boolean;
  activeTab?: TabKey;
};

function readStoredPreferences(): StoredJson {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem('pss.portal.preferences');
    return raw ? (JSON.parse(raw) as StoredJson) : {};
  } catch {
    return {};
  }
}

function writeStoredPreferences(value: StoredJson) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem('pss.portal.preferences', JSON.stringify(value));
  } catch {
    // Ignore storage failures in the desktop webview.
  }
}

function timestampNow() {
  return new Date().toISOString().replace('T', ' ').replace('Z', 'Z');
}

function formatSignalTime(timestamp: string) {
  const parts = timestamp.split(' ');
  return parts.length > 1 ? parts[1] : timestamp;
}

function safeText(value: unknown) {
  return value == null ? '' : String(value);
}

function escapeCsv(value: unknown) {
  const text = safeText(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','));
  return [headers.join(','), ...body].join('\n');
}

function signalFilterLabel(filter: SignalFilter) {
  switch (filter) {
    case 'active':
      return 'Active';
    case 'review':
      return 'Review';
    case 'escalated':
      return 'Escalated';
    case 'resolved':
      return 'Resolved';
    case 'all':
    default:
      return 'All';
  }
}

function statusTone(status: SignalStatus) {
  switch (status) {
    case 'Escalated':
      return 'danger';
    case 'Review':
      return 'warning';
    case 'Resolved':
      return 'success';
    case 'Active':
    default:
      return 'active';
  }
}

function healthTone(health: SourceHealth) {
  switch (health) {
    case 'Healthy':
      return 'active';
    case 'Degraded':
      return 'warning';
    case 'Paused':
    default:
      return 'paused';
  }
}

function sourceIcon(name: string) {
  if (name.startsWith('Reddit')) {
    return 'forum';
  }
  if (name.startsWith('X (Twitter)')) {
    return 'alternate_email';
  }
  if (name.startsWith('Quora')) {
    return 'quiz';
  }
  if (name.startsWith('News')) {
    return 'newspaper';
  }
  return 'dns';
}

function PSSPortal() {
  const preferences = readStoredPreferences();
  const [activeTab, setActiveTab] = useState<TabKey>(preferences.activeTab ?? 'overview');
  const [mode, setMode] = useState<Mode>(preferences.mode ?? 'dark');
  const [density, setDensity] = useState<Density>(preferences.density ?? 'compact');
  const [searchQuery, setSearchQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>(preferences.signalFilter ?? 'all');
  const [sortDescending, setSortDescending] = useState(preferences.sortDescending ?? true);
  const [signals, setSignals] = useState<SignalRow[]>(initialSignals);
  const [sources, setSources] = useState<SourceRow[]>(initialSources);
  const [selectedSignalId, setSelectedSignalId] = useState(initialSignals[0].id);
  const [selectedSourceName, setSelectedSourceName] = useState(initialSources[0].name);
  const [auditEntries, setAuditEntries] = useState<AuditItem[]>(initialAudit);
  const [terms, setTerms] = useState<string[]>(preferences.terms ?? initialTerms);
  const [configDraft, setConfigDraft] = useState<ConfigDraft>(preferences.configDraft ?? defaultConfig);
  const [targetUrl, setTargetUrl] = useState(preferences.targetUrl ?? 'https://example.com');
  const [renderJs, setRenderJs] = useState(preferences.renderJs ?? true);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);
  const [showSignalJson, setShowSignalJson] = useState(false);
  const [selectedAuditEventId, setSelectedAuditEventId] = useState(triageEvents[0].id);
  const [selectedRegionLabel, setSelectedRegionLabel] = useState(mapPins[0].region);
  const [selectedGraphNode, setSelectedGraphNode] = useState(graphNodes[0].label);
  const [traceZoom, setTraceZoom] = useState(1);
  const [auditThresholds, setAuditThresholds] = useState({ autoFlag: 0.85, piiRedaction: 0.98 });
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    writeStoredPreferences({
      mode,
      density,
      renderJs,
      targetUrl,
      configDraft,
      terms,
      signalFilter,
      sortDescending,
      activeTab,
    });
  }, [activeTab, configDraft, density, mode, renderJs, searchQuery, signalFilter, sortDescending, targetUrl, terms]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredSignals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = signals
      .filter((row) => signalFilter === 'all' || row.status.toLowerCase() === signalFilter)
      .filter((row) => {
        if (!query) {
          return true;
        }

        return [row.id, row.sourceCode, row.source, row.type, row.status, row.sentiment, row.summary, row.region, row.timestamp].some((value) =>
          value.toLowerCase().includes(query),
        );
      })
      .slice()
      .sort((left, right) => {
        const confidenceOrder = sortDescending ? right.confidence - left.confidence : left.confidence - right.confidence;
        if (confidenceOrder !== 0) {
          return confidenceOrder;
        }
        return right.timestamp.localeCompare(left.timestamp);
      });

    return rows;
  }, [searchQuery, signalFilter, signals, sortDescending]);

  const filteredSources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sources.filter((row) => {
      if (!query) {
        return true;
      }

      return [row.name, row.channel, row.coverage, row.freshness, row.health, row.enabled ? 'enabled' : 'paused']
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [searchQuery, sources]);

  const filteredAudit = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return auditEntries.filter((entry) => {
      if (!query) {
        return true;
      }

      return [entry.time, entry.system, entry.message].some((value) => value.toLowerCase().includes(query));
    });
  }, [auditEntries, searchQuery]);

  const selectedSignal = useMemo(() => {
    return signals.find((row) => row.id === selectedSignalId) ?? signals[0];
  }, [selectedSignalId, signals]);

  const selectedSource = useMemo(() => {
    return sources.find((row) => row.name === selectedSourceName) ?? sources[0];
  }, [selectedSourceName, sources]);

  const statusSummary = useMemo(
    () => [
      { label: 'Signals', value: signals.length.toString(), note: `${signals.filter((row) => row.status === 'Escalated').length} escalated` },
      { label: 'Feeds', value: sources.filter((row) => row.enabled).length.toString(), note: `${sources.filter((row) => row.health === 'Healthy').length} healthy` },
      { label: 'Audit', value: auditEntries.length.toString(), note: 'Local activity trail' },
      { label: 'Render', value: renderJs ? 'On' : 'Off', note: renderJs ? 'Headless browser path' : 'Static HTML only' },
    ],
    [auditEntries.length, renderJs, signals, sources],
  );

  const currentView = viewMeta[activeTab] ?? viewMeta.overview;
  const signalRowTemplate = '1.1fr 1.6fr 1.3fr 1fr 1fr 0.9fr 1fr';
  const sourceRowTemplate = '1.2fr 1.4fr 1fr 1fr 1fr';

  function pushAudit(system: string, message: string, tone: AuditTone = 'accent') {
    setAuditEntries((entries) => [
      { time: timestampNow(), system, message, tone },
      ...entries,
    ].slice(0, 16));
  }

  function notify(message: string, tone: NoticeTone = 'info') {
    setNotice({ message, tone });
  }

  function cycleSignalFilter() {
    setSignalFilter((current) => {
      switch (current) {
        case 'all':
          return 'review';
        case 'review':
          return 'escalated';
        case 'escalated':
          return 'active';
        case 'active':
          return 'resolved';
        case 'resolved':
        default:
          return 'all';
      }
    });
  }

  function toggleSortSignals() {
    setSortDescending((current) => !current);
  }

  function downloadCurrentCsv() {
    const normalizedView = activeTab === 'overview' ? 'signals' : activeTab;

    if (normalizedView === 'signals') {
      const csv = buildCsv(filteredSignals.map((row) => ({
        id: row.id,
        sourceCode: row.sourceCode,
        source: row.source,
        type: row.type,
        status: row.status,
        sentiment: row.sentiment,
        confidence: row.confidence,
        trend: row.trend,
        timestamp: row.timestamp,
        summary: row.summary,
        region: row.region,
      })));
      downloadText(`signals-${timestampNow().replace(/[: ]/g, '-')}.csv`, csv, 'text/csv');
      notify('Signals exported as CSV.', 'success');
      return;
    }

    if (normalizedView === 'sources') {
      const csv = buildCsv(filteredSources.map((row) => ({
        name: row.name,
        channel: row.channel,
        coverage: row.coverage,
        freshness: row.freshness,
        health: row.health,
        enabled: row.enabled,
      })));
      downloadText(`sources-${timestampNow().replace(/[: ]/g, '-')}.csv`, csv, 'text/csv');
      notify('Sources exported as CSV.', 'success');
      return;
    }

    if (normalizedView === 'audit') {
      const csv = buildCsv(filteredAudit.map((row) => ({
        time: row.time,
        system: row.system,
        message: row.message,
        tone: row.tone,
      })));
      downloadText(`audit-${timestampNow().replace(/[: ]/g, '-')}.csv`, csv, 'text/csv');
      notify('Audit trail exported as CSV.', 'success');
      return;
    }

    if (normalizedView === 'extraction' && snapshot) {
      const csv = buildCsv([
        { key: 'url', value: snapshot.url },
        { key: 'title', value: snapshot.title },
        { key: 'description', value: snapshot.description },
        { key: 'headings', value: snapshot.headings.join(' | ') },
        { key: 'links', value: snapshot.links.map((link) => `${link.text} -> ${link.href}`).join(' | ') },
      ]);
      downloadText(`snapshot-${timestampNow().replace(/[: ]/g, '-')}.csv`, csv, 'text/csv');
      notify('Snapshot exported as CSV.', 'success');
      return;
    }

    const csv = buildCsv([
      { label: 'Signals', value: signals.length },
      { label: 'Feeds', value: sources.length },
      { label: 'Audit entries', value: auditEntries.length },
    ]);
    downloadText(`summary-${timestampNow().replace(/[: ]/g, '-')}.csv`, csv, 'text/csv');
    notify('Summary exported as CSV.', 'success');
  }

  function deploySignal() {
    const description = window.prompt('Describe the signal to deploy', selectedSignal?.summary ?? '');
    if (!description?.trim()) {
      return;
    }

    const newSignal: SignalRow = {
      id: `SG-${Math.floor(Date.now() % 10000).toString().padStart(4, '0')}`,
      sourceCode: 'MAN',
      source: `Manual / ${searchQuery.trim() || 'operator'}`,
      type: 'Manual escalation',
      status: 'Active',
      sentiment: 'NEU',
      confidence: 86,
      trend: '+1%',
      timestamp: timestampNow().slice(0, 16),
      summary: description.trim(),
      region: 'Global',
    };

    setSignals((rows) => [newSignal, ...rows]);
    setSelectedSignalId(newSignal.id);
    setActiveTab('signals');
    pushAudit('SIGNALS', `Created ${newSignal.id}: ${description.trim()}`, 'success');
    notify(`Signal ${newSignal.id} deployed.`, 'success');
  }

  function updateSelectedSignalStatus(status: SignalStatus) {
    if (!selectedSignal) {
      return;
    }

    setSignals((rows) =>
      rows.map((row) => (row.id === selectedSignal.id ? { ...row, status } : row)),
    );
    pushAudit('CASE_MGMT', `Updated ${selectedSignal.id} to ${status}.`, status === 'Escalated' ? 'danger' : 'accent');
    notify(`${selectedSignal.id} marked ${status}.`, status === 'Escalated' ? 'warning' : 'success');
  }

  async function copyToClipboard(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(successMessage, 'success');
    } catch {
      notify('Clipboard access was blocked.', 'warning');
    }
  }

  function shareSelectedSignal() {
    if (!selectedSignal) {
      return;
    }

    copyToClipboard(
      `${selectedSignal.id}\n${selectedSignal.type}\n${selectedSignal.source}\n${selectedSignal.summary}`,
      `${selectedSignal.id} copied to clipboard.`,
    );
  }

  function exportSelectedSignalJson() {
    if (!selectedSignal) {
      return;
    }

    downloadText(
      `${selectedSignal.id.toLowerCase()}.json`,
      JSON.stringify(selectedSignal, null, 2),
      'application/json',
    );
    pushAudit('EXPORT', `Exported ${selectedSignal.id} as JSON.`, 'success');
    notify(`${selectedSignal.id} exported as JSON.`, 'success');
  }

  function toggleSourceFeed(name: string) {
    setSources((rows) =>
      rows.map((row) => {
        if (row.name !== name) {
          return row;
        }

        const enabled = !row.enabled;
        return {
          ...row,
          enabled,
          health: enabled ? 'Healthy' : 'Paused',
          freshness: enabled ? 'Just now' : 'Paused',
        };
      }),
    );

    const source = sources.find((row) => row.name === name);
    pushAudit('SOURCES', `${name} toggled ${source?.enabled ? 'off' : 'on'}.`, source?.enabled ? 'warning' : 'success');
    notify(`${name} updated.`, 'success');
  }

  function addSourceFeed() {
    const name = window.prompt('Feed name', 'Clinical forum stream');
    if (!name?.trim()) {
      return;
    }

    const row: SourceRow = {
      name: name.trim(),
      channel: 'Manual ingest',
      coverage: 'Medium',
      freshness: 'Just now',
      health: 'Healthy',
      enabled: true,
    };

    setSources((rows) => [row, ...rows]);
    setSelectedSourceName(row.name);
    pushAudit('SOURCES', `Added feed ${row.name}.`, 'success');
    notify(`Feed ${row.name} added.`, 'success');
  }

  function testSelectedSource() {
    if (!selectedSource) {
      return;
    }

    setSources((rows) =>
      rows.map((row) =>
        row.name === selectedSource.name ? { ...row, freshness: 'Just now', health: 'Healthy', enabled: true } : row,
      ),
    );
    pushAudit('SOURCES', `Tested ${selectedSource.name}.`, 'success');
    notify(`${selectedSource.name} test passed.`, 'success');
  }

  function pauseSelectedSource() {
    if (!selectedSource) {
      return;
    }

    setSources((rows) =>
      rows.map((row) =>
        row.name === selectedSource.name ? { ...row, freshness: 'Paused', health: 'Paused', enabled: false } : row,
      ),
    );
    pushAudit('SOURCES', `Paused ${selectedSource.name}.`, 'warning');
    notify(`${selectedSource.name} paused.`, 'warning');
  }

  async function fetchPageSnapshot() {
    if (!targetUrl.trim()) {
      notify('Enter a URL before fetching.', 'warning');
      return;
    }

    setLoadingSnapshot(true);
    try {
      const result = await invoke<PageSnapshot>('fetch_page_snapshot', {
        request: {
          target: targetUrl.trim(),
          renderJs,
        },
      });
      setSnapshot(result);
      pushAudit('EXTRACTION', `Fetched ${result.title || result.url} using ${renderJs ? 'headless render' : 'static HTML'}.`, 'success');
      notify(`Fetched ${result.title || result.url}.`, 'success');
      setActiveTab('extraction');
    } catch (error) {
      const message = String(error);
      setSnapshot({
        url: targetUrl.trim(),
        title: 'Fetch failed',
        description: message,
        headings: [],
        links: [],
        fetchedAt: timestampNow(),
      });
      pushAudit('EXTRACTION', `Fetch failed for ${targetUrl.trim()}: ${message}`, 'danger');
      notify('Page fetch failed.', 'danger');
    } finally {
      setLoadingSnapshot(false);
    }
  }

  function copySnapshotJson() {
    if (!snapshot) {
      notify('No snapshot to copy yet.', 'warning');
      return;
    }

    copyToClipboard(JSON.stringify(snapshot, null, 2), 'Snapshot copied to clipboard.');
  }

  function exportSnapshotJson() {
    if (!snapshot) {
      notify('No snapshot to export yet.', 'warning');
      return;
    }

    downloadText(
      `snapshot-${timestampNow().replace(/[: ]/g, '-')}.json`,
      JSON.stringify(snapshot, null, 2),
      'application/json',
    );
    pushAudit('EXPORT', 'Snapshot exported as JSON.', 'success');
    notify('Snapshot exported as JSON.', 'success');
  }

  function addTermChip(group: 'drugs' | 'symptoms') {
    const term = window.prompt('Add a keyword', 'Clinical term');
    if (!term?.trim()) {
      return;
    }

    setTerms((current) => {
      if (current.includes(term.trim())) {
        return current;
      }

      if (group === 'drugs') {
        const drugCount = 3;
        return [...current.slice(0, drugCount), term.trim(), ...current.slice(drugCount)];
      }

      return [...current, term.trim()];
    });
    pushAudit('CONFIG', `Added keyword ${term.trim()}.`, 'accent');
    notify(`Keyword ${term.trim()} added.`, 'success');
  }

  function removeTermChip(term: string) {
    setTerms((current) => current.filter((item) => item !== term));
    pushAudit('CONFIG', `Removed keyword ${term}.`, 'warning');
    notify(`Removed ${term}.`, 'warning');
  }

  function discardDraft() {
    setConfigDraft(defaultConfig);
    setTerms(initialTerms);
    setRenderJs(true);
    setTargetUrl('https://example.com');
    pushAudit('CONFIG', 'Draft reset to defaults.', 'warning');
    notify('Draft reset to defaults.', 'warning');
  }

  function saveDraft() {
    pushAudit('CONFIG', 'Draft saved locally.', 'success');
    notify('Draft saved locally.', 'success');
  }

  function initializeEngine() {
    pushAudit('ENGINE', 'Initialised ingestion engine.', 'success');
    setActiveTab('overview');
    notify('Ingestion engine initialised.', 'success');
  }

  function copySignalContext() {
    if (!selectedSignal) {
      return;
    }

    copyToClipboard(
      `${selectedSignal.id}\n${selectedSignal.summary}\n${selectedSignal.source}\n${selectedSignal.region}`,
      'Signal context copied.',
    );
  }

  function drillIntoRegion(region: string) {
    setSelectedRegionLabel(region);
    setSearchQuery(region);
    setSignalFilter('all');
    setActiveTab('signals');
    notify(`Focused ${region} signals.`, 'info');
  }

  function openCriticalAlert(alertTitle: string) {
    setSearchQuery(alertTitle);
    setSignalFilter('escalated');
    setActiveTab('signals');
    notify(`Focused alerts for ${alertTitle}.`, 'info');
  }

  function selectTriageEvent(eventId: string) {
    setSelectedAuditEventId(eventId);
    const event = triageEvents.find((entry) => entry.id === eventId);
    if (event) {
      notify(`Selected ${event.id}.`, 'info');
    }
  }

  function updateAuditThreshold(name: 'autoFlag' | 'piiRedaction', value: number) {
    setAuditThresholds((current) => ({ ...current, [name]: value }));
  }

  function zoomTraceGraph(direction: 'in' | 'out' | 'center') {
    setTraceZoom((current) => {
      if (direction === 'center') {
        return 1;
      }

      const next = direction === 'in' ? current + 0.1 : current - 0.1;
      return Math.max(0.7, Math.min(1.4, Number(next.toFixed(2))));
    });
  }

  function selectTraceNode(nodeLabel: string) {
    setSelectedGraphNode(nodeLabel);
    notify(`Focused ${nodeLabel}.`, 'info');
  }

  function openSnapshotLink(href: string, text: string) {
    if (!href) {
      notify(`No URL found for ${text}.`, 'warning');
      return;
    }

    setTargetUrl(href);
    setActiveTab('extraction');
    notify(`Loaded ${text} into extraction.`, 'success');
  }

  function focusEntity(entityName: string) {
    setSearchQuery(entityName);
    setActiveTab('signals');
    notify(`Filtered signals for ${entityName}.`, 'info');
  }

  function importDictionary() {
    const rawTerms = window.prompt('Paste newline-separated dictionary terms', 'Medication\nSymptom\nFacility');
    if (!rawTerms?.trim()) {
      return;
    }

    const importedTerms = rawTerms
      .split(/\r?\n/)
      .map((term) => term.trim())
      .filter(Boolean);

    setTerms((current) => Array.from(new Set([...current, ...importedTerms])));
    pushAudit('CONFIG', `Imported ${importedTerms.length} dictionary terms.`, 'success');
    notify(`Imported ${importedTerms.length} terms.`, 'success');
  }

  function refreshSelectedSource() {
    if (!selectedSource) {
      return;
    }

    setSources((rows) =>
      rows.map((row) =>
        row.name === selectedSource.name ? { ...row, freshness: 'Just now', health: 'Healthy', enabled: true } : row,
      ),
    );
    pushAudit('SOURCES', `Refreshed ${selectedSource.name}.`, 'success');
    notify(`${selectedSource.name} refreshed.`, 'success');
  }

  function renderOverview() {
    const globalPulse = 8492;
    const globalDelta = '+12%';

    return (
      <section className="overview-shell">
        <div className="overview-top">
          <section className="panel metric-card">
            <div className="metric-header">
              <span className="panel-kicker">Global safety signal pulse</span>
              <span className="metric-icon"><span className="material-symbols-outlined">monitoring</span></span>
            </div>
            <div className="metric-figure">
              <span className="metric-value">{globalPulse.toLocaleString()}</span>
              <span className="metric-change">{globalDelta}</span>
            </div>
            <div className="metric-sub">Last updated: 14ms ago · Focus: {selectedRegionLabel}</div>
          </section>

          <section className="panel pulse-card">
            <div className="pulse-header">
              <span className="panel-kicker">Real-time feed pulse (Hz)</span>
              <div className="pulse-legend">
                <span><span className="legend-dot positive" /> Positive</span>
                <span><span className="legend-dot negative" /> Negative</span>
              </div>
            </div>
            <div className="pulse-feeds">
              {pulseFeeds.map((feed) => (
                <div key={feed.label} className="pulse-feed">
                  <span className="pulse-label">{feed.label}</span>
                  <div className="pulse-chart">
                    {feed.bars.map((bar, index) => (
                      <span
                        key={`${feed.label}-${index}`}
                        className={`pulse-bar ${bar.tone}`}
                        style={{ height: `${bar.value * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="overview-bottom">
          <section className="panel observatory-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Active observatories</span>
                <h2>Node health</h2>
              </div>
              <div className="panel-actions">
                <button className="icon-button" onClick={cycleSignalFilter} title="Filter"><span className="material-symbols-outlined">filter_alt</span></button>
                <button className="icon-button" onClick={toggleSortSignals} title="Sort"><span className="material-symbols-outlined">more_horiz</span></button>
              </div>
            </div>
            <div className="table observatory-table">
              <div className="table-row table-head">
                <span>Node ID</span>
                <span>Status</span>
                <span>Vol (24h)</span>
                <span>Latency</span>
              </div>
              {observatories.map((row) => (
                <div key={row.name} className="table-row">
                  <span className="mono">{row.name}</span>
                  <span className={`tag tag-${row.status.toLowerCase()}`}>{row.status}</span>
                  <span className="mono">{row.volume.toLocaleString()}</span>
                  <span>{row.latency}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel map-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Global sentiment topography</span>
                <h2>Risk map</h2>
              </div>
              <div className="map-legend">
                <span><span className="legend-dot negative" /> Risk</span>
                <span><span className="legend-dot positive" /> Nominal</span>
              </div>
            </div>
            <div className="world-map map-world">
              {mapPins.map((pin) => {
                const toneClass = pin.tone === 'risk' ? 'marker-danger' : pin.tone === 'warning' ? 'marker-warning' : 'marker-active';
                return (
                  <button
                    key={pin.label}
                    type="button"
                    className={`map-marker ${toneClass} ${selectedRegionLabel === pin.region ? 'selected' : ''}`}
                    style={{ top: pin.top, left: pin.left }}
                    onClick={() => drillIntoRegion(pin.region)}
                    title={`Focus ${pin.region}`}
                  >
                    <span>{pin.label}</span>
                    <small>{pin.value}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel alerts-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Critical alerts</span>
                <h2>Escalations</h2>
              </div>
              <span className="tag tag-danger">{criticalAlerts.length} new</span>
            </div>
            <div className="alert-stack">
              {criticalAlerts.map((alert) => (
                <button key={alert.title} type="button" className={`alert-card alert-${alert.tone}`} onClick={() => openCriticalAlert(alert.title)}>
                  <div className="alert-title">{alert.title}</div>
                  <p>{alert.description}</p>
                  <div className="alert-footer">
                    <span>{alert.delta}</span>
                    <span>{alert.tag}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderSignals() {
    const selectedTime = selectedSignal?.timestamp ? formatSignalTime(selectedSignal.timestamp) : '14:02:44.12';
    return (
      <section className="signals-shell">
        <section className="panel signals-list">
          <div className="panel-header compact">
            <div className="panel-title"><span className="material-symbols-outlined">list_alt</span> Incoming Signals</div>
            <div className="panel-actions">
              <button className="icon-button" onClick={cycleSignalFilter} title="Filter"><span className="material-symbols-outlined">filter_list</span></button>
              <button className="icon-button" onClick={toggleSortSignals} title="Sort"><span className="material-symbols-outlined">sort</span></button>
            </div>
          </div>
          <div className="signal-table-head">
            <span>Source</span>
            <span>Timestamp</span>
            <span>Sent</span>
            <span>Conf</span>
          </div>
          <div className="signal-table-body">
            {filteredSignals.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`signal-row ${selectedSignal?.id === row.id ? 'selected' : ''}`}
                onClick={() => setSelectedSignalId(row.id)}
              >
                <span className="signal-source">
                  <span className={`signal-dot sentiment-${row.sentiment.toLowerCase()}`} />
                  {row.sourceCode}
                </span>
                <span className="signal-time mono">{formatSignalTime(row.timestamp)}</span>
                <span className={`sentiment-tag sentiment-${row.sentiment.toLowerCase()}`}>{row.sentiment}</span>
                <span className="signal-conf mono">{row.confidence.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel signal-context">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Signal context</span>
              <h2>{selectedSignal?.id ?? 'SIG-99482'}</h2>
            </div>
            <div className="panel-actions">
              <button className="icon-button" onClick={shareSelectedSignal} title="Share"><span className="material-symbols-outlined">share</span></button>
              <button className="icon-button danger" onClick={() => updateSelectedSignalStatus('Escalated')} title="Escalate"><span className="material-symbols-outlined">warning</span></button>
            </div>
          </div>
          <div className="payload signal-payload">
            <div className="payload-label">Raw content payload</div>
            <p className="payload-text">
              [{selectedTime}] Alert generated via API endpoint /v2/ingest. Subject reported adverse reaction to
              <span className="pill pill-warning"> Lexapro </span> dosage. Patient
              <span className="pill pill-muted"> John Doe </span> (DOB:
              <span className="pill pill-muted"> 05/12/1984 </span>) experienced severe migraines and localized numbness
              within 24 hours of administration at
              <span className="pill pill-accent"> Mercy General Hospital </span>. Recommended protocol initiation for
              further investigation.
            </p>
            <button className="link-button" onClick={() => setShowSignalJson((current) => !current)}>
              {showSignalJson ? 'Hide Source JSON' : 'View Source JSON'}
            </button>
          </div>
          {showSignalJson && selectedSignal ? (
            <div className="payload" style={{ marginTop: 10 }}>
              <div className="payload-label">Source JSON</div>
              <pre className="json-block">{JSON.stringify(selectedSignal, null, 2)}</pre>
            </div>
          ) : null}
          <div className="signal-detail-grid">
            <div className="panel-subcard">
              <div className="subcard-header">
                <span className="panel-kicker">Entities extracted</span>
                <span className="mono">{entityExtracts.length} Identified</span>
              </div>
              <div className="entity-cards">
                {entityExtracts.map((entity) => (
                  <button key={entity.name} type="button" className="entity-card" onClick={() => focusEntity(entity.name)}>
                    <div>
                      <div className="entity-name">{entity.name}</div>
                      <div className="entity-meta">{entity.meta}</div>
                    </div>
                    <div className="entity-metric">
                      {entity.confidence > 0 ? (
                        <>
                          <div className="entity-bar">
                            <span style={{ width: `${entity.confidence * 100}%` }} />
                          </div>
                          <span className={`entity-score entity-${entity.tone}`}>{entity.confidence.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="entity-score entity-danger">PII</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="panel-subcard">
              <div className="subcard-header">
                <span className="panel-kicker">Sentiment pulse</span>
                <span className="pulse-status">Highly negative</span>
              </div>
              <div className="sentiment-bars">
                {sentimentPulse.map((value, index) => (
                  <span
                    key={index}
                    className={`sentiment-bar ${index === 8 ? 'active' : ''}`}
                    style={{ height: `${value * 100}%` }}
                  />
                ))}
              </div>
              <div className="pulse-footer">
                <span>T-60m</span>
                <span>{selectedSignal?.id ?? 'SIG-99482'}</span>
                <span>Now</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel signal-meta">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Metadata Properties</span>
              <h2>Object</h2>
            </div>
          </div>
          <div className="meta-list">
            <div className="meta-row"><span>Object ID</span><span className="mono">{selectedSignal?.id ?? 'SIG-99482'}</span></div>
            <div className="meta-row"><span>Time ingested (UTC)</span><span className="mono">2023-10-27T14:02:44Z</span></div>
            <div className="meta-row"><span>Source system</span><span>{selectedSignal?.source ?? 'Twitter Firehose (v2)'}</span></div>
            <div className="meta-row"><span>Processing node</span><span>NLP-us-east-1a-xlarge</span></div>
            <div className="meta-row"><span>Pipeline status</span><span className={`tag tag-${statusTone(selectedSignal?.status ?? 'Active')}`}>{selectedSignal?.status ?? 'Processed'}</span></div>
            <div className="meta-row"><span>Analyst assigned</span><span>System (Auto-flagged)</span></div>
          </div>
          <div className="button-stack">
            <button className="ghost" onClick={() => setActiveTab('audit')}>View Audit Trail</button>
            <button className="ghost" onClick={exportSelectedSignalJson}>Export JSON Object</button>
          </div>
        </section>
      </section>
    );
  }

  function renderAudit() {
    const autoFlagValue = auditThresholds.autoFlag;
    const piiValue = auditThresholds.piiRedaction;
    const auditLogEntries = filteredAudit.slice(0, 3);
    const selectedTriageEvent = triageEvents.find((event) => event.id === selectedAuditEventId) ?? triageEvents[0];

    return (
      <section className="audit-shell">
        <div className="audit-left">
          <section className="panel triage-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Adverse event triage</span>
                <h2>Incoming signals</h2>
              </div>
              <div className="panel-actions">
                <button className="icon-button" onClick={cycleSignalFilter} title="Filter"><span className="material-symbols-outlined">filter_list</span></button>
                <button className="icon-button" onClick={toggleSortSignals} title="Sort"><span className="material-symbols-outlined">sort</span></button>
              </div>
            </div>
            <div className="triage-table">
              <div className="triage-head">
                <span>Event ID</span>
                <span>Description</span>
                <span>Confidence</span>
                <span>Status</span>
              </div>
              {triageEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={`triage-row ${selectedAuditEventId === event.id ? 'selected' : ''}`}
                  onClick={() => selectTriageEvent(event.id)}
                >
                  <span className="mono">{event.id}</span>
                  <span className="triage-desc">{event.description}</span>
                  <span className="triage-conf">
                    <span className="triage-bar"><span style={{ width: `${event.confidence * 100}%` }} /></span>
                    <span className="mono">{event.confidence.toFixed(2)}</span>
                  </span>
                  <span className={`tag tag-${event.status.toLowerCase()}`}>{event.status}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel compliance-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Compliance audit log</span>
                <h2>Immutable record</h2>
              </div>
              <div className="audit-lock">
                <span className="mono">IMMUTABLE RECORD</span>
                <span className="lock">Locked</span>
              </div>
            </div>
            <div className="audit-timeline">
              {auditLogEntries.map((entry) => (
                <div key={`${entry.system}-${entry.time}`} className="audit-item">
                  <div className="audit-dot" />
                  <div>
                    <div className="mono">{entry.time}</div>
                    <div className="audit-system">{entry.system}</div>
                    <p>{entry.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="audit-right">
          <section className="panel trace-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Traceability view</span>
                <h2>Signal lineage</h2>
              </div>
              <div className="panel-actions">
                <button className="icon-button" title="Zoom in" onClick={() => zoomTraceGraph('in')}><span className="material-symbols-outlined">zoom_in</span></button>
                <button className="icon-button" title="Zoom out" onClick={() => zoomTraceGraph('out')}><span className="material-symbols-outlined">zoom_out</span></button>
                <button className="icon-button" title="Center" onClick={() => zoomTraceGraph('center')}><span className="material-symbols-outlined">center_focus_strong</span></button>
              </div>
            </div>
            <div className="trace-canvas" style={{ transform: `scale(${traceZoom})`, transformOrigin: 'center top' }}>
              <button type="button" className={`trace-node trace-node-left ${selectedGraphNode === 'SRC: MedForum' ? 'selected' : ''}`} onClick={() => selectTraceNode('SRC: MedForum')}>SRC: MedForum</button>
              <button type="button" className={`trace-node trace-node-center alert ${selectedGraphNode === `NODE: ${selectedTriageEvent.id}` ? 'selected' : ''}`} onClick={() => selectTraceNode(`NODE: ${selectedTriageEvent.id}`)}>NODE: {selectedTriageEvent.id}</button>
              <button type="button" className={`trace-node trace-node-right ${selectedGraphNode === 'MDL: NLP-v4.2' ? 'selected' : ''}`} onClick={() => selectTraceNode('MDL: NLP-v4.2')}>MDL: NLP-v4.2</button>
              <div className="trace-line trace-line-left" />
              <div className="trace-line trace-line-right" />
              <div className="trace-meta">
                <div className="panel-kicker">Selected node metadata</div>
                <div className="meta-row"><span>ID</span><span className="mono">{selectedTriageEvent.id}</span></div>
                <div className="meta-row"><span>Type</span><span>{selectedTriageEvent.status}</span></div>
                <div className="meta-row"><span>Conf</span><span className="mono">{selectedTriageEvent.confidence.toFixed(2)}</span></div>
              </div>
            </div>
          </section>

          <section className="panel threshold-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Signal confidence thresholds</span>
                <h2>Calibration</h2>
              </div>
            </div>
            <div className="slider-block">
              <div className="slider-header">
                <span>Auto-flag sensitivity</span>
                <span className="mono">{autoFlagValue.toFixed(2)}</span>
              </div>
              <div className="slider-track">
                <span className="slider-fill slider-fill-blue" style={{ width: `${autoFlagValue * 100}%` }} />
                <span className="slider-thumb" style={{ left: `${autoFlagValue * 100}%` }} />
              </div>
              <input
                className="range-input"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={autoFlagValue}
                onChange={(event) => updateAuditThreshold('autoFlag', Number(event.target.value))}
              />
              <div className="slider-range">Low Vol. <span>High Vol.</span></div>
            </div>
            <div className="slider-block">
              <div className="slider-header">
                <span>PII redaction confidence</span>
                <span className="mono">{piiValue.toFixed(2)}</span>
              </div>
              <div className="slider-track">
                <span className="slider-fill slider-fill-green" style={{ width: `${piiValue * 100}%` }} />
                <span className="slider-thumb" style={{ left: `${piiValue * 100}%` }} />
              </div>
              <input
                className="range-input"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={piiValue}
                onChange={(event) => updateAuditThreshold('piiRedaction', Number(event.target.value))}
              />
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderSources() {
    return (
      <section className="view-grid recent-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Source registry</span>
              <h2>Live feeds</h2>
            </div>
            <div className="panel-actions">
              <button className="icon-button" onClick={addSourceFeed}>Add feed</button>
              <button className="icon-button" onClick={testSelectedSource}>Test</button>
              <button className="icon-button danger" onClick={pauseSelectedSource}>Pause</button>
            </div>
          </div>
          <div className="table">
            <div className="table-row table-head" style={{ gridTemplateColumns: sourceRowTemplate }}>
              <span>Name</span>
              <span>Channel</span>
              <span>Coverage</span>
              <span>Freshness</span>
              <span>Health</span>
            </div>
            {filteredSources.map((row) => (
              <div
                key={row.name}
                className={`table-row ${selectedSource?.name === row.name ? 'selected' : ''}`}
                style={{ gridTemplateColumns: sourceRowTemplate }}
                onClick={() => setSelectedSourceName(row.name)}
              >
                <span className="mono source-name"><span className="material-symbols-outlined source-icon">{sourceIcon(row.name)}</span>{row.name}</span>
                <span>{row.channel}</span>
                <span>{row.coverage}</span>
                <span>{row.freshness}</span>
                <span className={`tag tag-${healthTone(row.health)}`}>{row.enabled ? row.health : 'Paused'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Coverage</span>
              <h2>Ingestion status</h2>
            </div>
          </div>
          <div className="meta-card">
            <div className="panel-kicker">Selected source metadata</div>
            <div className="meta-row"><span>Name</span><span>{selectedSource?.name ?? '-'}</span></div>
            <div className="meta-row"><span>Channel</span><span>{selectedSource?.channel ?? '-'}</span></div>
            <div className="meta-row"><span>Coverage</span><span>{selectedSource?.coverage ?? '-'}</span></div>
            <div className="meta-row"><span>Freshness</span><span>{selectedSource?.freshness ?? '-'}</span></div>
            <div className="meta-row"><span>Health</span><span className={`tag tag-${healthTone(selectedSource?.health ?? 'Paused')}`}>{selectedSource?.health ?? 'Paused'}</span></div>
          </div>
          <div className="metric-block">
            <span>Delivery success</span>
            <div className="metric-line">
              <strong>{Math.round((sources.filter((row) => row.enabled).length / sources.length) * 100)}%</strong>
              <span className="tag tag-warning">Headless enabled</span>
            </div>
            <div className="progress">
              <span style={{ width: `${Math.round((sources.filter((row) => row.enabled).length / sources.length) * 100)}%` }} />
            </div>
          </div>
          <div className="button-stack">
            <button className="ghost" onClick={() => copyToClipboard(JSON.stringify(selectedSource, null, 2), 'Source copied to clipboard.')}>Copy source JSON</button>
            <button className="ghost" onClick={refreshSelectedSource}>Refresh feed</button>
            <button className="ghost" onClick={cycleSignalFilter}>Cycle signal filter</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Provenance</span>
              <h2>Regional and channel spread</h2>
            </div>
          </div>
          <div className="panel-subsection">
            <div className="panel-kicker">Enabled feeds</div>
            <div className="toggle-list">
              {sources.map((source) => (
                <div key={source.name} className="toggle-row">
                  <span>{source.name}</span>
                  <button className={`toggle ${source.enabled ? 'on' : ''}`} onClick={() => toggleSourceFeed(source.name)} />
                </div>
              ))}
            </div>
          </div>
          <div className="panel-subsection">
            <div className="panel-kicker">Channel notes</div>
            <p>Community boards are routed through the rendered fetch path when JavaScript is required.</p>
          </div>
        </section>
      </section>
    );
  }

  function renderExtraction() {
    return (
      <section className="view-grid recent-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Page extraction</span>
              <h2>Headless data input</h2>
            </div>
            <div className="panel-actions">
              <button className="icon-button" onClick={fetchPageSnapshot} disabled={loadingSnapshot}>
                {loadingSnapshot ? 'Fetching...' : 'Fetch page'}
              </button>
              <button className="icon-button" onClick={copySnapshotJson}>Copy JSON</button>
              <button className="icon-button danger" onClick={exportSnapshotJson}>Export JSON</button>
            </div>
          </div>
          <div className="ingest-form">
            <label className="search" style={{ flex: 1 }}>
              <span>Target URL</span>
              <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="https://example.com" />
            </label>
            <div className="toggle-row" style={{ minWidth: 220 }}>
              <span>Render JavaScript</span>
              <button className="icon-button" onClick={() => setRenderJs((current) => !current)}>
                {renderJs ? 'On' : 'Off'}
              </button>
            </div>
          </div>
          <div className="snapshot-card">
            <div><strong>Title:</strong> {snapshot?.title ?? 'No page loaded'}</div>
            <div><strong>Description:</strong> {snapshot?.description ?? 'Use the fetch button to extract page metadata.'}</div>
            <div><strong>Fetched:</strong> {snapshot?.fetchedAt ?? '-'}</div>
            <div><strong>Mode:</strong> {renderJs ? 'Headless browser' : 'Static HTML'}</div>
          </div>
          <div className="split-panels" style={{ marginTop: 12 }}>
            <div className="mini-panel">
              <div className="panel-kicker">Headings</div>
              <div className="entity-list">
                {(snapshot?.headings.length ? snapshot.headings : ['Waiting for a fetch...'])
                  .filter((heading) => heading.toLowerCase().includes(searchQuery.trim().toLowerCase()) || !searchQuery.trim())
                  .map((heading) => (
                    <button key={heading} type="button" className="entity-row clickable" onClick={() => setSearchQuery(heading)}>
                      <div>
                        <div className="entity-name">{heading}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
            <div className="mini-panel">
              <div className="panel-kicker">Links</div>
              <div className="entity-list">
                {(snapshot?.links.length ? snapshot.links : [{ text: 'No extracted links yet', href: '' }])
                  .filter((link) => {
                    const query = searchQuery.trim().toLowerCase();
                    return !query || link.text.toLowerCase().includes(query) || link.href.toLowerCase().includes(query);
                  })
                  .map((link) => (
                    <button
                      key={`${link.text}-${link.href}`}
                      type="button"
                      className="entity-row clickable"
                      onClick={() => openSnapshotLink(link.href, link.text)}
                    >
                      <div>
                        <div className="entity-name">{link.text}</div>
                        <div className="entity-meta">{link.href || 'No href extracted'}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Queue</span>
              <h2>Capture steps</h2>
            </div>
          </div>
          <div className="meta-list">
            <div className="meta-row"><span>1. Load page</span><span>Send the URL to Rust</span></div>
            <div className="meta-row"><span>2. Extract HTML</span><span>Read title, metadata, headings, and links</span></div>
            <div className="meta-row"><span>3. Render JS</span><span>Use the system browser when a page needs script execution</span></div>
          </div>
          <div className="payload" style={{ marginTop: 12 }}>
            <div className="payload-label">Snapshot JSON</div>
            <pre className="json-panel">{snapshot ? JSON.stringify(snapshot, null, 2) : 'No snapshot available yet.'}</pre>
          </div>
        </section>
      </section>
    );
  }

  function renderIntelligence() {
    return (
      <section className="view-grid audit-grid">
        <section className="panel trace-grid" style={{ gridColumn: 'span 2' }}>
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Intelligence canvas</span>
              <h2>Node-link graph</h2>
            </div>
            <div className="panel-actions">
              <button className="icon-button" onClick={copySignalContext}>Copy context</button>
              <button className="icon-button danger" onClick={() => updateSelectedSignalStatus('Escalated')}>Escalate</button>
            </div>
          </div>
          <div className="trace-canvas" style={{ minHeight: 260 }}>
            <button type="button" className="trace-node trace-node-left" onClick={() => selectTraceNode(`SRC: ${selectedSignal?.source.split(' / ')[0] ?? 'Feed'}`)}>SRC: {selectedSignal?.source.split(' / ')[0] ?? 'Feed'}</button>
            <button type="button" className="trace-node trace-node-center alert" onClick={() => selectTraceNode(`NODE: ${selectedSignal?.id ?? 'N/A'}`)}>NODE: {selectedSignal?.id ?? 'N/A'}</button>
            <button type="button" className="trace-node trace-node-right" onClick={() => selectTraceNode('MODEL: NLP-v4.2')}>MODEL: NLP-v4.2</button>
            <div className="trace-line trace-line-left" />
            <div className="trace-line trace-line-right" />
          </div>
        </section>

        <section className="panel map-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Map layers</span>
              <h2>Regional context</h2>
            </div>
          </div>
          <div className="world-map" style={{ minHeight: 260 }}>
            {mapPins.map((pin) => (
              <button key={pin.label} type="button" className="map-marker marker-warning" style={{ top: pin.top, left: pin.left }} onClick={() => drillIntoRegion(pin.region)}>
                <span>{pin.label}</span>
                <small>{pin.value}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-header">
            <div>
              <span className="panel-kicker">XAI notes</span>
              <h2>Why the cluster matters</h2>
            </div>
          </div>
          <div className="meta-list">
            <div className="meta-row"><span>Risk vector</span><span>Cross-source similarity exceeded the threshold.</span></div>
            <div className="meta-row"><span>Context</span><span>Nearby posts and threads reinforce the same theme.</span></div>
            <div className="meta-row"><span>Action</span><span>Escalate, annotate, and preserve the evidence chain.</span></div>
            <div className="meta-row"><span>Focus</span><span>{selectedGraphNode}</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Selected signal</span>
              <h2>{selectedSignal?.id ?? 'No selection'}</h2>
            </div>
          </div>
          <div className="meta-card">
            <div className="meta-row"><span>Type</span><span>{selectedSignal?.type ?? '-'}</span></div>
            <div className="meta-row"><span>Status</span><span>{selectedSignal?.status ?? '-'}</span></div>
            <div className="meta-row"><span>Confidence</span><span className="mono">{selectedSignal?.confidence ?? 0}%</span></div>
            <div className="meta-row"><span>Region</span><span>{selectedSignal?.region ?? '-'}</span></div>
          </div>
        </section>
      </section>
    );
  }

  function renderSettings() {
    const drugTerms = terms.slice(0, 3);
    const symptomTerms = terms.slice(3);

    return (
      <section className="config-shell">
        <section className="panel config-main">
          <div className="config-header">
            <div>
              <span className="panel-kicker"><span className="material-symbols-outlined">memory</span> Generic engine / new project</span>
              <h2>Project initialization</h2>
            </div>
            <div className="panel-actions">
              <span className="status-pill">State: Draft</span>
              <button className="icon-button" title="More"><span className="material-symbols-outlined">more_vert</span></button>
            </div>
          </div>
          <div className="config-body">
            <div className="config-section">
              <div className="section-title">
                <h3>Project Initialization</h3>
                <p>Define core parameters for the monitoring engine.</p>
              </div>
              <div className="config-grid">
                <label>
                  <span>Project name</span>
                  <input
                    value={configDraft.projectName}
                    onChange={(event) => setConfigDraft((current) => ({ ...current, projectName: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Owner group</span>
                  <select
                    value={configDraft.ownerGroup}
                    onChange={(event) => setConfigDraft((current) => ({ ...current, ownerGroup: event.target.value }))}
                  >
                    <option>Pharmacovigilance Team Alpha</option>
                    <option>Safety Response Group</option>
                    <option>Global Compliance</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="config-section">
              <div className="section-title section-inline">
                <div>
                  <h3>Ontology &amp; Keywords</h3>
                  <p>Define target terms for natural language processing extraction.</p>
                </div>
                <button className="link-button" onClick={importDictionary}>
                  <span className="material-symbols-outlined">upload_file</span> Import Dictionary
                </button>
              </div>
              <div className="keyword-block">
                <div className="keyword-header"><span className="material-symbols-outlined">medication</span> Target Compounds / Drugs</div>
                <div className="chip-row">
                  {drugTerms.map((chip) => (
                    <span key={chip} className="chip chip-close">
                      {chip}
                      <button type="button" onClick={() => removeTermChip(chip)}>x</button>
                    </span>
                  ))}
                  <button className="chip ghost" onClick={() => addTermChip('drugs')}>+ Add Term</button>
                </div>
              </div>
              <div className="keyword-block">
                <div className="keyword-header"><span className="material-symbols-outlined">sick</span> Target Symptoms / AEs</div>
                <div className="chip-row">
                  {symptomTerms.map((chip) => (
                    <span key={chip} className="chip chip-close">
                      {chip}
                      <button type="button" onClick={() => removeTermChip(chip)}>x</button>
                    </span>
                  ))}
                  <button className="chip ghost" onClick={() => addTermChip('symptoms')}>+ Add Term</button>
                </div>
              </div>
            </div>

            <div className="config-section config-split">
              <div>
                <div className="section-title">
                  <h3>Data Sources</h3>
                  <p>Select acquisition vectors.</p>
                </div>
                <div className="toggle-list">
                  {sources.slice(0, 3).map((source) => (
                    <div key={source.name} className="toggle-row">
                      <span className="toggle-label"><span className="material-symbols-outlined">{sourceIcon(source.name)}</span> {source.name}</span>
                      <button className={`toggle ${source.enabled ? 'on' : ''}`} onClick={() => toggleSourceFeed(source.name)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-title">
                  <h3>Ingestion Latency</h3>
                  <p>Configure crawling frequency.</p>
                </div>
                <div className="latency-options">
                  {(['Real-time', 'Daily Batch', 'Weekly Batch'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`latency-option ${configDraft.latency === option ? 'active' : ''}`}
                      onClick={() => setConfigDraft((current) => ({ ...current, latency: option }))}
                    >
                      <div>
                        <strong>{option === 'Real-time' ? 'Real-time (Stream)' : option}</strong>
                        <span>
                          {option === 'Real-time'
                            ? 'High compute cost. Instant alerts.'
                            : option === 'Daily Batch'
                              ? 'Runs at 00:00 UTC. Standard cost.'
                              : 'Runs Sunday. Low compute cost.'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="config-footer">
            <button className="ghost" onClick={discardDraft}>Discard</button>
            <button className="ghost" onClick={saveDraft}>Save Draft</button>
            <button className="primary" onClick={initializeEngine}>Initialize Engine</button>
          </div>
        </section>

        <aside className="panel config-side">
          <div className="side-section">
            <div className="panel-kicker">System metrics &amp; helper</div>
            <h3>Crawler pre-flight estimates</h3>
            <div className="metric-block">
              <span>Projected daily volume</span>
              <div className="metric-line">
                <strong>~45k events</strong>
                <span className="tag tag-warning">Moderate (22%)</span>
              </div>
              <div className="progress">
                <span style={{ width: '45%' }} />
              </div>
            </div>
            <div className="metric-block">
              <span>API quota impact</span>
              <div className="metric-line">
                <strong>Moderate</strong>
                <span className="tag tag-warning">22%</span>
              </div>
              <div className="progress">
                <span style={{ width: '22%' }} />
              </div>
            </div>
          </div>
          <div className="side-section">
            <div className="panel-kicker">NLP configuration guide</div>
            <p>
              The generic engine uses fuzzy matching for symptomatic terms. When defining target symptoms, avoid highly
              specific jargon unless targeting clinical subsets.
            </p>
            <p className="tip">Pro tip: use the Import Dictionary feature to load standard MedDRA preferred terms.</p>
          </div>
          <div className="side-section">
            <div className="panel-kicker">Environment</div>
            <div className="meta-list">
              <div className="meta-row"><span>Environment</span><span>Production</span></div>
              <div className="meta-row"><span>Engine</span><span>v4.2.0-nlp</span></div>
              <div className="meta-row"><span>Version</span><span>v4.2.0-nlp</span></div>
              <div className="meta-row"><span>Session ID</span><span className="mono">3x7-98b-qw22</span></div>
            </div>
          </div>
        </aside>
      </section>
    );
  }

  function renderActiveTab() {
    switch (activeTab) {
      case 'signals':
        return renderSignals();
      case 'audit':
        return renderAudit();
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

  return (
    <div className="app-shell" data-theme={mode} data-density={density}>
      <aside className="rail">
        <div className="rail-logo">
          <span className="material-symbols-outlined">hub</span>
        </div>
        <div className="rail-items">
          {railTabs.map((item) => (
            <button
              key={item.key}
              className={`rail-button ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
              title={item.title}
            >
              <span className={`material-symbols-outlined ${activeTab === item.key ? 'fill' : ''}`}>{item.icon}</span>
            </button>
          ))}
        </div>
        <div className="rail-footer">
          <button className="rail-button" onClick={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))} title="Toggle theme">
            <span className="material-symbols-outlined">{mode === 'dark' ? 'dark_mode' : 'light_mode'}</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="top-title">
            <div className="title">Patient Safety Sentinel</div>
            <div className="top-context">
              <span className="top-context-label">{currentView.label}</span>
              <span className="top-context-kicker">{currentView.kicker}</span>
            </div>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>Search</span>
              <input
                placeholder="Search signals, nodes, feeds..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <button className="ghost" onClick={downloadCurrentCsv}>Export CSV</button>
            <button className="primary" onClick={deploySignal}>Deploy Signal</button>
            <select value={density} onChange={(event) => setDensity(event.target.value as Density)}>
              <option value="compact">Compact</option>
              <option value="cozy">Cozy</option>
            </select>
          </div>
        </header>

        <main className="content">
          {notice ? <div className={`notice-banner notice-${notice.tone}`}>{notice.message}</div> : null}
          <div className="breadcrumbs" style={{ marginBottom: 12 }}>
            Sentinel / Analytic / {currentView.label}
          </div>
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
}

export default PSSPortal;
