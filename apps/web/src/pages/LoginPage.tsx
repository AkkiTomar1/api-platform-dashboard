import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@ui";
import { ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { usePageTitle } from "@/lib/use-page-title";
import { Moon, Sun } from "lucide-react";

export function LoginPage() {
  usePageTitle("Sign in");
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-surface lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">API Platform</p>
            <p className="text-sm text-white/70">Gateway Dashboard</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Manage your Kong gateway from one place
          </h1>
          <p className="mt-4 text-white/80">
            Services, routes, plugins, consumers, credentials and audit trails — with
            field-level role-based access control baked in.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["RBAC", "Audit logs", "Key-auth", "Rate limiting"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/60">
          Kong Admin API · RS256 JWT · Redis-backed control plane
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-violet-600/25">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-ink-strong">
                  API <span className="text-gradient">Platform</span>
                </p>
                <p className="text-xs text-ink-soft">Gateway Dashboard</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-2 text-ink-soft hover:bg-surface-muted"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface-card p-8 shadow-xl shadow-slate-950/5">
            <div className="mb-6 hidden items-center gap-3 lg:flex">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-violet-600/25">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-ink-strong">Welcome back</h1>
                <p className="text-sm text-ink-soft">Sign in to the gateway console</p>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div>
                <h1 className="text-xl font-bold text-ink-strong">Welcome back</h1>
                <p className="text-sm text-ink-soft">Sign in to the gateway console</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-ink"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-ink"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error !== null && (
                <p className="flex items-center gap-1.5 text-sm text-red-500">
                  <KeyRound className="h-4 w-4" />
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                type="submit"
                loading={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}