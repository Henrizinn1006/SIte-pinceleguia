-- =====================================================================
-- 0002_categories
--
-- Portado de packages/db/prisma/schema.prisma (model Category).
-- Fonte da verdade é o schema.prisma atual, NÃO a migration Prisma
-- existente (packages/db/prisma/migrations/20260812035639_init), que
-- está desatualizada em relação ao schema — ver relatório da Fase 1.
--
-- Regras preservadas:
--  - Exclusão lógica via deleted_at (nunca DELETE físico daqui).
--  - Hierarquia via parent_id (auto-relacionamento).
--  - Coleção utf8mb4_unicode_ci em toda a base: resolve a busca
--    case-insensitive que no Postgres dependia de `mode: "insensitive"`
--    (recurso inexistente no MySQL/MariaDB).
-- =====================================================================

CREATE TABLE IF NOT EXISTS categories (
  id               VARCHAR(30)  NOT NULL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(255) NOT NULL,
  description      TEXT NULL,
  image_url        VARCHAR(500) NULL,
  image_alt        VARCHAR(255) NULL,
  parent_id        VARCHAR(30)  NULL,
  position         INT NOT NULL DEFAULT 0,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  show_on_home     TINYINT(1)   NOT NULL DEFAULT 0,
  meta_title       VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  deleted_at       DATETIME(3)  NULL,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY categories_slug_key (slug),
  KEY categories_parent_id_idx (parent_id),
  KEY categories_is_active_position_idx (is_active, position),
  KEY categories_show_on_home_position_idx (show_on_home, position),

  CONSTRAINT categories_parent_id_fk
    FOREIGN KEY (parent_id) REFERENCES categories (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0002_categories')
  ON DUPLICATE KEY UPDATE id = id;
