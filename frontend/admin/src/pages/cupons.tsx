import { useEffect, useState, type FormEvent } from "react";
import { Shell } from "@/components/shell";
import { api, ApiError } from "@/lib/api";
import type { AdminCoupon } from "@/lib/types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const EMPTY = {
  id: null as string | null,
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discountValue: "",
  minOrderInCents: "",
  isActive: true,
};

export function CuponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reload() {
    api.get<AdminCoupon[]>("/api/admin/cupons").then(setCoupons);
  }

  useEffect(reload, []);

  function startEdit(coupon: AdminCoupon) {
    setForm({
      id: coupon.id, code: coupon.code, description: coupon.description ?? "",
      discountType: coupon.discountType, discountValue: String(coupon.discountValue),
      minOrderInCents: coupon.minOrderInCents !== null ? String(coupon.minOrderInCents) : "",
      isActive: coupon.isActive,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number.parseInt(form.discountValue, 10),
        minOrderInCents: form.minOrderInCents ? Number.parseInt(form.minOrderInCents, 10) : null,
        isActive: form.isActive,
      };
      if (form.id) {
        await api.put(`/api/admin/cupons/${form.id}`, payload);
      } else {
        await api.post("/api/admin/cupons", payload);
      }
      setForm(EMPTY);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cupom?")) return;
    await api.delete(`/api/admin/cupons/${id}`);
    reload();
  }

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">Cupons</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl rounded-md bg-warm-white p-5 shadow-soft">
        <h2 className="font-serif text-lg text-ink">{form.id ? "Editar cupom" : "Novo cupom"}</h2>
        {error && <p className="mt-3 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink">
            Código
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
          </label>
          <label className="text-sm text-ink">
            Tipo
            <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "PERCENTAGE" | "FIXED" })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3">
              <option value="PERCENTAGE">Percentual (%)</option>
              <option value="FIXED">Valor fixo (centavos)</option>
            </select>
          </label>
          <label className="text-sm text-ink">
            Valor ({form.discountType === "PERCENTAGE" ? "%" : "centavos"})
            <input required type="number" min={1} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
          </label>
          <label className="text-sm text-ink">
            Pedido mínimo (centavos, opcional)
            <input type="number" min={0} value={form.minOrderInCents} onChange={(e) => setForm({ ...form, minOrderInCents: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
          </label>
        </div>

        <label className="mt-3 block text-sm text-ink">
          Descrição (opcional)
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3" />
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Ativo
        </label>

        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={saving} className="min-h-10 rounded-sm bg-caramel-deep px-5 text-warm-white disabled:opacity-50">
            {saving ? "Salvando…" : form.id ? "Salvar alterações" : "Criar cupom"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY)} className="min-h-10 rounded-sm border border-beige-dark px-5 text-ink">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-md bg-warm-white shadow-soft">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Desconto</th>
              <th>Mín. pedido</th>
              <th>Usos</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons?.map((c) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : formatMoney(c.discountValue)}</td>
                <td>{c.minOrderInCents !== null ? formatMoney(c.minOrderInCents) : "—"}</td>
                <td>
                  {c.usageCount}
                  {c.usageLimit !== null ? ` / ${c.usageLimit}` : ""}
                </td>
                <td>{c.isActive ? "Sim" : "Não"}</td>
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
            {coupons?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink-muted">
                  Nenhum cupom ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
