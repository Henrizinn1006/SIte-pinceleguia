import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Shell } from "@/components/shell";
import { api, ApiError } from "@/lib/api";
import type { AdminCategory, AdminProductDetail } from "@/lib/types";

interface FormState {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  basePriceInCents: string;
  salePriceInCents: string;
  isActive: boolean;
  isFeatured: boolean;
  initialStock: string;
}

const EMPTY: FormState = {
  name: "", slug: "", description: "", shortDescription: "", categoryId: "",
  basePriceInCents: "", salePriceInCents: "", isActive: true, isFeatured: false, initialStock: "0",
};

export function ProdutoDetalhePage({ isNew = false }: { isNew?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<AdminCategory[]>([]);
  const [produto, setProduto] = useState<AdminProductDetail | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<AdminCategory[]>("/api/admin/categorias").then(setCategorias);
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    api.get<AdminProductDetail>(`/api/admin/produtos/${id}`).then((p) => {
      setProduto(p);
      setForm({
        name: p.name, slug: p.slug, description: p.description, shortDescription: p.shortDescription ?? "",
        categoryId: p.categoryId, basePriceInCents: String(p.basePriceInCents),
        salePriceInCents: p.salePriceInCents !== null ? String(p.salePriceInCents) : "",
        isActive: p.isActive, isFeatured: p.isFeatured, initialStock: "0",
      });
    });
  }, [id, isNew]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: form.name, slug: form.slug, description: form.description,
      shortDescription: form.shortDescription || null, categoryId: form.categoryId,
      basePriceInCents: Number.parseInt(form.basePriceInCents, 10),
      salePriceInCents: form.salePriceInCents ? Number.parseInt(form.salePriceInCents, 10) : null,
      isActive: form.isActive, isFeatured: form.isFeatured,
    };

    try {
      if (isNew) {
        payload.initialStock = Number.parseInt(form.initialStock || "0", 10);
        const created = await api.post<AdminProductDetail>("/api/admin/produtos", payload);
        navigate(`/produtos/${created.id}`, { replace: true });
      } else if (id) {
        const updated = await api.put<AdminProductDetail>(`/api/admin/produtos/${id}`, payload);
        setProduto(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("Excluir este produto? Ele deixa de aparecer na loja (exclusão lógica).")) return;
    await api.delete(`/api/admin/produtos/${id}`);
    navigate("/produtos");
  }

  async function handleStockChange(variantId: string, stock: number) {
    await api.put(`/api/admin/variantes/${variantId}/estoque`, { stock });
    if (id) api.get<AdminProductDetail>(`/api/admin/produtos/${id}`).then(setProduto);
  }

  async function handleImageUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    try {
      await api.postForm(`/api/admin/produtos/${id}/imagens`, data);
      formEl.reset();
      api.get<AdminProductDetail>(`/api/admin/produtos/${id}`).then(setProduto);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Falha ao enviar imagem.");
    }
  }

  async function handleImageDelete(imageId: string) {
    if (!confirm("Remover esta imagem?")) return;
    await api.delete(`/api/admin/imagens/${imageId}`);
    if (id) api.get<AdminProductDetail>(`/api/admin/produtos/${id}`).then(setProduto);
  }

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">{isNew ? "Novo produto" : produto?.name ?? "Carregando…"}</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl rounded-md bg-warm-white p-5 shadow-soft">
        {error && <p className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
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
          Descrição curta
          <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
        </label>

        <label className="mt-3 block text-sm text-ink">
          Descrição completa
          <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1 w-full rounded-sm border border-beige-dark bg-transparent px-3 py-2" />
        </label>

        <label className="mt-3 block text-sm text-ink">
          Categoria
          <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3">
            <option value="">Selecione…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-ink">
            Preço (centavos)
            <input required type="number" min={1} value={form.basePriceInCents} onChange={(e) => setForm({ ...form, basePriceInCents: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
          </label>
          <label className="text-sm text-ink">
            Preço promocional (centavos)
            <input type="number" min={1} value={form.salePriceInCents} onChange={(e) => setForm({ ...form, salePriceInCents: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
          </label>
          {isNew && (
            <label className="text-sm text-ink">
              Estoque inicial
              <input type="number" min={0} value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
            </label>
          )}
        </div>

        <div className="mt-3 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Ativo
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
            Em destaque
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={saving} className="min-h-10 rounded-sm bg-caramel-deep px-5 text-warm-white disabled:opacity-50">
            {saving ? "Salvando…" : isNew ? "Criar produto" : "Salvar alterações"}
          </button>
          {!isNew && (
            <button type="button" onClick={handleDelete} className="min-h-10 rounded-sm border border-danger px-5 text-danger">
              Excluir
            </button>
          )}
        </div>
      </form>

      {!isNew && produto && (
        <>
          <section className="mt-8 max-w-2xl rounded-md bg-warm-white p-5 shadow-soft">
            <h2 className="font-serif text-lg text-ink">Estoque por variação</h2>
            <table className="mt-3">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nome</th>
                  <th>Estoque</th>
                </tr>
              </thead>
              <tbody>
                {produto.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="text-ink-muted">{v.sku}</td>
                    <td>{v.name}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        defaultValue={v.stock}
                        onBlur={(e) => {
                          const value = Number.parseInt(e.target.value, 10);
                          if (Number.isFinite(value) && value !== v.stock) void handleStockChange(v.id, value);
                        }}
                        className="min-h-9 w-24 rounded-sm border border-beige-dark bg-transparent px-2"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-8 max-w-2xl rounded-md bg-warm-white p-5 shadow-soft">
            <h2 className="font-serif text-lg text-ink">Imagens</h2>

            <ul className="mt-3 flex flex-wrap gap-3">
              {produto.images.map((img) => (
                <li key={img.id} className="w-28">
                  <img src={img.url} alt={img.alt} className="aspect-square w-full rounded-sm border border-beige object-cover" />
                  <button type="button" onClick={() => handleImageDelete(img.id)} className="mt-1 w-full text-xs text-danger underline underline-offset-2">
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleImageUpload} className="mt-4 flex flex-col gap-2 border-t border-beige pt-4 sm:flex-row sm:items-end">
              <label className="text-sm text-ink">
                Arquivo (JPEG/PNG/WebP, até 5 MB)
                <input type="file" name="imagem" accept="image/jpeg,image/png,image/webp" required className="mt-1 block text-sm" />
              </label>
              <label className="text-sm text-ink">
                Texto alternativo
                <input type="text" name="alt" required className="mt-1 min-h-10 rounded-sm border border-beige-dark bg-transparent px-3" />
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="isPrimary" value="1" />
                Principal
              </label>
              <button type="submit" className="min-h-10 rounded-sm bg-caramel-deep px-4 text-warm-white">
                Enviar
              </button>
            </form>
          </section>
        </>
      )}
    </Shell>
  );
}
