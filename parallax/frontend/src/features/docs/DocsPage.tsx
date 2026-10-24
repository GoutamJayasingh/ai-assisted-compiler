import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Markdown } from "../../components/Markdown";
import { Badge, ErrorBanner, Panel, Spinner } from "../../components/ui";
import { ApiError, api } from "../../services/api";

export function DocsPage() {
  const { name } = useParams();
  const [index, setIndex] = useState<{ name: string; title: string }[]>([]);
  const [md, setMd] = useState<string | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const current = name ?? "README";

  useEffect(() => {
    api.docs().then((d) => setIndex(d.docs)).catch((e) => setErr(e));
  }, []);
  useEffect(() => {
    setMd(null);
    api.doc(current).then((d) => setMd(d.markdown)).catch((e) => setErr(e instanceof ApiError ? e : new ApiError("BACKEND_FAILURE", String(e))));
  }, [current]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Documentation & about</h1>
          <p>The project's Markdown documentation, served from the repository. Implemented features, optional components and limitations are labelled as such in each document.</p>
        </div>
      </div>
      <div className="row small">
        <Badge tone="success">Implemented: Flex/Bison compiler, repair engine, evaluation, API, this UI</Badge>
        <Badge tone="info">Optional: CPCT+ baseline (needs Rust + nimbleparse)</Badge>
        <Badge tone="neutral">Not implemented: semantic analysis, code generation</Badge>
      </div>
      <div className="split-wide" style={{ gridTemplateColumns: "260px minmax(0, 1fr)" }}>
        <Panel title="Documents" icon={BookOpen} flush>
          <nav style={{ padding: 8 }}>
            {index.map((d) => (
              <NavLink key={d.name} to={`/docs/${d.name}`} className={() => `nav-link ${d.name === current ? "active" : ""}`}>
                <span className="small">{d.title}</span>
              </NavLink>
            ))}
          </nav>
        </Panel>
        <Panel>
          {err && <ErrorBanner error={err} />}
          {!md && !err && <Spinner label="Loading document…" />}
          {md && <Markdown text={md} />}
        </Panel>
      </div>
    </>
  );
}
