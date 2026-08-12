import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Shell } from "@/components/shell";
import { api, ApiError } from "@/lib/api";
import type { AdminOrderDetail, OrderStatus } from "@/lib/types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  PREPARING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

/** Espelha App\Orders\OrderStateMachine::TRANSITIONS — só para a UI sugerir
 * opções válidas; a validação de verdade é sempre no backend. */
const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED", "REFUNDED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function PedidoDetalhePage() {
  const { id = "" } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  function reload() {
    api.get<AdminOrderDetail>(`/api/admin/pedidos/${id}`).then((o) => {
      setOrder(o);
      setInternalNote(o.internalNote ?? "");
    });
  }

  useEffect(reload, [id]);

  async function handleStatusChange(newStatus: OrderStatus) {
    setError(null);
    setChanging(true);
    try {
      await api.put(`/api/admin/pedidos/${id}/status`, { status: newStatus, note: note || undefined });
      setNote("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível mudar o status.");
    } finally {
      setChanging(false);
    }
  }

  async function handleSaveNote() {
    await api.put(`/api/admin/pedidos/${id}/nota-interna`, { note: internalNote });
  }

  if (!order) {
    return (
      <Shell>
        <p className="text-ink-muted">Carregando…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">
        Pedido {order.orderNumber} — {STATUS_LABEL[order.status]}
      </h1>

      {error && <p className="mt-3 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md bg-warm-white p-5 shadow-soft">
          <h2 className="font-serif text-lg text-ink">Itens</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {item.productName} ×{item.quantity}
                </span>
                <span>{formatMoney(item.subtotalInCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-1 border-t border-beige pt-3 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotalInCents)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Frete</span>
              <span>{formatMoney(order.shippingInCents)}</span>
            </div>
            {order.discountInCents > 0 && (
              <div className="flex justify-between text-ink-muted">
                <span>Desconto</span>
                <span>-{formatMoney(order.discountInCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-ink">
              <span>Total</span>
              <span>{formatMoney(order.totalInCents)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-md bg-warm-white p-5 shadow-soft">
          <h2 className="font-serif text-lg text-ink">Cliente e entrega</h2>
          <p className="mt-2 text-sm">
            {order.customerName}
            <br />
            {order.customerEmail}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {order.shippingAddress.street}, {order.shippingAddress.number}
            {order.shippingAddress.complement ? ` — ${order.shippingAddress.complement}` : ""}
            <br />
            {order.shippingAddress.district}, {order.shippingAddress.city}/{order.shippingAddress.state} — {order.shippingAddress.zipCode}
          </p>

          {order.payments.length > 0 && (
            <div className="mt-4 border-t border-beige pt-4">
              <h3 className="text-sm font-medium text-ink">Pagamento</h3>
              {order.payments.map((p) => (
                <p key={p.id} className="mt-1 text-sm text-ink-muted">
                  {p.method} via {p.gateway} — {p.status} ({formatMoney(p.amount_in_cents)})
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md bg-warm-white p-5 shadow-soft lg:col-span-2">
          <h2 className="font-serif text-lg text-ink">Mudar status</h2>
          {ALLOWED_NEXT[order.status].length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Este pedido está em um status final.</p>
          ) : (
            <>
              <label className="mt-3 block text-sm text-ink">
                Nota (opcional, fica no histórico)
                <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 min-h-10 w-full max-w-md rounded-sm border border-beige-dark bg-transparent px-3" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALLOWED_NEXT[order.status].map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={changing}
                    onClick={() => handleStatusChange(status)}
                    className="min-h-10 rounded-sm border border-beige-dark px-4 text-sm text-ink hover:bg-beige/40 disabled:opacity-50"
                  >
                    → {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 border-t border-beige pt-4">
            <h3 className="text-sm font-medium text-ink">Histórico</h3>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-muted">
              {order.statusHistory.map((h, i) => (
                <li key={i}>
                  {new Date(h.created_at).toLocaleString("pt-BR")} — {h.from_status ? `${STATUS_LABEL[h.from_status]} → ` : ""}
                  {STATUS_LABEL[h.to_status]}
                  {h.note ? ` (${h.note})` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-beige pt-4">
            <label className="block text-sm text-ink">
              Nota interna (não aparece para o cliente)
              <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={2} className="mt-1 w-full rounded-sm border border-beige-dark bg-transparent px-3 py-2" />
            </label>
            <button type="button" onClick={handleSaveNote} className="mt-2 min-h-9 rounded-sm border border-beige-dark px-4 text-sm text-ink hover:bg-beige/40">
              Salvar nota
            </button>
          </div>
        </section>
      </div>
    </Shell>
  );
}
