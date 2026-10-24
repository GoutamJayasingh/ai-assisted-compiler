import { AlertTriangle, CheckCircle2, CircleSlash, Info, Loader2, OctagonX, RefreshCw, ShieldQuestion, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS } from "../lib/status";
import type { ApiError } from "../services/api";
import type { DecisionStatus } from "../types/api";

type Tone = "success" | "info" | "warning" | "danger" | "neutral" | "accent" | "teal";

const TONE_ICON: Record<Tone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: OctagonX,
  neutral: CircleSlash,
  accent: Info,
  teal: Info,
};

export function Badge({ tone = "neutral", children, icon = true, title }: { tone?: Tone; children: ReactNode; icon?: boolean; title?: string }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={`badge tone-${tone}`} title={title}>
      {icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, short }: { status: DecisionStatus | "COMPILER_FAILURE"; short?: boolean }) {
  const m = STATUS[status] ?? STATUS.COMPILER_FAILURE;
  return (
    <Badge tone={m.tone} title={m.meaning}>
      {short ? m.short : m.label}
    </Badge>
  );
}

const OUTCOME: Record<string, { tone: Tone; label: string }> = {
  valid: { tone: "success", label: "parser-valid" },
  "local-repair": { tone: "info", label: "fixes this error" },
  "defers-error": { tone: "warning", label: "only defers error" },
  "same-location": { tone: "neutral", label: "still fails here" },
  "earlier-error": { tone: "danger", label: "new earlier error" },
  malformed: { tone: "danger", label: "round-trip failed" },
  duplicate: { tone: "neutral", label: "duplicate" },
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const o = OUTCOME[outcome] ?? { tone: "neutral" as Tone, label: outcome };
  return <Badge tone={o.tone}>{o.label}</Badge>;
}

export function Panel({ title, icon: Icon, actions, children, foot, flush, className, id }: { title?: ReactNode; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; foot?: ReactNode; flush?: boolean; className?: string; id?: string }) {
  return (
    <section className={`panel ${className ?? ""}`} id={id} aria-label={typeof title === "string" ? title : undefined}>
      {(title || actions) && (
        <div className="panel-head">
          {title && (
            <h2>
              {Icon && <Icon size={16} aria-hidden className="muted" />}
              {title}
            </h2>
          )}
          {actions && <div className="actions">{actions}</div>}
        </div>
      )}
      <div className={`panel-body ${flush ? "flush" : ""}`}>{children}</div>
      {foot && <div className="panel-foot">{foot}</div>}
    </section>
  );
}

export function EmptyState({ icon: Icon = ShieldQuestion, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="icon">
        <Icon size={20} aria-hidden />
      </div>
      <h3>{title}</h3>
      {children && <div style={{ maxWidth: 520 }}>{children}</div>}
      {action}
    </div>
  );
}

export function Banner({ tone, title, children, icon, actions }: { tone: Tone; title: ReactNode; children?: ReactNode; icon?: LucideIcon; actions?: ReactNode }) {
  const Icon = icon ?? TONE_ICON[tone];
  return (
    <div className={`banner tone-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={18} aria-hidden style={{ flex: "none", marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="title">{title}</div>
        {children && <div className="body">{children}</div>}
      </div>
      {actions}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const titles: Record<string, string> = {
    BACKEND_UNAVAILABLE: "Backend not reachable",
    COMPILER_UNAVAILABLE: "Compiler not built",
    COMPILER_TIMEOUT: "Compiler timed out",
    COMPILER_FAILURE: "Internal compiler failure",
    INPUT_TOO_LARGE: "Input too large",
    TIMEOUT: "Request timed out",
    INVALID_REQUEST: "Invalid request",
  };
  return (
    <Banner
      tone="danger"
      title={titles[error.code] ?? `Request failed (${error.code})`}
      actions={
        onRetry && (
          <button className="btn sm" onClick={onRetry}>
            <RefreshCw size={13} aria-hidden /> Retry
          </button>
        )
      }
    >
      {error.message}
      {error.hint && (
        <div style={{ marginTop: 4 }}>
          <code>{error.hint}</code>
        </div>
      )}
      <div className="tiny faint" style={{ marginTop: 4 }}>
        No results are shown in place of real compiler output.
      </div>
    </Banner>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="row muted small" role="status">
      <Loader2 size={14} className="spin" aria-hidden /> {label ?? "Running…"}
    </span>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          className="tab"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => {
            const i = tabs.findIndex((x) => x.id === value);
            if (e.key === "ArrowRight") onChange(tabs[(i + 1) % tabs.length].id);
            if (e.key === "ArrowLeft") onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Disclosure({ summary, children, open }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="disclosure" open={open}>
      <summary>{summary}</summary>
      <div className="content">{children}</div>
    </details>
  );
}

export function Stat({ k, v, d }: { k: ReactNode; v: ReactNode; d?: ReactNode }) {
  return (
    <div className="panel stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {d && <div className="d">{d}</div>}
    </div>
  );
}
