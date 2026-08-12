import { useEffect, useState, type FormEvent } from "react";
import { Shell } from "@/components/shell";
import { api, ApiError } from "@/lib/api";
import type { AdminCategory } from "@/lib/types";

const EMPTY_FORM = { id: null as string | null, name: "", slug: "", description: "", isActive: true, showOnHome: false };

export function CategoriasPage() {
  const [categorias, setCategorias] = useState<AdminCategory[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reload() {
    api.get<AdminCategory[]>("/api/admin/categorias").then(setCategorias);
  }

  useEffect(reload, []);

  function startEdit(categoria: AdminCategory) {
    setForm({ id: categoria.id, name: categoria.name, slug: categoria.slug, description: categoria.description ?? "", isActive: categoria.isActive, showOnHome: categoria.showOnHome });
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { name: form.name, slug: form.slug, description: form.description || null, isActive: form.isActive, showOnHome: form.showOnHome };
      if (form.id) {
        await api.put(`/api/admin/categorias/${form.id}`, payload);
      } else {
        await api.post("/api/admin/categorias", payload);
      }
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria? Só funciona se não houver produtos ativos nela.")) return;
    try {
      await api.delete(`/api/admin/categorias/${id}`);
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Não foi possível excluir.");
    }
  }

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">Categorias</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl rounded-md bg-warm-white p-5 shadow-soft">
        <h2 className="font-serif text-lg text-ink">{form.id ? "Editar categoria" : "Nova categoria"}</h2>

        {error && <p className="mt-3 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink">
            Nome
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
          </label>
          <label className="text-sm text-ink">
            Slug
            <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
          </label>
        </div>

        <label className="mt-3 block text-sm text-ink">
          Descrição
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 w-full rounded-sm border border-beige-dark bg-transparent px-3 py-2" />
        </label>

        <div className="mt-3 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Ativa
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.showOnHome} onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })} />
            Mostrar na home
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={saving} className="min-h-10 rounded-sm bg-caramel-deep px-5 text-warm-white disabled:opacity-50">
            {saving ? "Salvando…" : form.id ? "Salvar alterações" : "Criar categoria"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY_FORM)} className="min-h-10 rounded-sm border border-beige-dark px-5 text-ink">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-md bg-warm-white shadow-soft">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Slug</th>
              <th>Produtos</th>
              <th>Ativa</th>
              <th>Home</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categorias?.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="text-ink-muted">{c.slug}</td>
                <td>{c.productCount ?? "—"}</td>
                <td>{c.isActive ? "Sim" : "Não"}</td>
                <td>{c.showOnHome ? "Sim" : "Não"}</td>
                <td className="whitespace-nowrap">
                  <button type="button" onClick={() => startEdit(c)} className="text-caramel-text underline underline-offset-2">
                    Editar
                  </button>
                  {" · "}
                  <button type="button" onClick={() => handleDelete(c.id)} className="text-danger underline underline-offset-2">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {categorias?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink-muted">
                  Nenhuma categoria ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
