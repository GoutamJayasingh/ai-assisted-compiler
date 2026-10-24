import { inlineChange, lineDiff } from "../lib/diff";

/** Unified line diff with inline change marks for single-line edits. */
export function SourceDiff({ before, after, maxHeight = 420 }: { before: string; after: string; maxHeight?: number }) {
  const lines = lineDiff(before, after);
  const changed = lines.filter((l) => l.kind !== "same").length;
  // Pair the k-th deleted line of a change block with its k-th added line.
  const partner = new Map<number, number>();
  for (let i = 0; i < lines.length; ) {
    if (lines[i].kind === "same") { i++; continue; }
    const dels: number[] = [], adds: number[] = [];
    while (i < lines.length && lines[i].kind !== "same") (lines[i].kind === "del" ? dels : adds).push(i++);
    for (let k = 0; k < Math.min(dels.length, adds.length); k++) { partner.set(dels[k], adds[k]); partner.set(adds[k], dels[k]); }
  }
  return (
    <div className="diff" style={{ maxHeight }} aria-label="Source differences">
      {changed === 0 && <div className="small muted" style={{ padding: 8 }}>No textual difference.</div>}
      {lines.map((l, i) => {
        const pi = partner.get(i);
        const pair = pi !== undefined ? lines[pi] : null;
        let content: React.ReactNode = l.text || " ";
        if (pair) {
          const [a, b] = l.kind === "del" ? [l.text, pair.text] : [pair.text, l.text];
          const c = inlineChange(a, b);
          const end = l.kind === "del" ? c.suffixA : c.suffixB;
          content = (
            <>
              {l.text.slice(0, c.prefix)}
              <span className="diff-mark">{l.text.slice(c.prefix, end)}</span>
              {l.text.slice(end)}
            </>
          );
        }
        return (
          <div key={i} className={`diff-line ${l.kind}`}>
            <span className="ln">{l.a ?? ""}</span>
            <span className="ln">{l.b ?? ""}</span>
            <span className="sign">{l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}</span>
            <span>{content}</span>
          </div>
        );
      })}
    </div>
  );
}
