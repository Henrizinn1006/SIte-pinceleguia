import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";
import { ORDER_STATUSES, type AdminOrderListItem, type OrderStatus } from "@/lib/types";

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

export function PedidosPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    api.get<AdminOrderListItem[]>(`/api/admin/pedidos${query}`).then(setOrders);
  }, [statusFilter]);

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-serif text-ink">Pedidos</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-9 rounded-sm border border-beige-dark bg-transparent px-3 text-sm">
          <option value="">Todos os status</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md bg-warm-white shadow-soft">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Total</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>
                  {o.customerName}
                  <br />
                  <span className="text-xs text-ink-muted">{o.customerEmail}</span>
                </td>
                <td>{STATUS_LABEL[o.status]}</td>
                <td>{formatMoney(o.totalInCents)}</td>
                <td className="text-ink-muted">{new Date(o.createdAt).toLocaleString("pt-BR")}</td>
                <td>
                  <Link to={`/pedidos/${o.id}`} className="text-caramel-text underline underline-offset-2">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {orders?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink-muted">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
