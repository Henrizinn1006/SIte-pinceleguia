import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";
import type { AdminProductListItem } from "@/lib/types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function ProdutosPage() {
  const [produtos, setProdutos] = useState<AdminProductListItem[] | null>(null);

  useEffect(() => {
    api.get<AdminProductListItem[]>("/api/admin/produtos").then(setProdutos);
  }, []);

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-ink">Produtos</h1>
        <Link to="/produtos/novo" className="min-h-10 rounded-sm bg-caramel-deep px-4 py-2 text-sm text-warm-white">
          + Novo produto
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md bg-warm-white shadow-soft">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Ativo</th>
              <th>Destaque</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produtos?.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="text-ink-muted">{p.categoryName}</td>
                <td>
                  {formatMoney(p.salePriceInCents ?? p.basePriceInCents)}
                  {p.salePriceInCents !== null && <span className="ml-1.5 text-xs text-ink-muted line-through">{formatMoney(p.basePriceInCents)}</span>}
                </td>
                <td className={p.totalStock === 0 ? "text-danger" : undefined}>{p.totalStock}</td>
                <td>{p.isActive ? "Sim" : "Não"}</td>
                <td>{p.isFeatured ? "Sim" : "Não"}</td>
                <td>
                  <Link to={`/produtos/${p.id}`} className="text-caramel-text underline underline-offset-2">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {produtos?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink-muted">
                  Nenhum produto ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
