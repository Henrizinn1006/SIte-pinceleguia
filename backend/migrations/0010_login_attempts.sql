-- =====================================================================
-- 0010_login_attempts
--
-- Rate limit de login PERSISTENTE em banco — não em memória de processo
-- (PHP tradicional não mantém estado entre requisições; um array em
-- memória se perderia a cada request). Ver backend/src/Auth/RateLimiter.php.
-- =====================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id          VARCHAR(30)  NOT NULL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  ip_address  VARCHAR(45)  NOT NULL,
  success     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  KEY login_attempts_email_created_at_idx (email, created_at),
  KEY login_attempts_ip_created_at_idx (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0010_login_attempts')
  ON DUPLICATE KEY UPDATE id = id;
