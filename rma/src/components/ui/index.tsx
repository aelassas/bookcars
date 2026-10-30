/* ---------------------------------------------------------------------------
   Shared UI primitives — the one place page styling comes from.
   Server-safe (no hooks); usable from both server and client components.
--------------------------------------------------------------------------- */
import type {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
  HTMLAttributes,
} from "react";
import Link from "next/link";

/** Tiny class combiner so callers can skip template-string gymnastics. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- PageHeader ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-field border border-line bg-surface text-ink-2 shadow-card">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------------------------------- Card --------------------------------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-card border border-line bg-surface shadow-card", className)}>
      {children}
    </section>
  );
}

/** Standard card section header: quiet label + optional count / action. */
export function CardHeader({
  title,
  count,
  icon,
  action,
  className = "",
}: {
  title: string;
  count?: number | string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-ink-3">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-sunken px-1.5 py-px text-[11px] font-semibold text-ink-2 tnum">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- StatCard ------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  tone = "slate",
  icon,
  spark,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "slate" | "emerald" | "amber" | "rose" | "sky" | "violet" | "brand";
  icon?: ReactNode;
  spark?: ReactNode;
  href?: string;
}) {
  const TONE: Record<string, string> = {
    slate: "text-ink",
    emerald: "text-success",
    amber: "text-warn",
    rose: "text-danger",
    sky: "text-info",
    violet: "text-brand-700",
    brand: "text-brand-700",
  };
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-2">
          {label}
        </span>
        {spark ?? (icon && <span className="shrink-0 text-ink-3">{icon}</span>)}
      </div>
      <div className={cx("mt-1.5 text-2xl font-semibold tracking-tight tnum", TONE[tone])}>
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-xs text-ink-3">{hint}</div>}
    </>
  );
  const cls = "block rounded-card border border-line bg-surface p-4 shadow-card";
  if (href) {
    return (
      <Link href={href} className={cx(cls, "transition hover:border-brand-300 hover:shadow-lifted")}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

/* --------------------------------- Badge --------------------------------- */

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-ink-2",
  success: "bg-success-soft text-success",
  warning: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  brand: "bg-brand-50 text-brand-700",
};

/**
 * Badge supports two APIs:
 *  - legacy: `cls` with raw tailwind color classes (existing pages)
 *  - new:    `tone` semantic variants (preferred going forward)
 */
export function Badge({
  children,
  cls,
  tone,
}: {
  children: ReactNode;
  cls?: string;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        cls ?? BADGE_TONE[tone ?? "neutral"]
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Button -------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // Auth Wave 1 (P0-8) — fill moved from #7B61FF (brand-600) to #6A4DF0
  // (brand-700) for contrast; #7B61FF stays reserved for the wordmark,
  // focus rings, and borders (see globals.css).
  primary:
    "bg-brand-700 text-white shadow-card hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-300",
  secondary:
    "border border-line bg-surface text-ink-2 shadow-card hover:bg-sunken hover:text-ink disabled:text-ink-3",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink disabled:text-ink-3",
  danger:
    "bg-danger text-white shadow-card hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-9 gap-2 px-3.5 text-sm",
};

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center whitespace-nowrap rounded-field font-medium transition-colors disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={props.type ?? "button"}
      className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)}
      {...props}
    />
  );
}

/** Link styled as a button — for server components / navigation actions. */
export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)}
    >
      {children}
    </Link>
  );
}

/* ------------------------------ Form fields ------------------------------ */

const FIELD_BASE =
  "rounded-field border border-line bg-surface text-sm text-ink placeholder:text-ink-3 " +
  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(FIELD_BASE, "h-9 px-3", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(FIELD_BASE, "h-9 px-2.5 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(FIELD_BASE, "px-3 py-2", className)} {...props} />;
}

export function Label({
  className,
  ...props
}: HTMLAttributes<HTMLLabelElement> & { htmlFor?: string }) {
  return (
    <label className={cx("mb-1 block text-xs font-medium text-ink-2", className)} {...props} />
  );
}

/* ---------------------------------- Table -------------------------------- */

export function Table({
  className,
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cx("w-full border-collapse text-left text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx(
        "border-b border-line bg-sunken/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-2 first:rounded-tl-card last:rounded-tr-card",
        className
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cx("border-b border-line-soft px-4 py-3 align-middle text-ink-2", className)}
      {...props}
    />
  );
}

/* ------------------------------- EmptyState ------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sunken text-ink-3">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------- Legacy status class maps ----------------------- */

export const STAGE_CLS: Record<string, string> = {
  inquiry: "bg-slate-300",
  quote: "bg-sky-400",
  contract: "bg-sky-600",
  handover: "bg-emerald-500",
  closed: "bg-slate-800",
};

export const TYPE_BADGE: Record<string, string> = {
  rent: "bg-sky-100 text-sky-700",
  lease: "bg-violet-100 text-violet-700",
  purchase: "bg-emerald-100 text-emerald-700",
};

export const STATUS_BADGE: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  contacted: "bg-sky-100 text-sky-700",
  qualified: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
  open: "bg-sky-100 text-sky-700",
  won: "bg-emerald-100 text-emerald-700",
};
