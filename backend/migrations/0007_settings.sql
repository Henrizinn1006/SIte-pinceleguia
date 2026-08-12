-- =====================================================================
-- 0007_settings
--
-- Portado de packages/db/prisma/schema.prisma (model Setting).
-- Configuração editável (hero da home, título de destaque, contato da
-- loja) — chave/valor, valor em JSON. MariaDB >= 10.2.7 e MySQL >= 5.7
-- suportam o tipo JSON nativamente (na MariaDB é um LONGTEXT com CHECK
-- de validade, não um tipo binário como o jsonb do Postgres, mas é
-- suficiente para configuração simples como esta).
--
-- Só expõe ao público as chaves conhecidas e seguras — ver
-- backend/src/Content/SettingsRepository.php::PUBLIC_KEYS.
-- =====================================================================

CREATE TABLE IF NOT EXISTS settings (
  `key`       VARCHAR(191) NOT NULL PRIMARY KEY,
  value       JSON NOT NULL,
  `group`     VARCHAR(100) NOT NULL DEFAULT 'geral',
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  KEY settings_group_idx (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0007_settings')
  ON DUPLICATE KEY UPDATE id = id;
