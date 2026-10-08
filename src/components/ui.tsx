import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const control =
  "h-12 w-full rounded-xl border border-line bg-card px-3 text-base text-ink outline-none placeholder:text-muted focus:border-ink";

export function Button({
  variant = "solid",
  full,
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "line" | "ghost" | "danger";
  full?: boolean;
}) {
  const styles = {
    solid: "bg-ink text-ivory",
    line: "border border-line bg-card text-ink",
    ghost: "bg-transparent text-ink",
    danger: "bg-transparent text-danger",
  }[variant];
  return (
    <button
      type={type}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${full ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      <input id={id} className={control} {...props} />
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Area({
  label,
  ...props
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      <textarea id={id} className={`${control} h-28 py-3`} {...props} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = props.id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      <select id={id} className={control} {...props}>
        {children}
      </select>
    </label>
  );
}

export function Notice({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" }) {
  return (
    <p className={`text-sm ${tone === "danger" ? "text-danger" : "text-muted"}`} role={tone === "danger" ? "alert" : undefined}>
      {children}
    </p>
  );
}
