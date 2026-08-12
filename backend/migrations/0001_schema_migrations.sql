-- =====================================================================
-- 0001_schema_migrations
--
-- Tabela de controle: cada migration aplicada grava uma linha aqui.
-- O script backend/bin/migrate.php (a criar em fase futura) ou a
-- importação manual via phpMyAdmin deve pular arquivos já registrados.
-- =====================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id           VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0001_schema_migrations')
  ON DUPLICATE KEY UPDATE id = id;
