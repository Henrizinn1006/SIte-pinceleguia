<?php

declare(strict_types=1);

namespace App\Audit;

use PDO;

/**
 * Porta de packages/auth/src/audit.ts.
 *
 * Registrar NUNCA pode derrubar a operação: se o log falhar, a ação já
 * aconteceu. Erros aqui vão para error_log() e seguem — perder um
 * registro de auditoria é ruim; perder a venda por causa dele é pior.
 */
final class AuditLogger
{
    /** Nunca gravados mesmo se vierem no objeto de alterações. */
    private const CAMPOS_PROIBIDOS = [
        'password', 'passwordHash', 'password_hash', 'senha', 'token', 'tokenHash', 'token_hash',
        'secret', 'accessToken', 'refreshToken', 'apiKey', 'cardNumber', 'cvv', 'document', 'cpf',
    ];

    public function __construct(private readonly PDO $db)
    {
    }

    /** @param array<string, mixed> $actor {id, email} @param array<string, array{de:mixed,para:mixed}>|null $changes */
    public function registrar(array $actor, string $action, string $entityType, ?string $entityId = null, ?string $entityLabel = null, ?array $changes = null, ?string $ip = null, ?string $userAgent = null): void
    {
        $this->inserir($actor['id'], $actor['email'], $action, $entityType, $entityId, $entityLabel, $this->limpar($changes), false, $ip, $userAgent);
    }

    /** Tentativa barrada por falta de permissão — sinal tão importante quanto um sucesso. */
    public function registrarNegado(array $actor, string $permissao, ?string $ip = null, ?string $userAgent = null): void
    {
        $this->inserir($actor['id'], $actor['email'], "denied.{$permissao}", 'permission', $permissao, null, null, true, $ip, $userAgent);
    }

    public function registrarLoginFalho(string $email, string $motivo, ?string $ip = null, ?string $userAgent = null): void
    {
        $this->inserir(null, mb_substr($email, 0, 200), 'auth.login.failed', 'session', null, $motivo, null, true, $ip, $userAgent);
    }

    private function inserir(?string $userId, string $userEmail, string $action, string $entityType, ?string $entityId, ?string $entityLabel, ?array $changes, bool $denied, ?string $ip, ?string $userAgent): void
    {
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, entity_label, changes, denied, ip_address, user_agent)
                 VALUES (:id, :userId, :userEmail, :action, :entityType, :entityId, :entityLabel, :changes, :denied, :ip, :userAgent)',
            );
            $stmt->execute([
                'id' => 'c' . bin2hex(random_bytes(12)),
                'userId' => $userId,
                'userEmail' => $userEmail,
                'action' => $action,
                'entityType' => $entityType,
                'entityId' => $entityId,
                'entityLabel' => $entityLabel,
                'changes' => $changes !== null ? json_encode($changes, JSON_UNESCAPED_UNICODE) : null,
                'denied' => $denied ? 1 : 0,
                'ip' => $ip,
                'userAgent' => $userAgent !== null ? substr($userAgent, 0, 255) : null,
            ]);
        } catch (\Throwable $e) {
            error_log("[auditoria] falha ao registrar {$action}: " . $e->getMessage());
        }
    }

    /** @param array<string, array{de:mixed,para:mixed}>|null $changes */
    private function limpar(?array $changes): ?array
    {
        if ($changes === null) {
            return null;
        }

        $saida = [];
        foreach ($changes as $campo => $valor) {
            $saida[$campo] = in_array($campo, self::CAMPOS_PROIBIDOS, true)
                ? ['de' => '[oculto]', 'para' => '[oculto]']
                : $valor;
        }
        return $saida;
    }
}
