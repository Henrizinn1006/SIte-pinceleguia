<?php

declare(strict_types=1);

namespace App\Admin;

use PDO;

/** Leitura de `audit_logs` para o painel — nenhuma escrita passa por aqui. */
final class AuditLogAdminRepository
{
    /** @return array<int, array<string, mixed>> */
    public function listRecent(PDO $db, ?string $action = null, ?string $entityType = null, int $limit = 100): array
    {
        $conditions = [];
        $params = [];

        if ($action !== null && $action !== '') {
            $conditions[] = 'action LIKE :action';
            $params['action'] = "%{$action}%";
        }
        if ($entityType !== null && $entityType !== '') {
            $conditions[] = 'entity_type = :entityType';
            $params['entityType'] = $entityType;
        }

        $sql = 'SELECT id, user_email, action, entity_type, entity_id, entity_label, changes, denied, ip_address, created_at FROM audit_logs';
        if ($conditions !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY created_at DESC LIMIT :limit';

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        $stmt->bindValue(':limit', min($limit, 500), PDO::PARAM_INT);
        $stmt->execute();

        return array_map(fn (array $row): array => [
            'id' => $row['id'], 'userEmail' => $row['user_email'], 'action' => $row['action'],
            'entityType' => $row['entity_type'], 'entityId' => $row['entity_id'], 'entityLabel' => $row['entity_label'],
            'changes' => $row['changes'] !== null ? json_decode((string) $row['changes'], true) : null,
            'denied' => (bool) $row['denied'], 'ipAddress' => $row['ip_address'], 'createdAt' => $row['created_at'],
        ], $stmt->fetchAll());
    }
}
