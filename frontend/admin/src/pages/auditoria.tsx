import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";
import type { AdminAuditLogEntry } from "@/lib/types";

export function AuditoriaPage() {
  const [logs, setLogs] = useState<AdminAuditLogEntry[] | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    const query = actionFilter ? `?acao=${encodeURIComponent(actionFilter)}` : "";
    api.get<AdminAuditLogEntry[]>(`/api/admin/auditoria${query}`).then(setLogs);
  }, [actionFilter]);

  return (
    <Shell>
      <h1 className="text-2xl font-serif text-ink">Auditoria</h1>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        Toda ação administrativa relevante — e toda tentativa negada por falta de permissão — fica registrada aqui.
      </p>

      <input
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        placeholder="Filtrar por ação (ex.: product, order.status)"
        className="mt-4 min-h-10 w-full max-w-sm rounded-sm border border-beige-dark bg-transparent px-3 text-sm"
      />

      <div className="mt-4 overflow-x-auto rounded-md bg-warm-white shadow-soft">
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Quem</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Negado?</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-ink-muted">{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                <td>{log.userEmail}</td>
                <td>{log.action}</td>
                <td>
                  {log.entityType}
                  {log.entityLabel ? ` — ${log.entityLabel}` : log.entityId ? ` — ${log.entityId}` : ""}
                </td>
                <td>{log.denied ? <span className="text-danger">Sim</span> : "Não"}</td>
                <td className="text-ink-muted">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {logs?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-ink-muted">
                  Nenhum registro ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
