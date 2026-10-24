import { Play } from "lucide-react";
import type { ReactNode } from "react";
import { useProject, type RunKind } from "../app/ProjectContext";
import { Banner, EmptyState, ErrorBanner, Spinner } from "./ui";

/** Shows loading / error / empty / stale states around a view that needs a real run. */
export function RunGate({ kind, has, children, what }: { kind: RunKind; has: boolean; children: ReactNode; what: string }) {
  const p = useProject();
  const run = kind === "lex" ? p.runLex : kind === "parse" ? () => p.runParse(true) : p.runRepair;
  const result = kind === "lex" ? p.lex : kind === "parse" ? p.parse : p.repair;
  const err = p.errors[kind];
  if (err && !has) return <ErrorBanner error={err} onRetry={run} />;
  if (!has) {
    if (p.running[kind]) return <div className="panel panel-body"><Spinner label={`Running the ${what}…`} /></div>;
    return (
      <div className="panel">
        <EmptyState
          icon={Play}
          title={`No ${what} result yet`}
          action={
            <button className="btn primary" onClick={run}>
              <Play size={14} aria-hidden /> Run {what}
            </button>
          }
        >
          Results are produced by the real compiler for the source currently in the editor ({p.origin.label}).
        </EmptyState>
      </div>
    );
  }
  return (
    <>
      {err && <ErrorBanner error={err} onRetry={run} />}
      {p.isStale(result) && (
        <Banner
          tone="warning"
          title="The source changed since this result was computed"
          actions={
            <button className="btn sm" onClick={run} disabled={p.running[kind]}>
              {p.running[kind] ? "Running…" : "Re-run"}
            </button>
          }
        >
          The views below still describe the earlier version of the program.
        </Banner>
      )}
      {children}
    </>
  );
}
