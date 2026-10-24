import { ArrowRight, CheckCircle2, CircleDashed, GitBranch, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useProject } from "../../app/ProjectContext";
import { RunGate } from "../../components/RunGate";
import { SourceDiff } from "../../components/SourceDiff";
import { Badge, Banner, EmptyState, Panel, StatusBadge } from "../../components/ui";
import { num } from "../../lib/format";
import { formatPos } from "../../lib/positions";
import type { LaneLeaf } from "../../types/api";

export function HypothesesPage() {
  const p = useProject();
  const doc = p.repair?.envelope.data;
  const r = doc?.repair;
  const [selLeaf, setSelLeaf] = useState<number | null>(null);
  useEffect(() => setSelLeaf(r?.decision.recommended_leaf ?? null), [r]);

  const byRoot = useMemo(() => {
    const m = new Map<number, LaneLeaf[]>();
    for (const l of r?.hypotheses.leaves ?? []) m.set(l.root_class, [...(m.get(l.root_class) ?? []), l]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [r]);
  const leaf = r?.hypotheses.leaves.find((l) => l.id === selLeaf) ?? null;
  const reps = new Map((r?.candidates ?? []).map((c) => [c.id, c]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hypothesis explorer</h1>
          <p>Each lane starts from a structurally distinct repair of the first error and keeps repairing later errors (bounded depth and leaves). Comparing lanes shows which follow-on diagnostics persist regardless of the first repair and which appear only under one hypothesis.</p>
        </div>
        <button className="btn primary" onClick={p.runRepair} disabled={p.running.repair}>
          <GitBranch size={14} aria-hidden /> {p.running.repair ? "Exploring…" : "Run repair"}
        </button>
      </div>
      <RunGate kind="repair" has={!!doc} what="repair engine">
        {r && (
          r.decision.status === "NO_REPAIR_NEEDED" ? (
            <Panel><EmptyState icon={CheckCircle2} title="No hypotheses needed">The program parses, so there is nothing to explore. Load a sample with errors (e.g. “Two errors”).</EmptyState></Panel>
          ) : (
            <>
              <Banner tone="neutral" title={<span className="row"><StatusBadge status={r.decision.status} /> {r.hypotheses.leaves.length} leaves from {byRoot.length} root hypotheses</span>}>
                Limits: {String(r.config.lane_roots)} root hypotheses, {String(r.config.lane_branch)} alternatives per later step, depth ≤ {String(r.config.max_depth)}, ≤ {String(r.config.max_leaves)} leaves.
                {r.hypotheses.truncated && <strong> Search limits were reached: some branches were not explored.</strong>}
              </Banner>
              <Panel title="Lanes" icon={GitBranch}>
                {byRoot.length === 0 ? (
                  <EmptyState title="No lanes">No candidate was accepted, so no hypothesis could be explored.</EmptyState>
                ) : (
                  <div className="lanes">
                    {byRoot.map(([root, leaves]) => {
                      const cls = r.classes.find((k) => k.id === root);
                      const rep = cls ? reps.get(cls.representative) : undefined;
                      return (
                        <div key={root} className="stack">
                          {leaves.map((l, li) => (
                            <div className="lane" key={l.id}>
                              <div className="lane-head">
                                {li === 0 ? (
                                  <>
                                    <div className="row"><strong>Hypothesis {root}</strong>{root === 0 && <Badge tone="accent" icon={false}>best</Badge>}</div>
                                    <div className="tiny muted">score {num(rep?.score)} · class size {cls?.size ?? "?"}</div>
                                  </>
                                ) : (
                                  <div className="tiny muted">branch {li + 1} of hypothesis {root}</div>
                                )}
                              </div>
                              <div className="lane-steps" role="list">
                                {l.steps.map((s, i) => (
                                  <div key={i} style={{ display: "flex" }} role="listitem">
                                    {i > 0 && <div className="lane-arrow"><ArrowRight size={16} aria-hidden /></div>}
                                    <div className="lane-step">
                                      <div className="tiny faint">step {s.depth + 1} · error at {formatPos(s.error.at)} “{s.error.token}”</div>
                                      <div className="mono small" style={{ margin: "4px 0" }}>{s.summary}</div>
                                      <div className="tiny muted">
                                        {s.alternatives} distinct alternative{s.alternatives === 1 ? "" : "s"}
                                        {s.margin !== null && ` · margin ${num(s.margin)}`}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <div className="lane-arrow"><ArrowRight size={16} aria-hidden /></div>
                                <button
                                  className={`lane-step lane-end ${selLeaf === l.id ? "sel" : ""}`}
                                  style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", borderColor: selLeaf === l.id ? "var(--accent)" : undefined }}
                                  onClick={() => setSelLeaf(l.id)}
                                  aria-pressed={selLeaf === l.id}
                                >
                                  <div className="row">
                                    {l.valid ? <Badge tone="success">valid program</Badge> : <Badge tone="warning" icon={false}><CircleDashed size={12} aria-hidden /> {l.stop_reason}</Badge>}
                                    {l.id === r.decision.recommended_leaf && <Star size={14} aria-label="Top plan" className="muted" />}
                                  </div>
                                  <div className="tiny muted" style={{ marginTop: 4 }}>total cost {l.total_cost}</div>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
              <div className="split">
                <Panel title="Follow-on diagnostics across hypotheses">
                  {r.hypotheses.stability.length === 0 ? (
                    <p className="muted small">No follow-on diagnostics: every explored hypothesis repairs the program in one step, or only one hypothesis exists.</p>
                  ) : (
                    <div className="stack">
                      <table className="table">
                        <thead><tr><th>Diagnostic site</th><th>Token</th><th>Seen in</th><th>Classification</th></tr></thead>
                        <tbody>
                          {r.hypotheses.stability.map((s) => (
                            <tr key={s.token_index}>
                              <td className="mono">{formatPos(s.at)}</td>
                              <td className="mono">{s.token}</td>
                              <td>{s.hypotheses_with} / {s.hypotheses_total}</td>
                              <td>{s.stable ? <Badge tone="info">stable across tested hypotheses</Badge> : <Badge tone="warning">hypothesis-dependent</Badge>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="tiny faint">
                        “Stable” means the error site was met on the best path (or left by panic-mode recovery) of every explored hypothesis. It is evidence that the later error is not an artefact of the first repair, not proof that it is independent: only the tested hypotheses were compared.
                      </p>
                    </div>
                  )}
                </Panel>
                <Panel title={leaf ? `Leaf ${leaf.id}: resulting program` : "Leaf program"}>
                  {leaf ? (
                    <div className="stack">
                      <div className="small">{leaf.valid ? <Badge tone="success">parses completely</Badge> : <Badge tone="warning">stopped: {leaf.stop_reason}</Badge>} · {leaf.steps.length} step(s), total cost {leaf.total_cost}</div>
                      <SourceDiff before={p.repair!.source} after={leaf.source} maxHeight={360} />
                    </div>
                  ) : (
                    <p className="muted small">Select a lane's end card.</p>
                  )}
                </Panel>
              </div>
            </>
          )
        )}
      </RunGate>
    </>
  );
}
