import { useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";
const STARTER_CODE = `int x = 10;
print(x + 2);`;

function AstTree({ node, label }) {
  if (node == null) return null;
  if (Array.isArray(node)) {
    return <div className="ast-children">{node.map((child, i) => <AstTree key={i} node={child} label={String(i)} />)}</div>;
  }
  if (typeof node !== "object") {
    return <div className="ast-node ast-leaf"><span className="ast-label">{label || "value"}</span><div className="ast-card ast-value"><strong>{String(node)}</strong></div></div>;
  }
  const type = String(node.type || node.kind || "Node");
  const entries = Object.entries(node).filter(([key, value]) => key !== "type" && key !== "kind" && value != null);
  const scalar = entries.filter(([, value]) => typeof value !== "object");
  const children = entries.filter(([, value]) => typeof value === "object");
  const lower = type.toLowerCase();
  const kind = /program|root/.test(lower) ? "root" : /declaration|statement|print|assign/.test(lower) ? "statement" : /binary|expression|operator/.test(lower) ? "expression" : /number|literal|identifier|variable|integer/.test(lower) ? "value" : "generic";
  return <div className="ast-node">
    {label && <span className="ast-label">{label}</span>}
    <div className={`ast-card ast-${kind}`}>
      <strong>{type}</strong>
      {scalar.map(([key, value]) => <span className="ast-property" key={key}><small>{key}</small> {String(value)}</span>)}
    </div>
    {children.length > 0 && <div className="ast-children">{children.map(([key, value]) => <AstTree key={key} node={value} label={key} />)}</div>}
  </div>;
}

function IndentedAst({ node, depth = 0, label = "root" }) {
  if (node == null) return null;
  if (Array.isArray(node)) return <>{node.map((child, i) => <IndentedAst key={i} node={child} depth={depth} label={`[${i}]`} />)}</>;
  if (typeof node !== "object") return <div className="ast-line" style={{ paddingLeft: depth * 18 }}><span className="ast-branch">└─</span> <strong>{label}:</strong> {String(node)}</div>;
  const type = node.type || node.kind || "Node";
  return <div><div className="ast-line" style={{ paddingLeft: depth * 18 }}><span className="ast-branch">└─</span> <strong>{label}: {type}</strong></div>{Object.entries(node).filter(([key, value]) => key !== "type" && key !== "kind" && value != null).map(([key, value]) => typeof value === "object" ? <IndentedAst key={key} node={value} depth={depth + 1} label={key} /> : <div className="ast-line" style={{ paddingLeft: (depth + 1) * 18 }} key={key}><span className="ast-branch">└─</span> <strong>{key}:</strong> {String(value)}</div>)}</div>;
}

function Accordion({ id, number, title, description, icon, open, onToggle, children }) {
  return <section className={`accordion-card ${open ? "is-open" : ""}`} id={id}>
    <button className="accordion-trigger" onClick={onToggle} aria-expanded={open}>
      <span className="section-icon">{icon}</span>
      <span className="section-number">{number}</span>
      <span className="accordion-title-wrap"><strong>{title}</strong><small>{description}</small></span>
      <span className="accordion-chevron">{open ? "⌃" : "⌄"}</span>
    </button>
    {open && <div className="accordion-content">{children}</div>}
  </section>;
}

export default function App() {
  const [sourceCode, setSourceCode] = useState(STARTER_CODE);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("triangulation");
  const [astView, setAstView] = useState("tree");
  const [correction, setCorrection] = useState(null);
  const [correcting, setCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState("");

  async function compileCode(codeToCompile = sourceCode) {
    setLoading(true); setError(""); setCorrectionError(""); setCorrection(null);
    try {
      const response = await fetch(`${API_URL}/api/compile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: codeToCompile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Compilation request failed (${response.status})`);
      setResult(data);
      return data;
    } catch (err) {
      setError(`${err.message}. Make sure the backend is running at ${API_URL}.`);
      return null;
    } finally { setLoading(false); }
  }

  async function suggestCorrection() {
    setCorrecting(true); setCorrection(null); setCorrectionError(""); setError("");
    try {
      const response = await fetch(`${API_URL}/api/ai-correct`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: sourceCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Correction request failed (${response.status})`);
      setCorrection(data);
    } catch (err) { setCorrectionError(`${err.message}. Check the backend at ${API_URL}.`); }
    finally { setCorrecting(false); }
  }

  async function applyCorrection() {
    if (!correction?.corrected_code) return;
    const code = correction.corrected_code;
    setSourceCode(code);
    setCorrection(null);
    await compileCode(code);
  }

  const triangulation = result?.triangulation;
  const candidates = triangulation?.candidates || [];
  const syntaxDiagnostics = (result?.diagnostics || []).filter(item => item.phase === "syntax");
  const firstCandidate = candidates[0];
  const reportedDiagnostic = syntaxDiagnostics[0];
  const errorLine = reportedDiagnostic?.line ?? firstCandidate?.line;
  const errorColumn = reportedDiagnostic?.column ?? firstCandidate?.column;
  const lineCount = sourceCode.split("\n").length;
  const tokenCount = result?.tokens?.length ?? 0;
  const astStatementCount = result?.ast?.statements?.length ?? 0;

  const sections = useMemo(() => [
    { id: "triangulation", number: "1", title: "Syntax Error Triangulation", description: "Forward parser + backward structural evidence", icon: "◎" },
    { id: "ast", number: "2", title: "Abstract Syntax Tree (AST)", description: "Understand how the program is organized", icon: "⑂" },
    { id: "tokens", number: "3", title: "Tokens & Lexical Analysis", description: "The building blocks recognized by the lexer", icon: "▤" },
    { id: "trace", number: "4", title: "Parser Execution Trace", description: "Follow the parser's steps in order", icon: "☷" },
    { id: "recovery", number: "5", title: "Automatic Recovery & Suggested Fixes", description: "Review a proposed correction and its checks", icon: "⌁" },
    { id: "diagnostics", number: "6", title: "All Diagnostics & JSON", description: "Detailed compiler output for debugging", icon: "{}" },
  ], []);

  function navigate(id) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">&lt;/&gt;</div>
        <div><h1>SyntaxLab</h1><p>Custom Compiler</p></div>
      </div>
      <nav className="side-nav" aria-label="Workspace sections">
        <button className="nav-item" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>⌂ <span>Compiler Workspace</span></button>
        {sections.map(item => <button key={item.id} className={`nav-item ${activeSection === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>{item.icon}<span>{item.title}</span></button>)}
      </nav>
      <div className="quick-examples">
        <strong>Quick examples</strong>
        <button onClick={() => setSourceCode("int x = 10;\nprint(x + 2);")}>Valid program</button>
        <button onClick={() => setSourceCode("print(10 + 20;")}>Missing parenthesis</button>
        <button onClick={() => setSourceCode("int x = ;\nprint(x);")}>Missing expression</button>
        <button onClick={() => setSourceCode("print(10));")}>Extra parenthesis</button>
        <p>Choose an example, then compile to inspect the real output.</p>
      </div>
    </aside>

    <div className="main-area">
      <header className="topbar">
        <p>Syntax Error Triangulation Using Forward Parser and Backward Structural Evidence</p>
        <div className="top-actions">
          <button className="compile-button" onClick={() => compileCode()} disabled={loading || correcting || !sourceCode.trim()}>{loading ? "Compiling…" : "▶ Compile"}</button>
          <button className="top-link" onClick={() => navigate("recovery")}>⌁ Recovery</button>
          <button className="top-link" onClick={() => navigate("ast")}>⑂ AST</button>
        </div>
      </header>

      <div className="workspace-heading">
        <div><span className="eyebrow">COMPILER DESIGN PROJECT</span><h2>Investigate a syntax error</h2><p>See how parser feedback and structural evidence combine to rank likely error regions.</p></div>
      </div>

      <section className="top-grid">
        <div className="card editor-card">
          <div className="card-heading"><div><span className="eyebrow">SOURCE CODE</span><h3>Code editor</h3></div><button className="secondary-button" onClick={() => { setSourceCode(""); setResult(null); setCorrection(null); setError(""); }}>Clear</button></div>
          <textarea className="code-editor" value={sourceCode} onChange={e => { setSourceCode(e.target.value); setResult(null); setCorrection(null); setError(""); }} spellCheck="false" aria-label="Source code editor" placeholder="Write your program here…" />
          <div className="editor-footer"><span>{lineCount} lines</span><span>Custom C-like language</span></div>
          <div className="editor-actions"><button className="compile-button" onClick={() => compileCode()} disabled={loading || correcting || !sourceCode.trim()}>{loading ? "Compiling…" : "▶ Compile & Analyze"}</button><button className="secondary-button" onClick={suggestCorrection} disabled={loading || correcting || !sourceCode.trim()}>{correcting ? "Analyzing…" : "Suggest correction"}</button></div>
          {error && <div className="error-banner">{error}</div>}
        </div>
        <div className={`card compile-status ${result?.success ? "compile-success" : result ? "compile-failed" : ""}`}>
          <div className="status-head"><span className="status-symbol">{result ? (result.success ? "✓" : "×") : "○"}</span><div><h3>{!result ? "Ready to compile" : result.success ? "Compilation successful" : "Compilation failed"}</h3><p>{!result ? "Run the compiler to see diagnostics and structural analysis." : result.success ? "No compilation errors were reported." : "Syntax diagnostics are available below. Triangulation adds supporting evidence."}</p></div></div>
          <div className="status-metrics">
            <div><span>Error line</span><strong>{errorLine ?? "—"}</strong></div>
            <div><span>Error column</span><strong>{errorColumn ?? "—"}</strong></div>
            <div><span>Triangulation</span><strong className={`status-${triangulation?.status || "waiting"}`}>{triangulation?.status || "Waiting"}</strong></div>
          </div>
          <div className="mini-metrics"><span><strong>{tokenCount}</strong> tokens</span><span><strong>{astStatementCount}</strong> AST statements</span><span><strong>{result?.trace?.length ?? 0}</strong> trace events</span></div>
        </div>
      </section>

      <div className="section-list">
        {sections.map(item => <Accordion key={item.id} id={item.id} number={item.number} title={item.title} description={item.description} icon={item.icon} open={activeSection === item.id} onToggle={() => setActiveSection(activeSection === item.id ? "" : item.id)}>
          {item.id === "triangulation" && <div className="triangulation-view">
            <div className="feature-intro"><span className="feature-pill">CORE PROJECT FEATURE</span><p>Triangulation compares two kinds of evidence. The parser reports where it failed; the backward scan looks for structural clues that may explain why.</p></div>
            {!result && <div className="empty-state"><strong>Compile a program to begin</strong><p>Try the “Missing parenthesis” example in the sidebar to see the analysis.</p></div>}
            {result && <>
              <div className="evidence-flow">
                <article className="evidence-card forward"><span className="step-number">1</span><div><h4>Forward parser diagnosis</h4><p>Where parsing failed</p><div className="evidence-result">{syntaxDiagnostics.length ? syntaxDiagnostics[0].message : result.success ? "No syntax diagnostic reported." : "No syntax-phase diagnostic returned."}<small>{errorLine ? `Line ${errorLine}, column ${errorColumn}` : "Location unavailable"}</small></div></div></article>
                <span className="flow-arrow">→</span>
                <article className="evidence-card backward"><span className="step-number">2</span><div><h4>Backward structural evidence</h4><p>Structural clues from the token stream</p><div className="evidence-result">{candidates.flatMap(c => c.evidence || []).find(text => /Backward scan/i.test(text)) || "No unmatched-parenthesis evidence was returned."}<small>Evidence is limited to structures currently checked by the compiler.</small></div></div></article>
                <span className="flow-arrow">→</span>
                <article className="evidence-card fusion"><span className="step-number">3</span><div><h4>Evidence fusion</h4><p>Combine and rank source regions</p><div className="evidence-result"><strong>{triangulation?.status || "Unavailable"}</strong><small>{triangulation?.summary || "No triangulation summary returned."}</small></div></div></article>
              </div>
              <div className="candidate-layout">
                <div className="subcard"><div className="subcard-heading"><div><h4>Ranked candidate regions</h4><p>Ordered by the compiler's heuristic score—not a probability.</p></div><span className="count-pill">{candidates.length} candidates</span></div>
                  {candidates.length ? <div className="candidate-list">{candidates.map((candidate, i) => <article className={`candidate-row ${i === 0 ? "candidate-top" : ""}`} key={`${candidate.line}-${candidate.column}-${i}`}><span className="rank-number">{i + 1}</span><div className="candidate-main"><strong>Lines {candidate.start_line}–{candidate.end_line}</strong><p>Reported position: line {candidate.line}, column {candidate.column}</p><ul>{(candidate.evidence || []).map((ev, j) => <li key={j}>{ev}</li>)}</ul></div><span className="score-chip">Score {candidate.score}</span></article>)}</div> : <p className="muted">No candidate regions were returned.</p>}
                </div>
                <div className="subcard context-card"><h4>Why this result?</h4><pre className="code-context">{sourceCode.split("\n").map((line, i) => `${String(i + 1).padStart(2, " ")}  ${line}`).join("\n")}</pre><ul className="explain-list"><li>Parser feedback identifies the point where the grammar was violated.</li><li>Structural evidence can support or contradict a candidate region.</li><li>A “supported” status means evidence converged; it does not prove the exact intended fix.</li></ul></div>
              </div>
              <p className="honesty-note">Current scope: backward structural analysis checks parentheses. Scores are heuristic ranking values, not confidence probabilities, and this panel does not itself repair code.</p>
            </>}
          </div>}

          {item.id === "ast" && <div className="ast-view">
            {!result?.ast ? <p className="muted">Compile a program that produces an AST to inspect its structure. Invalid input may produce no complete AST.</p> : <>
              <div className="view-tabs"><button className={astView === "tree" ? "selected" : ""} onClick={() => setAstView("tree")}>Tree view</button><button className={astView === "indent" ? "selected" : ""} onClick={() => setAstView("indent")}>Indented view</button><button className={astView === "guide" ? "selected" : ""} onClick={() => setAstView("guide")}>Beginner guide</button></div>
              {astView === "tree" && <div className="ast-canvas"><AstTree node={result.ast} /></div>}
              {astView === "indent" && <div className="indent-tree"><IndentedAst node={result.ast} /></div>}
              {astView === "guide" && <div className="guide-grid"><article><strong>Program</strong><p>The root node represents the whole program.</p></article><article><strong>Statement nodes</strong><p>Represent actions such as declarations and print statements.</p></article><article><strong>Expression nodes</strong><p>Represent calculations, operators, and their operands.</p></article><article><strong>Leaf nodes</strong><p>Values such as identifiers and numbers that have no children.</p></article><p className="muted">The actual node names and fields shown in the tree come from the AST returned by the compiler.</p></div>}
            </>}
          </div>}

          {item.id === "tokens" && <div className="data-panel">{result?.tokens?.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Token type</th><th>Value</th><th>Line</th><th>Column</th></tr></thead><tbody>{result.tokens.map((token, i) => <tr key={`${token.line}-${token.column}-${i}`}><td>{i + 1}</td><td><code className="token-type">{token.type}</code></td><td><code>{token.value}</code></td><td>{token.line}</td><td>{token.column}</td></tr>)}</tbody></table></div> : <p className="muted">Compile a program to inspect the lexer tokens.</p>}</div>}

          {item.id === "trace" && <div className="data-panel">{result?.trace?.length ? <div className="trace-list">{result.trace.map((event, i) => <article className="trace-event" key={`${event.line}-${event.column}-${i}`}><span className="trace-index">{String(i + 1).padStart(2, "0")}</span><div><strong>{event.rule}</strong><p>{event.detail || "Parser rule recognized."}</p><small>Line {event.line}, column {event.column}</small></div></article>)}</div> : <p className="muted">No parser trace returned. Compile your source to inspect parser steps.</p>}</div>}

          {item.id === "recovery" && <div className="data-panel recovery-panel"><div className="recovery-intro"><h4>Suggested correction</h4><p>Request a correction from the backend, review it, then apply it only if you choose to.</p><button className="compile-button" onClick={suggestCorrection} disabled={loading || correcting || !sourceCode.trim()}>{correcting ? "Analyzing…" : "Suggest correction"}</button></div>
            {correctionError && <div className="error-banner">{correctionError}</div>}
            {correction && <div className="correction-result"><h4>Explanation</h4><p>{correction.explanation || "No explanation returned."}</p><div className={`intent-status intent-${correction.intent_status || "inconclusive"}`}><strong>Intent preservation: </strong>{correction.intent_status || "inconclusive"}</div>{correction.suggestions?.length > 0 && <ul>{correction.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>}{correction.corrected_code ? <><h4>Proposed code</h4><pre className="json-view">{correction.corrected_code}</pre><button className="compile-button" onClick={applyCorrection} disabled={loading}>Apply correction & recompile</button></> : <p className="muted">No corrected code was provided. Review the suggestions and edit manually.</p>}{correction.ast_differences?.length > 0 && <details><summary>AST differences</summary><ul>{correction.ast_differences.map((d, i) => <li key={i}>{d}</li>)}</ul></details>}<p className="honesty-note">Review suggested code carefully. A successful parse does not guarantee the program matches your intent.</p></div>}
          </div>}

          {item.id === "diagnostics" && <div className="data-panel"><h4>Diagnostics</h4>{result?.diagnostics?.length ? result.diagnostics.map((d, i) => <article className="diagnostic" key={i}><div className="diagnostic-top"><span>{d.phase}</span><span>Line {d.line}, column {d.column}</span></div><p>{d.message}</p></article>) : <p className="muted">{result ? "No diagnostics reported." : "Compile code to see diagnostics."}</p>}{result && <details className="raw-output"><summary>View complete JSON response</summary><pre className="json-view">{JSON.stringify(result, null, 2)}</pre></details>}</div>}
        </Accordion>)}
      </div>
      <footer className="footer">SyntaxLab · Lexer · Parser · Syntax Error Triangulation</footer>
    </div>
  </main>;
}
