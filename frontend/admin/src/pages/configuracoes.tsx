import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { api, ApiError } from "@/lib/api";
import type { AdminSetting } from "@/lib/types";

/**
 * Editor genérico de `settings` — cada chave é um JSON livre (hero da
 * home, contato da loja, etc). Um formulário dedicado por chave (com
 * campos de verdade em vez de textarea de JSON) é uma melhoria de UX
 * natural para uma próxima iteração; isto aqui já dá controle total
 * sem exigir deploy para mudar texto/contato do site.
 */
export function ConfiguracoesPage() {
  const [settings, setSettings] = useState<AdminSetting[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminSetting[]>("/api/admin/configuracoes").then((data) => {
      setSettings(data);
      setDrafts(Object.fromEntries(data.map((s) => [s.key, JSON.stringify(s.value, null, 2)])));
    });
  }, []);

  async function handleSave(setting: AdminSetting) {
    setErrors({ ...errors, [setting.key]: "" });
    let parsed: unknown;
    try {
      parsed = JSON.parse(drafts[setting.key] ?? "null");
    } catch {
      setErrors({ ...errors, [setting.key]: "JSON inválido." });
      return;
    }

    setSaving(setting.key);
    try {
      await api.put(`/api/admin/configuracoes/${setting.key}`, { value: parsed, group: setting.group });
    } catch (err) {
      setErrors({ ...errors, [setting.key]: err instanceof ApiError ? err.message : "Não foi possível salvar." });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">Configurações</h1>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        Textos e dados que aparecem no site sem precisar de deploy — hero da home, título de destaque, contato da loja.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {settings?.map((setting) => (
          <div key={setting.key} className="max-w-2xl rounded-md bg-warm-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-ink">{setting.key}</h2>
              <span className="text-xs uppercase tracking-wide text-ink-muted">{setting.group}</span>
            </div>

            {errors[setting.key] && <p className="mt-2 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{errors[setting.key]}</p>}

            <textarea
              value={drafts[setting.key] ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [setting.key]: e.target.value })}
              rows={8}
              spellCheck={false}
              className="mt-3 w-full rounded-sm border border-beige-dark bg-cream px-3 py-2 font-mono text-xs text-ink"
            />

            <button
              type="button"
              onClick={() => handleSave(setting)}
              disabled={saving === setting.key}
              className="mt-3 min-h-10 rounded-sm bg-caramel-deep px-4 text-sm text-warm-white disabled:opacity-50"
            >
              {saving === setting.key ? "Salvando…" : "Salvar"}
            </button>
          </div>
        ))}
      </div>
    </Shell>
  );
}
