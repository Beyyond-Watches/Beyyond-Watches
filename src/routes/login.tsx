import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Shell } from "@/components/chrome";
import { Button, Field, Notice } from "@/components/ui";
import { adminLogin, requestOtp, saveName, verifyOtp } from "@/lib/shop/api";
import { formatPhone } from "@/lib/shop/phone";
import { useSession } from "@/lib/shop/session";

type LoginSearch = { next: string; admin: boolean };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    next: typeof search.next === "string" && search.next.startsWith("/") && !search.next.startsWith("//") ? search.next : "",
    admin: search.admin === true || search.admin === "1" || search.admin === "true",
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const session = useSession();
  const [mode, setMode] = useState<"customer" | "admin">(search.admin ? "admin" : "customer");
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = search.next || "/account";
  const already = session.ready && session.customer;
  const needsName = Boolean(already && !session.customer?.name);

  function goNext() {
    if (next === "/checkout") return navigate({ to: "/checkout" });
    if (next === "/cart") return navigate({ to: "/cart" });
    if (next === "/admin") return navigate({ to: "/admin" });
    if (next.startsWith("/order/")) {
      return navigate({ to: "/order/$id", params: { id: next.slice("/order/".length) } });
    }
    return navigate({ to: "/account" });
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await requestOtp({ data: { phone } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentTo(result.phone);
    setSentCode(result.code);
    setCode("");
    setStep("code");
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await verifyOtp({ data: { phone: sentTo, code } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    session.signIn(result.token, result.customer);
    if (result.needsName) {
      setToken(result.token);
      setStep("name");
      return;
    }
    await goNext();
  }

  async function confirmName(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await saveName({ data: { token: token || session.token() || "", name } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    session.updateCustomer(result.customer);
    await goNext();
  }

  async function confirmAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await adminLogin({ data: { id: adminId, password } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    session.adminIn(result.token);
    await navigate({ to: "/admin" });
  }

  return (
    <Shell>
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Account</p>
          <h1 className="display mt-2 text-5xl md:text-6xl">
            {mode === "admin" ? "The desk." : needsName || step === "name" ? "What should we call you?" : "Sign in with your number."}
          </h1>
          <p className="mt-4 max-w-md text-muted">
            {mode === "admin"
              ? "Orders, stock, and coupons live here. Customers never see this door."
              : "We use your mobile number as the account. After the code, we ask your name once."}
          </p>
        </div>
        <div className="relative rounded-3xl bg-card p-5 sm:p-6">
          {mode === "customer" && already && session.customer?.name ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted">Signed in as {session.customer.name}.</p>
              <Button onClick={() => void goNext()}>Continue</Button>
              <button type="button" className="text-sm text-muted" onClick={() => void session.signOut()}>
                Use a different number
              </button>
            </div>
          ) : null}
          {mode === "customer" && !already && step === "phone" ? (
            <form className="grid gap-4" onSubmit={sendCode}>
              <Field
                label="Mobile number"
                name="phone"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                hint="Indian numbers only."
              />
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
            </form>
          ) : null}
          {mode === "customer" && step === "code" && !needsName ? (
            <form className="grid gap-4" onSubmit={confirmCode}>
              <div className="rounded-2xl bg-ink p-4 text-ivory">
                <p className="text-xs font-semibold tracking-widest text-ivory/70 uppercase">Message · Beyyond</p>
                <p className="mt-3 text-sm">Your code for {formatPhone(sentTo)}</p>
                <p className="display mt-1 text-4xl tabular-nums tracking-widest">{sentCode}</p>
                <p className="mt-3 text-xs leading-relaxed text-ivory/70">
                  It expires in 5 minutes. Texts are not switched on yet, so the code is shown here.
                </p>
              </div>
              <Field
                label="Enter the code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <button type="button" className="justify-self-start text-sm font-semibold" onClick={() => setCode(sentCode)}>
                Use this code
              </button>
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Verify"}</Button>
              <button type="button" className="text-sm text-muted" onClick={() => { setStep("phone"); setError(""); }}>
                Use a different number
              </button>
            </form>
          ) : null}
          {mode === "customer" && (step === "name" || needsName) && !(already && session.customer?.name) ? (
            <form className="grid gap-4" onSubmit={confirmName}>
              <Field label="Your name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
            </form>
          ) : null}
          {mode === "admin" ? (
            <form className="grid gap-4" onSubmit={confirmAdmin}>
              <Field label="Admin id" name="admin-id" autoComplete="username" value={adminId} onChange={(event) => setAdminId(event.target.value)} />
              <Field label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Open the desk"}</Button>
              <button type="button" className="text-sm text-muted" onClick={() => { setMode("customer"); setError(""); }}>
                Back to customer sign in
              </button>
            </form>
          ) : null}
          {mode === "customer" ? (
            <button
              type="button"
              className="absolute top-4 right-4 text-xs font-medium text-muted"
              onClick={() => { setMode("admin"); setError(""); }}
            >
              Admin
            </button>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
