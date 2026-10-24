import { useState } from "react";
import type { AstNode } from "../types/api";

export function nodeLabelAttrs(n: AstNode): string {
  const parts: string[] = [];
  if (n.type) parts.push(`type=${n.type}`);
  if (n.name) parts.push(`name=${n.name}`);
  if (n.op) parts.push(`op=${n.op}`);
  if (n.value) parts.push(`value=${n.value}`);
  if (n.array) parts.push(`array=${n.array}`);
  return parts.join(" ");
}

interface Props {
  root: AstNode;
  selected?: string | null;
  onSelect?: (node: AstNode, path: string) => void;
  expandDepth?: number;
}

/** Expandable AST view. Paths are "0/2/1" child-index strings. */
export function AstTree({ root, selected, onSelect, expandDepth = 4 }: Props) {
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const flip = (p: string) =>
    setToggled((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const render = (n: AstNode, path: string, depth: number) => {
    const hasKids = n.children.length > 0;
    const defaultOpen = depth < expandDepth;
    const open = toggled.has(path) ? !defaultOpen : defaultOpen;
    return (
      <li key={path}>
        <button className="twisty" aria-label={open ? "Collapse" : "Expand"} onClick={() => hasKids && flip(path)} tabIndex={hasKids ? 0 : -1} aria-expanded={hasKids ? open : undefined}>
          {hasKids ? (open ? "▾" : "▸") : "·"}
        </button>
        <span
          role="treeitem"
          aria-selected={selected === path}
          tabIndex={0}
          className={`node ${selected === path ? "sel" : ""}`}
          onClick={() => onSelect?.(n, path)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.(n, path);
            }
          }}
          title={`${n.span.start.line}:${n.span.start.column} – ${n.span.end.line}:${n.span.end.column}`}
        >
          <span className="kind">{n.kind}</span>
          <span className="attr">{nodeLabelAttrs(n)}</span>
          <span className="faint tiny">
            {n.span.start.line}:{n.span.start.column}
          </span>
        </span>
        {hasKids && open && <ul role="group">{n.children.map((c, i) => render(c, `${path}/${i}`, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <div className="tree" role="tree" aria-label="Abstract syntax tree">
      <ul>{render(root, "0", 0)}</ul>
    </div>
  );
}

export function findByPath(root: AstNode, path: string): AstNode | null {
  const parts = path.split("/").slice(1).map(Number);
  let n: AstNode | undefined = root;
  for (const i of parts) {
    n = n?.children[i];
    if (!n) return null;
  }
  return n ?? null;
}

export function countNodes(n: AstNode): number {
  return 1 + n.children.reduce((a, c) => a + countNodes(c), 0);
}
