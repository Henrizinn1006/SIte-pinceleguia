<?php

declare(strict_types=1);

namespace App\Auth;

use App\Config\Env;
use PDO;

/**
 * Sessão administrativa DB-backed (não JWT) — permite revogar todas as
 * sessões de um usuário instantaneamente (troca de senha, suspeita de
 * vazamento) sem esperar expirar. O cookie guarda só o token bruto; o
 * banco guarda `token_hash` (SHA-256) — um vazamento do banco não dá
 * sessão válida a ninguém (mesmo padrão de packages/auth/src/session.ts
 * e tokens.ts do projeto original).
 */
final class Session
{
    public const COOKIE_NAME = 'pg_admin_session';
    private const TTL_HOURS = 8;

    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * Cria a sessão no banco E define o cookie na resposta. Chamado
     * logo após autenticar com sucesso — o id de sessão é sempre novo
     * neste ponto (equivalente a "rotação de identificador no login").
     *
     * @return array{id: string, csrfToken: string}
     */
    public function create(string $userId, ?string $ip, ?string $userAgent): array
    {
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $csrfToken = bin2hex(random_bytes(32));
        $id = 'c' . bin2hex(random_bytes(12));
        $expiresAt = (new \DateTimeImmutable("+" . self::TTL_HOURS . " hours"))->format('Y-m-d H:i:s.v');

        $stmt = $this->db->prepare(
            'INSERT INTO sessions (id, user_id, token_hash, csrf_token, expires_at, ip_address, user_agent)
             VALUES (:id, :userId, :tokenHash, :csrfToken, :expiresAt, :ip, :userAgent)',
        );
        $stmt->execute([
            'id' => $id, 'userId' => $userId, 'tokenHash' => $tokenHash, 'csrfToken' => $csrfToken,
            'expiresAt' => $expiresAt, 'ip' => $ip, 'userAgent' => $userAgent !== null ? substr($userAgent, 0, 255) : null,
        ]);

        $this->setCookie($rawToken);

        return ['id' => $id, 'csrfToken' => $csrfToken];
    }

    /**
     * Resolve o cookie da requisição atual para uma sessão + usuário
     * válidos. Apaga a sessão (best-effort) se estiver expirada.
     *
     * @return array{sessionId: string, csrfToken: string, user: array<string, mixed>}|null
     */
    public function resolveCurrent(): ?array
    {
        $rawToken = $_COOKIE[self::COOKIE_NAME] ?? null;
        if (!is_string($rawToken) || $rawToken === '') {
            return null;
        }

        $tokenHash = hash('sha256', $rawToken);

        $stmt = $this->db->prepare(
            'SELECT s.id AS session_id, s.csrf_token, s.expires_at, u.id AS user_id, u.name, u.email,
                    u.is_active, u.is_admin
             FROM sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = :tokenHash
             LIMIT 1',
        );
        $stmt->execute(['tokenHash' => $tokenHash]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        if (new \DateTimeImmutable($row['expires_at']) < new \DateTimeImmutable()) {
            $this->destroyByHash($tokenHash);
            return null;
        }

        if (!(bool) $row['is_active']) {
            return null;
        }

        return [
            'sessionId' => $row['session_id'],
            'csrfToken' => $row['csrf_token'],
            'user' => [
                'id' => $row['user_id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'isAdmin' => (bool) $row['is_admin'],
            ],
        ];
    }

    public function destroyCurrent(): void
    {
        $rawToken = $_COOKIE[self::COOKIE_NAME] ?? null;
        if (is_string($rawToken) && $rawToken !== '') {
            $this->destroyByHash(hash('sha256', $rawToken));
        }
        $this->clearCookie();
    }

    public function destroyAllForUser(string $userId): void
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE user_id = :userId');
        $stmt->execute(['userId' => $userId]);
    }

    /** Pensado para rodar periodicamente via Cron Job (Fase 3+). */
    public function purgeExpired(): int
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE expires_at < :now');
        $stmt->execute(['now' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v')]);
        return $stmt->rowCount();
    }

    private function destroyByHash(string $tokenHash): void
    {
        $stmt = $this->db->prepare('DELETE FROM sessions WHERE token_hash = :tokenHash');
        $stmt->execute(['tokenHash' => $tokenHash]);
    }

    private function setCookie(string $rawToken): void
    {
        setcookie(self::COOKIE_NAME, $rawToken, [
            'expires' => time() + self::TTL_HOURS * 3600,
            'path' => '/',
            'domain' => '',
            'secure' => self::cookieSecure(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private function clearCookie(): void
    {
        setcookie(self::COOKIE_NAME, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => self::cookieSecure(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Secure=true por padrão (obrigatório em produção, HTTPS). Só cai
     * para false em desenvolvimento local explícito
     * (`COOKIE_SECURE=false` no .env) — nunca por detecção automática,
     * para não desligar sem querer em produção atrás de um proxy que
     * não repassa o header certo.
     */
    private static function cookieSecure(): bool
    {
        return Env::bool('COOKIE_SECURE', true);
    }
}
