-- =====================================================================
-- 0009_sessions
--
-- Sessão administrativa vive no banco (não é JWT): permite invalidar
-- todas as sessões de um usuário instantaneamente (troca de senha,
-- suspeita de vazamento) sem esperar expirar. Cookie guarda só o
-- token bruto; o banco guarda `token_hash` (SHA-256) — um vazamento do
-- banco não dá sessão válida a ninguém.
--
-- `csrf_token` é gerado uma vez por sessão e comparado (hash_equals)
-- em toda mutação — ver backend/src/Auth/Csrf.php.
-- =====================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id          VARCHAR(30)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(30)  NOT NULL,
  token_hash  VARCHAR(64)  NOT NULL,
  csrf_token  VARCHAR(64)  NOT NULL,
  expires_at  DATETIME(3)  NOT NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY sessions_token_hash_key (token_hash),
  KEY sessions_user_id_idx (user_id),
  KEY sessions_expires_at_idx (expires_at),

  CONSTRAINT sessions_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0009_sessions')
  ON DUPLICATE KEY UPDATE id = id;
