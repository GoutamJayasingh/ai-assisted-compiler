import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";

/** Rewrites links to sibling docs (FOO.md, docs/FOO.md, ../README.md) to in-app routes. */
export function rewriteDocLinks(html: string): string {
  const docs = html.replace(/href="(?:\.\.\/|\.\/)?(?:docs\/)?([A-Z0-9_]+)\.md(#[^"]*)?"/g, (_m, name: string) => `href="/docs/${name}" data-internal="1"`);
  // Other relative links point at repository files the UI does not serve:
  // show them as labelled paths instead of dead links.
  return docs.replace(/<a href="(?!https?:|\/|#|mailto:)([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, '<span class="repo-path" title="Repository file: $1">$2 <small>($1)</small></span>');
}

export function Markdown({ text }: { text: string }) {
  const nav = useNavigate();
  const html = useMemo(() => rewriteDocLinks(DOMPurify.sanitize(marked.parse(text, { async: false }) as string)), [text]);
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    if (a?.dataset.internal) {
      e.preventDefault();
      nav(a.getAttribute("href")!);
      window.scrollTo(0, 0);
    }
  };
  return <div className="md" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
