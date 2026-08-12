<?php

declare(strict_types=1);

namespace App\Admin;

use App\Http\ValidationException;
use PDO;

/**
 * CRUD administrativo de `settings` — diferente de
 * App\Content\SettingsRepository (só expõe as chaves da allowlist
 * pública), este vê e edita todas as chaves.
 */
final class SettingsAdminRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<int, array{key: string, value: mixed, group: string, updatedAt: string}> */
    public function listAll(): array
    {
        $stmt = $this->db->query('SELECT `key`, value, `group`, updated_at FROM settings ORDER BY `group`, `key`');
        return array_map(fn (array $row): array => [
            'key' => $row['key'],
            'value' => json_decode((string) $row['value'], true),
            'group' => $row['group'],
            'updatedAt' => $row['updated_at'],
        ], $stmt->fetchAll());
    }

    /** @param mixed $value precisa ser serializável em JSON */
    public function upsert(string $key, mixed $value, string $group = 'geral'): void
    {
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new ValidationException('Valor de configuração inválido (não serializável em JSON).');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`) VALUES (:key, :value, :group)
             ON DUPLICATE KEY UPDATE value = VALUES(value), `group` = VALUES(`group`)',
        );
        $stmt->execute(['key' => $key, 'value' => $encoded, 'group' => $group]);
    }
}
