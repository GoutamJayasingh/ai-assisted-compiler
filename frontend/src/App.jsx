
import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";

const STARTER_CODE = `int x = 10;
print(x + 2);`;

// Recursively display the compiler's AST as a visual tree.

function AstTree({ node, edgeLabel }) {
  if (node == null) return null;

  if (typeof node !== "object") {
    return (
      <div className="ast-node ast-leaf">
        <div className="ast-card ast-value-card">
          <span className="ast-kind">Value</span>
          <strong>{String(node)}</strong>
        </div>
      </div>
    );
  }

  if (Array.isArray(node)) {
    return (
      <div className="ast-forest">
        {node.map((child, index) => (
          <AstTree key={index} node={child} edgeLabel={index} />
        ))}
      </div>
    );
  }

  const entries = Object.entries(node);

  const properties = entries.filter(
    ([key, value]) =>
      key !== "type" &&
      key !== "kind" &&
      value !== null &&
      typeof value !== "object"
  );

  const children = entries.filter(
    ([, value]) => value !== null && typeof value === "object"
  );

  const rawType = String(node.type || node.kind || "Node");
  const normalizedType = rawType.toLowerCase();

  let nodeClass = "ast-generic";

  if (
    normalizedType.includes("program") ||
    normalizedType.includes("root")
  ) {
    nodeClass = "ast-program";
  } else if (
    normalizedType.includes("declaration") ||
    normalizedType.includes("statement") ||
    normalizedType.includes("print") ||
    normalizedType.includes("assign")
  ) {
    nodeClass = "ast-statement";
  } else if (
    normalizedType.includes("binary") ||
    normalizedType.includes("expression") ||
    normalizedType.includes("operator")
  ) {
    nodeClass = "ast-operator";
  } else if (
    normalizedType.includes("number") ||
    normalizedType.includes("integer") ||
    normalizedType.includes("literal") ||
    normalizedType.includes("identifier") ||
    normalizedType.includes("variable")
  ) {
    nodeClass = "ast-value-node";
  }

  return (
    <div className="ast-node">
      {edgeLabel !== undefined && (
        <div className="ast-edge-label">{String(edgeLabel)}</div>
      )}

      <div className={`ast-card ${nodeClass}`}>
        <span className="ast-kind">{rawType}</span>

        {properties.map(([key, value]) => (
          <div className="ast-property" key={key}>
            <span>{key}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>

      {children.length > 0 && (
        <div className="ast-children">
          {children.map(([key, value]) => (
            <div className="ast-child" key={key}>
              <AstTree node={value} edgeLabel={key} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [sourceCode, setSourceCode] = useState(STARTER_CODE);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState(null);
  const [correctionError, setCorrectionError] = useState("");

  async function compileCode(codeToCompile = sourceCode) {
    setLoading(true);
    setError("");
    setCorrectionError("");
    setCorrection(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: codeToCompile }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Compilation request failed (${response.status})`
        );
      }

      setResult(data);
      return data;
    } catch (err) {
      setError(
        `${err.message}. Make sure FastAPI is running at ${API_URL}.`
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  
  async function suggestCorrection() {
    setCorrecting(true);
    setCorrection(null);
    setCorrectionError("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/ai-correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: sourceCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `AI correction request failed (${response.status})`
        );
      }

      setCorrection(data);
    } catch (err) {
      setCorrectionError(
        `${err.message}. Check that the backend is running at ${API_URL}.`
      );
    } finally {
      setCorrecting(false);
    }
  }


  async function applyCorrection() {
    if (!correction?.corrected_code) return;

    const correctedCode = correction.corrected_code;

    setSourceCode(correctedCode);
    setCorrection(null);
    await compileCode(correctedCode);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">&lt;/&gt;</div>
          <div>
            <h1>SyntaxLab</h1>
            <p>AI-Assisted Compiler</p>
          </div>
        </div>

        <span className="status">
          <span className="status-dot" />
          Compiler workspace
        </span>
      </header>

      <section className="intro">
        <p className="eyebrow">COMPILER DESIGN PROJECT</p>
        <h2>Write code. Find errors. Understand syntax.</h2>
        <p>
          Compile your program and explore lexical tokens, the abstract
          syntax tree, and semantic or syntax diagnostics.
        </p>
      </section>

      <section className="workspace">
        <div className="panel editor-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">SOURCE CODE</span>
              <h3>Code editor</h3>
            </div>
            <span className="language-tag">Custom C-like</span>
          </div>

          <textarea
            className="code-editor"
            value={sourceCode}
            onChange={(event) => {
              setSourceCode(event.target.value);
              setCorrection(null);
              setCorrectionError("");
              setError("");
            }}
            spellCheck="false"
            aria-label="Source code editor"
            placeholder="Write your program here..."
          />

          <div className="editor-footer">
            <span>{sourceCode.split("\n").length} lines</span>

            <div className="editor-actions">
              <button
                className="compile-button"
                onClick={() => compileCode()}
                disabled={
                  loading || correcting || !sourceCode.trim()
                }
              >
                {loading ? "Compiling..." : "▶ Compile code"}
              </button>

              <button
                className="correction-button"
                onClick={suggestCorrection}
                disabled={
                  loading || correcting || !sourceCode.trim()
                }
              >
                {correcting ? "AI is analyzing..." : "✦ AI Correction"}
              </button>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {correctionError && (
            <div className="error-banner">{correctionError}</div>
          )}

          {correction && (
            <section className="correction-panel">
              <h3>Code Correction Suggestions</h3>

              <p>{correction.explanation}</p>

              <div className={`intent-status intent-${correction.intent_status || "inconclusive"}`}>
                <strong>Intent Preservation Check: </strong>
                {correction.intent_status === "preserved"
                  ? "Preserved — the normalized AST fingerprints match."
                  : correction.intent_status === "changed"
                    ? "Potentially changed — the AST fingerprints differ. Review the differences."
                    : "Inconclusive — a reliable original AST was unavailable for comparison."}
              </div>

              {correction.original_fingerprint && (
                <details className="fingerprint-details">
                  <summary>View AST fingerprints and comparison</summary>
                  <p><strong>Original:</strong> <code>{correction.original_fingerprint}</code></p>
                  <p><strong>Corrected:</strong> <code>{correction.corrected_fingerprint || "Unavailable"}</code></p>
                  {correction.ast_differences?.length > 0 && (
                    <ul>
                      {correction.ast_differences.map((difference, index) => (
                        <li key={index}>{difference}</li>
                      ))}
                    </ul>
                  )}
                </details>
              )}

              {correction.suggestions?.length > 0 && (
                <ul>
                  {correction.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              )}

              {correction.corrected_code ? (
                <>
                  <h4>Proposed corrected code</h4>

                  <pre className="json-view">
                    {correction.corrected_code}
                  </pre>

                  <button
                    className="correction-button"
                    onClick={applyCorrection}
                    disabled={loading || correcting}
                  >
                    Apply correction and recompile
                  </button>
                </>
              ) : (
                <p className="muted">
                  No corrected code was provided. Review the
                  suggestions and edit your code manually.
                </p>
              )}

              <p className="muted">
                Suggested corrections may be incorrect. Always review
                the code and check the compiler results.
              </p>
            </section>
          )}
        </div>

        <div className="panel results-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">COMPILER OUTPUT</span>
              <h3>Results</h3>
            </div>

            {result && (
              <span
                className={
                  result.success ? "badge success" : "badge failure"
                }
              >
                {result.success ? "No errors" : "Errors found"}
              </span>
            )}
          </div>

          {!result && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">⌘</div>
              <h4>Ready to compile</h4>
              <p>
                Your tokens, syntax tree, and diagnostics will appear here.
              </p>
            </div>
          )}

          {loading && (
            <p className="loading-text">Running compiler...</p>
          )}

          {result && (
            <div className="result-content">
              <div className="summary-grid">
                <div className="summary-card">
                  <span>Tokens</span>
                  <strong>{result.tokens?.length ?? 0}</strong>
                </div>

                <div className="summary-card">
                  <span>Statements</span>
                  <strong>
                    {result.ast?.statements?.length ?? 0}
                  </strong>
                </div>

                <div className="summary-card">
                  <span>Diagnostics</span>
                  <strong>{result.diagnostics?.length ?? 0}</strong>
                </div>
              </div>

              <section className="output-section">
                <h4>Compilation & Error Recovery</h4>
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>Parser Recovery</span>
                    <strong>
                      {result.recovered ? "Recovered" : result.success ? "Clean" : "Not recovered"}
                    </strong>
                  </div>
                  <div className="summary-card">
                    <span>Trace Events</span>
                    <strong>{result.trace?.length ?? 0}</strong>
                  </div>
                </div>
                <p className="muted">
                  Recovery allows the parser to continue after a syntax error
                  and preserve later valid statements when possible.
                </p>
              </section>

              <section className="output-section">
                <h4>Parser Execution Trace</h4>
                {result.trace?.length ? (
                  <div className="trace-list">
                    {result.trace.map((event, index) => (
                      <div className="trace-event" key={`${event.line}-${event.column}-${index}`}>
                        <span className="trace-index">{String(index + 1).padStart(2, "0")}</span>
                        <div className="trace-body">
                          <code>{event.rule}</code>
                          <p>{event.detail || "Parser rule recognized"}</p>
                          <span className="trace-location">
                            Line {event.line}, column {event.column}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    No parser trace returned. Compile your source to inspect parser steps.
                  </p>
                )}
              </section>

              <section className="output-section">
                <h4>Lexical Tokens</h4>

                {result.tokens?.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Value</th>
                          <th>Line</th>
                          <th>Column</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.tokens.map((token, index) => (
                          <tr
                            key={`${token.line}-${token.column}-${index}`}
                          >
                            <td>
                              <code className="token-type">
                                {token.type}
                              </code>
                            </td>
                            <td>
                              <code>{token.value}</code>
                            </td>
                            <td>{token.line}</td>
                            <td>{token.column}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">No tokens returned.</p>
                )}
              </section>

              <section className="output-section">
                <h4>Abstract Syntax Tree</h4>

                {result.ast ? (
                  <div className="ast-tree">
                    <AstTree node={result.ast} />
                  </div>
                ) : (
                  <p className="muted">No syntax tree returned.</p>
                )}
              </section>

              {result.triangulation && (
                <section className="output-section">
                  <h4>Syntax Error Triangulation</h4>

                  <div
                    className={`triangulation-summary triangulation-${result.triangulation.status || "inconclusive"}`}
                  >
                    <div className="triangulation-status">
                      <span>Status</span>
                      <strong>{result.triangulation.status || "inconclusive"}</strong>
                    </div>
                    <p>
                      {result.triangulation.summary ||
                        "No triangulation summary was returned."}
                    </p>
                  </div>

                  {result.triangulation.candidates?.length ? (
                    <div className="triangulation-candidates">
                      {result.triangulation.candidates.map((candidate, index) => (
                        <article className="triangulation-candidate" key={`${candidate.line}-${candidate.column}-${index}`}>
                          <div className="triangulation-candidate-heading">
                            <strong>Candidate {index + 1}</strong>
                            <span>Heuristic score: {candidate.score}</span>
                          </div>
                          <p className="triangulation-location">
                            Likely region: lines {candidate.start_line}–{candidate.end_line};
                            reported location: line {candidate.line}, column {candidate.column}
                          </p>
                          {candidate.evidence?.length ? (
                            <ul>
                              {candidate.evidence.map((item, evidenceIndex) => (
                                <li key={evidenceIndex}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="muted">No evidence details were returned.</p>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      No candidate regions were identified by the triangulation pass.
                    </p>
                  )}

                  <p className="muted triangulation-note">
                    Candidate ranking is heuristic; it suggests a likely region and does not guarantee the exact fault location.
                  </p>
                </section>
              )}

              <section className="output-section">
                <h4>Diagnostics</h4>

                {result.diagnostics?.length ? (
                  result.diagnostics.map((diagnostic, index) => (
                    <div className="diagnostic" key={index}>
                      <div className="diagnostic-top">
                        <span className="diagnostic-phase">
                          {diagnostic.phase}
                        </span>

                        <span>
                          Line {diagnostic.line}, column {diagnostic.column}
                        </span>
                      </div>

                      <p>{diagnostic.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="success-message">
                    ✓ No diagnostics reported.
                  </p>
                )}
              </section>

              <details className="raw-output">
                <summary>View complete JSON response</summary>

                <pre className="json-view">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        SyntaxLab · Lexer · Parser · Semantic Analysis · AI Correction
      </footer>
    </main>
  );
}
