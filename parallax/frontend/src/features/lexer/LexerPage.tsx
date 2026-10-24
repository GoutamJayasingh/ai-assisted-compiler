import { ScanText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../app/ProjectContext";
import { CodeEditor, type EditorHighlight } from "../../components/CodeEditor";
import { RunGate } from "../../components/RunGate";
import { Badge, Disclosure, EmptyState, Panel, Stat } from "../../components/ui";
import { formatPos } from "../../lib/positions";
import { rulesFor } from "../../lib/lexerRules";
import { api } from "../../services/api";
import type { Token } from "../../types/api";

const CATS = ["all", "keyword", "type-keyword", "identifier", "literal", "operator", "punctuation", "error", "unsupported"] as const;

export function LexerPage() {
  const p = useProject();
  const doc = p.lex?.envelope.data;
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Token | null>(null);
  const [lexerSrc, setLexerSrc] = useState<string | null>(null);

  useEffect(() => {
    api.grammar().then((g) => setLexerSrc(g.lexer_source ?? null)).catch(() => setLexerSrc(null));
  }, []);
  useEffect(() => setSel(null), [doc]);

  const tokens = useMemo(
    () => (doc?.tokens ?? []).filter((t) => (cat === "all" || t.category === cat) && (!q || t.lexeme.includes(q) || t.kind.includes(q.toUpperCase()))),
    [doc, cat, q],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of doc?.tokens ?? []) c[t.category] = (c[t.category] ?? 0) + 1;
    return c;
  }, [doc]);

  const highlights: EditorHighlight[] = useMemo(() => {
    const out: EditorHighlight[] = (doc?.lexical_errors ?? []).map((e) => ({ from: e.start.offset, to: e.end.offset, tone: "error" as const }));
    if (sel) out.push({ from: sel.start.offset, to: sel.end.offset, tone: "select" });
    return out;
  }, [doc, sel]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lexical analysis</h1>
          <p>The Flex scanner turns bytes into tokens. Positions are 1-based lines and Unicode-code-point columns; offsets are UTF-8 bytes. Lexical problems become error tokens rather than crashing the scanner.</p>
        </div>
        <button className="btn primary" onClick={p.runLex} disabled={p.running.lex}>
          <ScanText size={14} aria-hidden /> {p.running.lex ? "Lexing…" : "Run lexer"}
        </button>
      </div>
      <RunGate kind="lex" has={!!doc} what="lexer">
        {doc && (
          <>
            <div className="grid grid-4">
              <Stat k="Tokens" v={doc.tokens.length} d={`${Object.keys(counts).length} categories`} />
              <Stat k="Lexical errors" v={doc.lexical_errors.length} d={doc.lexical_errors.length ? "shown in red" : "none"} />
              <Stat k="Comments" v={doc.comments.length} d="kept as trivia, not tokens" />
              <Stat k="Input" v={`${doc.input.bytes} B`} d={`${doc.input.lines} lines · ${doc.input.crlf_line_breaks} CRLF · ${doc.input.non_ascii_bytes} non-ASCII bytes`} />
            </div>
            <div className="split-wide">
              <Panel
                title="Token stream"
                flush
                actions={
                  <>
                    <label className="row small">
                      <Search size={13} aria-hidden className="muted" />
                      <span className="sr-only">Filter tokens</span>
                      <input className="input" style={{ width: 140, height: 28 }} placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
                    </label>
                    <select className="select" style={{ height: 28 }} value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} aria-label="Token category">
                      {CATS.map((c) => (
                        <option key={c} value={c}>
                          {c} {c !== "all" && counts[c] ? `(${counts[c]})` : ""}
                        </option>
                      ))}
                    </select>
                  </>
                }
              >
                <div className="table-wrap scroll-y">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="num">#</th>
                        <th>Kind</th>
                        <th>Category</th>
                        <th>Lexeme</th>
                        <th>Start</th>
                        <th>End</th>
                        <th className="num">Bytes</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((t) => (
                        <tr
                          key={t.index}
                          className={`clickable ${sel?.index === t.index ? "selected" : ""}`}
                          onClick={() => setSel(t)}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && setSel(t)}
                        >
                          <td className="num faint">{t.index}</td>
                          <td className="mono">{t.kind}</td>
                          <td>
                            <Badge tone={t.category === "error" ? "danger" : t.category === "unsupported" ? "info" : "neutral"} icon={false}>
                              {t.category}
                            </Badge>
                          </td>
                          <td><code className="code-inline">{t.lexeme}</code></td>
                          <td className="mono">{formatPos(t.start)}</td>
                          <td className="mono">{formatPos(t.end)}</td>
                          <td className="num mono">{t.start.offset}–{t.end.offset}</td>
                          <td className="mono">{t.value !== undefined ? String(t.value) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tokens.length === 0 && <EmptyState title="No tokens match">{doc.tokens.length === 0 ? "The input contains no tokens (empty or only comments/whitespace)." : "Change the filter."}</EmptyState>}
                </div>
              </Panel>
              <div className="stack">
                <Panel title="Source">
                  <CodeEditor value={p.lex!.source} readOnly highlights={highlights} minHeight={220} maxHeight={380} ariaLabel="Source (read-only)" />
                </Panel>
                <Panel title={sel ? `Token #${sel.index}: ${sel.kind}` : "Token details"}>
                  {!sel ? (
                    <p className="muted small">Select a token to highlight its exact source range and see the Flex rule that produced it.</p>
                  ) : (
                    <div className="stack">
                      <dl className="kv">
                        <dt>Lexeme</dt>
                        <dd><code className="code-inline">{sel.lexeme}</code></dd>
                        <dt>Category</dt>
                        <dd>{sel.category}</dd>
                        <dt>Span</dt>
                        <dd className="mono">{formatPos(sel.start)} → {formatPos(sel.end)} (bytes {sel.start.offset}–{sel.end.offset}, end exclusive)</dd>
                        {sel.value !== undefined && (<><dt>Value</dt><dd className="mono">{String(sel.value)}</dd></>)}
                        {sel.message && (<><dt>Message</dt><dd>{sel.message}</dd></>)}
                      </dl>
                      {lexerSrc ? (
                        <Disclosure summary="Flex rule(s) that emit this kind (from grammar/minic.l)" open>
                          {rulesFor(lexerSrc, sel.kind).map((r, i) => (
                            <pre key={i} className="code-block" style={{ marginBottom: 6 }}>{r}</pre>
                          ))}
                          <p className="tiny faint">Rules are located by searching the real lexer source for the token kind. Flex picks the longest match; ties go to the earlier rule.</p>
                        </Disclosure>
                      ) : (
                        <p className="tiny faint">Lexer source unavailable (backend offline).</p>
                      )}
                    </div>
                  )}
                </Panel>
                {doc.lexical_errors.length > 0 && (
                  <Panel title="Lexical errors">
                    <ul className="hint-list">
                      {doc.lexical_errors.map((e) => (
                        <li key={e.index}>
                          <button className="btn ghost sm" onClick={() => setSel(doc.tokens[e.index])}>{formatPos(e.start)}</button> <code>{e.lexeme.slice(0, 40)}</code> — {e.message}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>
            </div>
          </>
        )}
      </RunGate>
    </>
  );
}
