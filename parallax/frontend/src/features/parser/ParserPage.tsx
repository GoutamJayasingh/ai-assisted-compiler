import { Boxes, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../app/ProjectContext";
import { CodeEditor, type EditorHighlight } from "../../components/CodeEditor";
import { RunGate } from "../../components/RunGate";
import { Badge, Banner, Disclosure, Panel, Tabs } from "../../components/ui";
import { formatPos } from "../../lib/positions";
import { api } from "../../services/api";
import type { GrammarInfo } from "../../types/api";

type Tab = "error" | "recovery" | "trace" | "grammar";
const PAGE = 250;

export function ParserPage() {
  const p = useProject();
  const doc = p.parse?.envelope.data;
  const [tab, setTab] = useState<Tab>("error");
  const [grammar, setGrammar] = useState<GrammarInfo | null>(null);
  const [traceFilter, setTraceFilter] = useState<"all" | "shift" | "reduce" | "error">("all");
  const [tracePage, setTracePage] = useState(0);
  const [ruleQuery, setRuleQuery] = useState("");
  const [selDiag, setSelDiag] = useState(0);

  useEffect(() => {
    api.grammar().then(setGrammar).catch(() => setGrammar(null));
  }, []);
  useEffect(() => {
    setTracePage(0);
    setSelDiag(0);
  }, [doc]);

  const rules = useMemo(() => new Map((grammar?.rules ?? []).map((r) => [r.number, r])), [grammar]);
  const diag = doc?.parse.diagnostics[selDiag];
  const tokens = doc?.tokens ?? [];
  const highlights: EditorHighlight[] = useMemo(
    () => (doc?.parse.diagnostics ?? []).map((d, i) => ({ from: d.start.offset, to: d.end.offset, tone: i === selDiag ? ("error" as const) : ("select" as const) })),
    [doc, selDiag],
  );

  const trace = useMemo(() => {
    const t = doc?.parse.trace ?? [];
    if (traceFilter === "all") return t;
    const key = traceFilter === "shift" ? "Shifting" : traceFilter === "reduce" ? "Reducing" : "rror";
    return t.filter((l) => l.includes(key));
  }, [doc, traceFilter]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Grammar & parsing</h1>
          <p>A pure (re-entrant) Bison LALR(1) parser with LAC, so the expected-token set at an error is exact. Diagnostics are structured: offending token, expected kinds, and the LR state on top of the stack.</p>
        </div>
        <button className="btn primary" onClick={() => p.runParse(true)} disabled={p.running.parse}>
          <Boxes size={14} aria-hidden /> {p.running.parse ? "Parsing…" : "Run parser (with trace)"}
        </button>
      </div>
      <RunGate kind="parse" has={!!doc} what="parser">
        {doc && (
          <>
            {doc.parse.ok ? (
              <Banner tone="success" title="The program parses">
                Bison accepted the token stream with no syntax errors; an AST with {doc.parse.ast_nodes} nodes (depth {doc.parse.ast_depth}) was built.
              </Banner>
            ) : (
              <Banner tone="danger" title={`${doc.parse.diagnostics.length} syntax diagnostic${doc.parse.diagnostics.length > 1 ? "s" : ""} (with panic-mode recovery)`}>
                The first is usually the most trustworthy; later ones may be cascades caused by how recovery resynchronised.
                {doc.parse.resource_limit && " The parser hit its nesting limit (5000 stack entries)."}
              </Banner>
            )}
            <div className="split">
              <Panel title="Source">
                <CodeEditor value={p.parse!.source} readOnly highlights={highlights} minHeight={240} maxHeight={420} ariaLabel="Source (read-only)" />
              </Panel>
              <Panel flush>
                <Tabs<Tab>
                  label="Parser views"
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    { id: "error", label: "Error & expectations" },
                    { id: "recovery", label: "Recovery" },
                    { id: "trace", label: "Parse progression" },
                    { id: "grammar", label: "Grammar" },
                  ]}
                />
                <div className="panel-body">
                  {tab === "error" &&
                    (!diag ? (
                      <p className="muted">No syntax error. Switch to “Parse progression” to watch the shift/reduce steps, or “Grammar” for the rules.</p>
                    ) : (
                      <div className="stack">
                        <dl className="kv">
                          <dt>Diagnostic</dt>
                          <dd><strong>{diag.message}</strong></dd>
                          <dt>Location</dt>
                          <dd className="mono">{formatPos(diag.start)} (token #{diag.token_index})</dd>
                          <dt>Unexpected</dt>
                          <dd><code className="code-inline">{diag.unexpected === "EOF" ? "<end of input>" : diag.unexpected_lexeme}</code> <span className="faint">{diag.unexpected}</span></dd>
                          <dt>Bison says</dt>
                          <dd className="mono small">{diag.bison_message}</dd>
                          <dt>LR state</dt>
                          <dd className="mono">{diag.parser_state}</dd>
                        </dl>
                        <div>
                          <h4 style={{ marginBottom: 6 }}>Expected here ({diag.expected.length}, exact via LAC)</h4>
                          <div className="chip-list">
                            {diag.expected_spelling.map((s, i) => (
                              <Badge key={i} tone="accent" icon={false}>{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 style={{ marginBottom: 6 }}>Why this token sequence fails</h4>
                          <p className="small">
                            The parser consumed{" "}
                            <code className="code-inline">{tokens.slice(Math.max(0, diag.token_index - 6), diag.token_index).map((t) => t.lexeme).join(" ") || "(nothing)"}</code>{" "}
                            and is in LR state {diag.parser_state}. In that state no action exists for{" "}
                            <code className="code-inline">{diag.unexpected === "EOF" ? "end of input" : diag.unexpected_lexeme}</code>, only for the {diag.expected.length} kinds above. The error is detected here, which is not necessarily where the programmer's mistake is (e.g. a missing ‘;’ is noticed at the next line).
                          </p>
                        </div>
                        {doc.parser_state_info ? (
                          <Disclosure summary={`Grammar items in state ${doc.parser_state_info.number} (from Bison's report)`} open>
                            <p className="tiny muted" style={{ marginBottom: 6 }}>The dot (.) marks how far each rule has been matched when the error occurred.</p>
                            <pre className="code-block">{doc.parser_state_info.items.map((it) => `${String(it.rule).padStart(3)}  ${it.lhs}: ${it.rhs}`).join("\n")}</pre>
                            <h4 style={{ margin: "10px 0 6px" }}>Actions</h4>
                            <pre className="code-block">{doc.parser_state_info.actions.map((a) => `${a.on.padEnd(22)} ${a.action}`).join("\n")}</pre>
                          </Disclosure>
                        ) : (
                          <p className="tiny faint">{doc.grammar_report_available ? "No state information for this diagnostic." : "Bison's report (parser.output) was not found; rebuild the compiler to enable state views."}</p>
                        )}
                      </div>
                    ))}
                  {tab === "recovery" && (
                    <div className="stack">
                      <p className="small muted">
                        Panic-mode recovery (Bison <code>error</code> productions) skips tokens until it can resynchronise on <code>;</code> or <code>{"}"}</code>, then continues. This is Baseline B in the evaluation: it reports errors but never proposes a repair.
                      </p>
                      {doc.parse.diagnostics.length === 0 ? (
                        <p className="muted">No errors, so no recovery happened.</p>
                      ) : (
                        <table className="table">
                          <thead>
                            <tr><th>#</th><th>Where</th><th>Message</th></tr>
                          </thead>
                          <tbody>
                            {doc.parse.diagnostics.map((d, i) => (
                              <tr key={i} className={`clickable ${i === selDiag ? "selected" : ""}`} onClick={() => setSelDiag(i)}>
                                <td>{i + 1}</td>
                                <td className="mono">{formatPos(d.start)}</td>
                                <td>{d.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {doc.parse.recovered_ast && (
                        <Disclosure summary="Partial tree built during recovery (contains Error nodes; not a valid AST)">
                          <pre className="code-block" style={{ maxHeight: 260 }}>{JSON.stringify(doc.parse.recovered_ast, (k, v) => (k === "span" ? undefined : v), 1)}</pre>
                        </Disclosure>
                      )}
                    </div>
                  )}
                  {tab === "trace" && (
                    <div className="stack">
                      <div className="row">
                        {(["all", "shift", "reduce", "error"] as const).map((f) => (
                          <button key={f} className={`btn sm ${traceFilter === f ? "primary" : ""}`} onClick={() => { setTraceFilter(f); setTracePage(0); }}>
                            {f}
                          </button>
                        ))}
                        <span className="tiny muted">
                          {trace.length} lines{doc.parse.trace_truncated ? " (capture limit reached)" : ""}
                        </span>
                      </div>
                      {!doc.parse.trace?.length ? (
                        <p className="muted small">No trace captured. Run the parser with trace enabled.</p>
                      ) : (
                        <>
                          <pre className="code-block" style={{ maxHeight: 380 }}>
                            {trace.slice(tracePage * PAGE, (tracePage + 1) * PAGE).map((l) => {
                              const m = /rule (\d+)/.exec(l);
                              const r = m ? rules.get(Number(m[1])) : undefined;
                              return r ? `${l}    ⟶ ${r.lhs}: ${r.rhs}\n` : `${l}\n`;
                            })}
                          </pre>
                          <div className="row">
                            <button className="btn sm" disabled={tracePage === 0} onClick={() => setTracePage(tracePage - 1)}>Previous</button>
                            <span className="tiny muted">page {tracePage + 1} / {Math.max(1, Math.ceil(trace.length / PAGE))}</span>
                            <button className="btn sm" disabled={(tracePage + 1) * PAGE >= trace.length} onClick={() => setTracePage(tracePage + 1)}>Next</button>
                          </div>
                          <p className="tiny faint">This is Bison's own debug trace (yydebug), captured in-process. “Reducing stack by rule N” lines are annotated with rule N from the generated report.</p>
                        </>
                      )}
                    </div>
                  )}
                  {tab === "grammar" && (
                    <div className="stack">
                      {!grammar ? (
                        <p className="muted small">Grammar unavailable (backend offline).</p>
                      ) : (
                        <>
                          <p className="small muted">{grammar.rules.length} rules · {grammar.states ?? "?"} LR states. {grammar.note}</p>
                          <label className="row small">
                            <Search size={13} aria-hidden className="muted" />
                            <input className="input" placeholder="Filter rules (e.g. if_stmt)" value={ruleQuery} onChange={(e) => setRuleQuery(e.target.value)} />
                          </label>
                          <pre className="code-block" style={{ maxHeight: 340 }}>
                            {grammar.rules
                              .filter((r) => !ruleQuery || r.lhs.includes(ruleQuery) || r.rhs.includes(ruleQuery))
                              .map((r) => `${String(r.number).padStart(3)}  ${r.lhs}: ${r.rhs}`)
                              .join("\n")}
                          </pre>
                          <Disclosure summary="Full grammar source (grammar/minic.y, rules section with actions)">
                            <pre className="code-block" style={{ maxHeight: 420 }}>{grammar.grammar_source}</pre>
                          </Disclosure>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </>
        )}
      </RunGate>
    </>
  );
}
