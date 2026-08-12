import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, isApiError } from "@/lib/auth-context";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      // Mensagem genérica também no frontend — o backend já não revela
      // se o e-mail existe; não faz sentido a UI ser mais específica.
      setError(isApiError(err) ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-md bg-warm-white p-8 shadow-medium">
        <h1 className="font-serif text-2xl text-ink">Painel — Pincel &amp; Guia</h1>
        <p className="mt-1 text-sm text-ink-muted">Entre com sua conta administrativa.</p>

        {error && (
          <p role="alert" className="mt-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <label className="mt-6 block text-sm text-ink">
          E-mail
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-sm border border-beige-dark bg-transparent px-3 text-base text-ink"
          />
        </label>

        <label className="mt-4 block text-sm text-ink">
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-sm border border-beige-dark bg-transparent px-3 text-base text-ink"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 min-h-11 w-full rounded-sm bg-caramel-deep text-warm-white transition-colors hover:bg-ink disabled:opacity-50"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>

        <p className="mt-6 text-xs text-ink-muted">
          Não há cadastro por aqui — o acesso é só por convite. Se você deveria ter uma conta e não consegue entrar, fale com
          quem administra o site.
        </p>
      </form>
    </div>
  );
}
