<?php

declare(strict_types=1);

namespace App\Auth;

use PDO;

/**
 * Rate limit de login PERSISTENTE em banco (tabela `login_attempts`) —
 * um array em memória de processo não serve em PHP tradicional, onde
 * cada requisição é um processo/execução isolada e não compartilha
 * estado com a próxima.
 *
 * Limita por e-mail E por IP separadamente, para cobrir tanto
 * "alguém tentando adivinhar a senha de uma conta específica" quanto
 * "alguém tentando várias contas do mesmo IP".
 */
final class RateLimiter
{
    private const MAX_ATTEMPTS = 5;
    private const WINDOW_MINUTES = 15;

    public function __construct(private readonly PDO $db)
    {
    }

    public function tooManyAttempts(string $email, string $ip): bool
    {
        return $this->countRecentFailures('email', $email) >= self::MAX_ATTEMPTS
            || $this->countRecentFailures('ip_address', $ip) >= self::MAX_ATTEMPTS;
    }

    public function recordAttempt(string $email, string $ip, bool $success): void
    {
        $id = 'c' . bin2hex(random_bytes(12));
        $stmt = $this->db->prepare(
            'INSERT INTO login_attempts (id, email, ip_address, success) VALUES (:id, :email, :ip, :success)',
        );
        $stmt->execute(['id' => $id, 'email' => $email, 'ip' => $ip, 'success' => $success ? 1 : 0]);
    }

    /** Pensado para rodar periodicamente via Cron Job (Fase 3+). */
    public function purgeOld(int $olderThanDays = 7): int
    {
        $threshold = (new \DateTimeImmutable("-{$olderThanDays} days"))->format('Y-m-d H:i:s.v');
        $stmt = $this->db->prepare('DELETE FROM login_attempts WHERE created_at < :threshold');
        $stmt->execute(['threshold' => $threshold]);
        return $stmt->rowCount();
    }

    private function countRecentFailures(string $column, string $value): int
    {
        $since = (new \DateTimeImmutable('-' . self::WINDOW_MINUTES . ' minutes'))->format('Y-m-d H:i:s.v');
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) AS total FROM login_attempts
             WHERE {$column} = :value AND success = 0 AND created_at >= :since",
        );
        $stmt->execute(['value' => $value, 'since' => $since]);
        return (int) $stmt->fetch()['total'];
    }
}
