import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  GitBranch,
  GitCommitHorizontal,
  HelpCircle,
  Network,
  Search,
  ShieldAlert,
  Sparkles,
  Timeline,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import './App.css';
import { benchmarkQueries, temporalEdges, type BenchmarkQuery, type Category } from './data/hydraDataset';
import {
  evaluateBenchmark,
  getRelevantNodes,
  runAllModes,
  summarizeAccuracy,
  type RetrievalMode,
  type RetrievalResult,
} from './lib/retrieval';

const modeLabels: Record<RetrievalMode, { title: string; subtitle: string; icon: typeof Search }> = {
  naive: {
    title: 'Naive Flat Retrieval',
    subtitle: 'raw chunks · lexical similarity · no time',
    icon: Search,
  },
  enriched: {
    title: 'Enriched Chunks',
    subtitle: 'sliding-window context · entity bridges',
    icon: Sparkles,
  },
  graph: {
    title: 'Temporal Graph',
    subtitle: 'append-only edges · valid time · graph paths',
    icon: GitBranch,
  },
};

const categoryOrder: Category[] = [
  'Temporal reasoning',
  'Knowledge update',
  'Preference extraction',
  'Multi-session reasoning',
  'Abstention',
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function VerdictIcon({ result }: { result: RetrievalResult }) {
  if (result.verdict === 'correct') return <CheckCircle2 aria-label="correct" />;
  if (result.verdict === 'partial') return <HelpCircle aria-label="partial" />;
  if (result.verdict === 'abstained') return <ShieldAlert aria-label="abstained" />;
  return <XCircle aria-label="wrong" />;
}

function ModeCard({ result }: { result: RetrievalResult }) {
  const Icon = modeLabels[result.mode].icon;
  return (
    <article className={`mode-card ${result.verdict}`}>
      <header className="mode-card-header">
        <div className="mode-title">
          <Icon size={18} />
          <div>
            <h2>{modeLabels[result.mode].title}</h2>
            <p>{modeLabels[result.mode].subtitle}</p>
          </div>
        </div>
        <div className="verdict" title={`${result.verdict}, confidence ${percent(result.confidence)}`}>
          <VerdictIcon result={result} />
          <span>{percent(result.confidence)}</span>
        </div>
      </header>

      <div className="answer">
        <span>Final answer</span>
        <p>{result.answer}</p>
      </div>

      <div className="trace-list">
        {result.trace.map((step) => (
          <div key={step} className="trace-row">
            <CircleDot size={12} />
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div className="evidence-list">
        <h3>Retrieved evidence</h3>
        {result.evidence.slice(0, 4).map((item) => (
          <div className="evidence" key={`${result.mode}-${item.id}`}>
            <div className="evidence-topline">
              <strong>{item.title}</strong>
              <span>{item.score.toFixed(2)}</span>
            </div>
            <p>{item.body}</p>
            <small>{item.why}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function QuerySelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (query: BenchmarkQuery) => void;
}) {
  return (
    <aside className="query-panel">
      <div className="panel-kicker">
        <BrainCircuit size={16} />
        HydraDB-inspired miniature retrieval lab
      </div>
      <h1>HydraLens</h1>
      <p className="thesis">
        Compare similar-text retrieval against self-contained chunks and a versioned temporal-state multigraph.
      </p>

      <div className="query-groups">
        {categoryOrder.map((category) => (
          <section key={category}>
            <h2>{category}</h2>
            {benchmarkQueries
              .filter((query) => query.category === category)
              .map((query) => (
                <button
                  className={query.id === selectedId ? 'query-option active' : 'query-option'}
                  key={query.id}
                  type="button"
                  onClick={() => onSelect(query)}
                >
                  <span>{query.text}</span>
                  <ArrowRight size={14} />
                </button>
              ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

function TemporalGraph({ results }: { results: Record<RetrievalMode, RetrievalResult> }) {
  const graphEdges = results.graph.graphPath.length ? results.graph.graphPath : temporalEdges.slice(0, 8);
  const relevantNodes = getRelevantNodes(graphEdges);
  const nodePositions = relevantNodes.map((node, index) => {
    const angle = (index / Math.max(1, relevantNodes.length)) * Math.PI * 2 - Math.PI / 2;
    const radiusX = 42;
    const radiusY = 34;
    return {
      node,
      x: 50 + Math.cos(angle) * radiusX,
      y: 48 + Math.sin(angle) * radiusY,
    };
  });
  const pos = new Map(nodePositions.map((item) => [item.node, item]));

  return (
    <section className="graph-panel">
      <header>
        <div>
          <h2>
            <Network size={18} />
            Temporal Graph / Timeline
          </h2>
          <p>Selected query highlights versioned relations with valid time and commit time separated.</p>
        </div>
        <span>{graphEdges.length} edges</span>
      </header>

      <div className="graph-body">
        <svg className="graph-svg" viewBox="0 0 100 100" role="img" aria-label="temporal graph">
          {graphEdges.map((edge) => {
            const source = pos.get(edge.subject);
            const target = pos.get(edge.object);
            if (!source || !target) return null;
            return (
              <g key={edge.id}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="graph-edge" />
                <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 1} className="edge-label">
                  {edge.relation.replaceAll('_', ' ')}
                </text>
              </g>
            );
          })}
          {nodePositions.map((item) => (
            <g key={item.node}>
              <circle cx={item.x} cy={item.y} r="4.8" className="graph-node" />
              <text x={item.x} y={item.y + 8.5} className="node-label">
                {item.node}
              </text>
            </g>
          ))}
        </svg>

        <div className="timeline-rail">
          {graphEdges.map((edge) => (
            <div className="timeline-item" key={`timeline-${edge.id}`}>
              <div className="timeline-marker">
                <GitCommitHorizontal size={15} />
              </div>
              <div>
                <strong>
                  {edge.subject} {edge.relation.replaceAll('_', ' ')} {edge.object}
                </strong>
                <p>
                  valid {edge.validFrom}
                  {edge.validTo ? ` to ${edge.validTo}` : ' to now'} · committed {edge.commitTime.slice(0, 10)}
                </p>
                <small>{edge.reason}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TracePanel({ results }: { results: Record<RetrievalMode, RetrievalResult> }) {
  const rows = (['naive', 'enriched', 'graph'] as RetrievalMode[]).flatMap((mode) =>
    results[mode].evidence.slice(0, 3).map((item) => ({
      mode,
      item,
    })),
  );
  return (
    <section className="trace-panel">
      <header>
        <h2>
          <Timeline size={18} />
          Retrieval Trace
        </h2>
        <p>Scores are deterministic stand-ins for vector, lexical, and graph relevance signals.</p>
      </header>
      <div className="trace-table">
        <div className="trace-head">Mode</div>
        <div className="trace-head">Source</div>
        <div className="trace-head">Score</div>
        <div className="trace-head">Selection reason</div>
        {rows.map(({ mode, item }) => (
          <div className="trace-grid-row" key={`${mode}-${item.id}`}>
            <span className={`mode-pill ${mode}`}>{mode}</span>
            <strong>{item.title}</strong>
            <span>{item.score.toFixed(2)}</span>
            <p>{item.why}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvaluationDashboard() {
  const summary = summarizeAccuracy();
  const rows = evaluateBenchmark();
  const totals = (mode: RetrievalMode) =>
    rows.filter((row) => row.results[mode].verdict === 'correct').length / rows.length;

  return (
    <section className="eval-panel">
      <header>
        <div>
          <h2>Evaluation Dashboard</h2>
          <p>18 deterministic LongMemEval-style questions over 24 memory records and 23 temporal edges.</p>
        </div>
        <div className="score-strip">
          <span>Naive {percent(totals('naive'))}</span>
          <span>Enriched {percent(totals('enriched'))}</span>
          <span>Graph {percent(totals('graph'))}</span>
        </div>
      </header>
      <div className="category-bars">
        {summary.map((row) => (
          <div className="category-row" key={row.category}>
            <div>
              <strong>{row.category}</strong>
              <span>{row.count} questions</span>
            </div>
            <div className="bars">
              <span style={{ width: `${row.naive * 100}%` }}>Naive {percent(row.naive)}</span>
              <span style={{ width: `${row.enriched * 100}%` }}>Enriched {percent(row.enriched)}</span>
              <span style={{ width: `${row.graph * 100}%` }}>Graph {percent(row.graph)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="benchmark-table">
        {rows.map(({ query, results }) => (
          <div className="benchmark-row" key={query.id}>
            <span>{query.category}</span>
            <strong>{query.text}</strong>
            <div>
              {(['naive', 'enriched', 'graph'] as RetrievalMode[]).map((mode) => (
                <span className={`mini-verdict ${results[mode].verdict}`} key={mode}>
                  {mode}: {results[mode].verdict}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const defaultQuery = benchmarkQueries.find((query) => query.text === 'Why is Project Atlas blocked?') ?? benchmarkQueries[0];
  const [selectedQuery, setSelectedQuery] = useState<BenchmarkQuery>(defaultQuery);
  const [customQuery, setCustomQuery] = useState('');
  const activeText = customQuery.trim() || selectedQuery.text;
  const activeBenchmark = customQuery.trim() ? undefined : selectedQuery;
  const results = useMemo(() => runAllModes(activeBenchmark ?? activeText), [activeBenchmark, activeText]);

  return (
    <main className="app-shell">
      <QuerySelector
        selectedId={customQuery.trim() ? '' : selectedQuery.id}
        onSelect={(query) => {
          setSelectedQuery(query);
          setCustomQuery('');
        }}
      />

      <section className="workspace">
        <div className="query-bar">
          <div>
            <span>Active query</span>
            <h2>{activeText}</h2>
          </div>
          <label>
            <Search size={16} />
            <input
              aria-label="Custom retrieval query"
              value={customQuery}
              onChange={(event) => setCustomQuery(event.target.value)}
              placeholder="Try a custom query, e.g. Why did my preference change?"
            />
          </label>
        </div>

        <section className="comparison-grid">
          <ModeCard result={results.naive} />
          <ModeCard result={results.enriched} />
          <ModeCard result={results.graph} />
        </section>

        <TemporalGraph results={results} />
        <TracePanel results={results} />
        <EvaluationDashboard />
      </section>
    </main>
  );
}

export default App;
