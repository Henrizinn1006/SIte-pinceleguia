<?php

declare(strict_types=1);

namespace App\Auth;

use PDO;

final class UserRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, email, password_hash, is_active, is_admin FROM users WHERE email = :email LIMIT 1',
        );
        $stmt->execute(['email' => mb_strtolower(trim($email))]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function touchLastLogin(string $userId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET last_login_at = :now WHERE id = :id');
        $stmt->execute(['now' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'), 'id' => $userId]);
    }

    public function create(string $name, string $email, string $passwordHash, bool $isAdmin = true): string
    {
        $id = 'c' . bin2hex(random_bytes(12));
        $stmt = $this->db->prepare(
            'INSERT INTO users (id, name, email, password_hash, is_admin) VALUES (:id, :name, :email, :hash, :isAdmin)',
        );
        $stmt->execute([
            'id' => $id, 'name' => $name, 'email' => mb_strtolower(trim($email)),
            'hash' => $passwordHash, 'isAdmin' => $isAdmin ? 1 : 0,
        ]);
        return $id;
    }

    public function existsAny(): bool
    {
        $stmt = $this->db->query('SELECT COUNT(*) AS total FROM users');
        return (int) $stmt->fetch()['total'] > 0;
    }
}
