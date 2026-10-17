
import { useState } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

const starterCode = `int main() {
    int x = 10;
    return x;
}`;

const resultTabs = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'parseTree', label: 'Parse Tree' },
  { id: 'symbolTable', label: 'Symbol Table' },
  { id: 'intermediateCode', label: 'Intermediate Code' },
];

function App() {
  const [code, setCode] = useState(starterCode);
  const [stdin, setStdin] = useState('');
  const [activeTab, setActiveTab] = useState('tokens');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('idle');

  const resetEditor = () => {
    setCode(starterCode);
    setStdin('');
    setResults(null);
    setStatus('idle');
  };

  // Demo only. Replace this with a request to the compiler API later.
  const handleAnalyze = () => {
    if (!code.trim()) {
      setStatus('error');
      setResults({
        message: 'Enter source code before starting analysis.',
      });
      return;
    }

    setStatus('demo');
    setResults({
      message:
        'Demo mode: the backend is not connected. These are not real compiler results.',
      sourceLength: code.length,
      inputLength: stdin.length,
    });
  };

  const renderResult = () => {
    if (!results) {
      return (
        <div className="empty-state">
          <span className="empty-icon">&lt;/&gt;</span>
          <h3>No analysis results yet</h3>
          <p>Enter source code and select Analyze to begin.</p>
        </div>
      );
    }

    if (status === 'error') {
      return <p className="error-message">{results.message}</p>;
    }

    if (activeTab === 'tokens') {
      return (
        <div className="result-message">
          <p>{results.message}</p>
          <p>Source characters: {results.sourceLength}</p>
          <p>Input characters: {results.inputLength}</p>
          <p>
            Real token data will appear here after connecting the lexer API.
          </p>
        </div>
      );
    }

    const descriptions = {
      parseTree: 'The parser response or syntax tree will appear here.',
      symbolTable: 'The symbol table returned by the compiler will appear here.',
      intermediateCode:
        'Generated intermediate code will appear here.',
    };

    return (
      <div className="result-message">
        <p>{results.message}</p>
        <p>{descriptions[activeTab]}</p>
        <p>Waiting for backend integration.</p>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">&lt;/&gt;</div>
          <div>
            <h1>CodeForge</h1>
            <p>Compiler Workbench</p>
          </div>
        </div>

        <div className="status">
          <span className="status-dot" />
          {status === 'demo'
            ? 'Demo mode'
            : status === 'error'
              ? 'Input required'
              : 'Workspace ready'}
        </div>
      </header>

      <main className="workspace">
        <section className="editor-panel">
          <div className="panel-header">
            <div className="file-name">
              <span className="file-icon">●</span>
              main.c
            </div>

            <button className="secondary-button" onClick={resetEditor}>
              Reset
            </button>

            <button className="run-button" onClick={handleAnalyze}>
              ▶ Analyze
            </button>
          </div>

          <div className="editor-container">
            <Editor
              height="100%"
              language="c"
              theme="vs-dark"
              value={code}
              onChange={(value) => {
                setCode(value ?? '');
                setStatus('idle');
                setResults(null);
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 18 },
                tabSize: 4,
              }}
            />
          </div>

          <div className="stdin-section">
            <label htmlFor="stdin">
              <span>⌨</span> Program Input (stdin)
            </label>
            <textarea
              id="stdin"
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              placeholder={'Enter input here, for example:\n10\n20'}
              rows={3}
            />
            <p>Available for integration with a future execution API.</p>
          </div>

          <footer className="editor-footer">
            <span>Language: C</span>
            <span>{code.split('\n').length} lines</span>
          </footer>
        </section>

        <section className="output-panel">
          <div className="output-header">
            <div>
              <span className="terminal-icon">&gt;_</span>
              <h2>Compiler Results</h2>
            </div>
            <span className="demo-badge">DEMO</span>
          </div>

          <div className="result-tabs" role="tablist" aria-label="Compiler stages">
            {resultTabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`result-tab ${
                  activeTab === tab.id ? 'active' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="result-content" role="tabpanel">
            {renderResult()}
          </div>

          <div className="result-footer">
            <span>
              {status === 'demo'
                ? 'Sample interface only'
                : 'Waiting for analysis'}
            </span>
            <span>Compiler API: not connected</span>
          </div>
        </section>
      </main>

      <footer className="page-footer">
        <span>CodeForge · Custom Compiler Project</span>
        <span>React + Monaco Editor</span>
      </footer>
    </div>
  );
}

export default App;
