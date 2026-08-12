-- =====================================================================
-- 0003_products
--
-- Portado de packages/db/prisma/schema.prisma (model Product).
--
-- Regras preservadas:
--  - Dinheiro SEMPRE em centavos, tipo INT (nunca DECIMAL/FLOAT).
--  - Exclusão lógica via deleted_at.
--  - Dimensões de frete (peso/largura/altura/comprimento) já previstas,
--    embora frete ainda não seja calculado nesta fase.
-- =====================================================================

CREATE TABLE IF NOT EXISTS products (
  id                    VARCHAR(30)  NOT NULL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  slug                  VARCHAR(255) NOT NULL,
  description           TEXT NOT NULL,
  short_description     VARCHAR(500) NULL,
  category_id           VARCHAR(30)  NOT NULL,

  base_price_in_cents   INT NOT NULL,
  sale_price_in_cents   INT NULL,
  sale_starts_at        DATETIME(3) NULL,
  sale_ends_at          DATETIME(3) NULL,

  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  is_featured           TINYINT(1) NOT NULL DEFAULT 0,
  position              INT NOT NULL DEFAULT 0,

  weight_in_grams       INT NULL,
  width_mm              INT NULL,
  height_mm             INT NULL,
  length_mm             INT NULL,

  meta_title            VARCHAR(255) NULL,
  meta_description      VARCHAR(500) NULL,
  deleted_at            DATETIME(3) NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY products_slug_key (slug),
  KEY products_is_active_is_featured_idx (is_active, is_featured),
  KEY products_category_id_is_active_idx (category_id, is_active),
  KEY products_is_active_created_at_idx (is_active, created_at),
  KEY products_is_active_base_price_in_cents_idx (is_active, base_price_in_cents),

  CONSTRAINT products_category_id_fk
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0003_products')
  ON DUPLICATE KEY UPDATE id = id;
