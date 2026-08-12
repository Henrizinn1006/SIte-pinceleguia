import { Fragment, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";
import type { AdminCustomer, AdminCustomerOrder } from "@/lib/types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/**
 * "Clientes" aqui é uma visão agregada a partir de `orders` — não há
 * cadastro/login de cliente no projeto (só checkout como visitante).
 * Ver docs/migracao/03-relatorio-fase4.md.
 */
export function ClientesPage() {
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminCustomerOrder[] | null>(null);

  useEffect(() => {
    api.get<AdminCustomer[]>("/api/admin/clientes").then(setCustomers);
  }, []);

  async function toggleExpand(email: string) {
    if (expanded === email) {
      setExpanded(null);
      return;
    }
    setExpanded(email);
    const data = await api.get<AdminCustomerOrder[]>(`/api/admin/clientes/${encodeURIComponent(email)}/pedidos`);
    setOrders(data);
  }

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">Clientes</h1>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        Não há cadastro de cliente nesta loja (só checkout como visitante) — esta lista agrupa os pedidos por e-mail.
      </p>

      <div className="mt-6 overflow-x-auto rounded-md bg-warm-white shadow-soft">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Pedidos</th>
              <th>Total gasto</th>
              <th>Última compra</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <Fragment key={c.email}>
                <tr>
                  <td>{c.name}</td>
                  <td className="text-ink-muted">{c.email}</td>
                  <td>{c.orderCount}</td>
                  <td>{formatMoney(c.totalSpentInCents)}</td>
                  <td className="text-ink-muted">{new Date(c.lastOrderAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <button type="button" onClick={() => toggleExpand(c.email)} className="text-caramel-text underline underline-offset-2">
                      {expanded === c.email ? "Ocultar" : "Ver pedidos"}
                    </button>
                  </td>
                </tr>
                {expanded === c.email && orders && (
                  <tr>
                    <td colSpan={6} className="bg-cream/50">
                      <ul className="flex flex-col gap-1 py-2 text-sm">
                        {orders.map((o) => (
                          <li key={o.id} className="flex justify-between">
                            <span>
                              {o.orderNumber} — {o.status}
                            </span>
                            <span>{formatMoney(o.totalInCents)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {customers?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink-muted">
                  Nenhum cliente ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
