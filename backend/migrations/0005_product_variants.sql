-- =====================================================================
-- 0005_product_variants
--
-- Portado de packages/db/prisma/schema.prisma (model ProductVariant).
-- Todo produto tem ao menos uma variante "Padrão" — é dela que vem o
-- estoque e o preço efetivo (ver backend/src/Catalog/Pricing.php).
-- =====================================================================

CREATE TABLE IF NOT EXISTS product_variants (
  id                   VARCHAR(30)  NOT NULL PRIMARY KEY,
  product_id           VARCHAR(30)  NOT NULL,
  sku                  VARCHAR(100) NOT NULL,
  name                 VARCHAR(255) NOT NULL DEFAULT 'Padrão',
  price_in_cents       INT NULL,
  sale_price_in_cents  INT NULL,
  stock                INT NOT NULL DEFAULT 0,
  is_active            TINYINT(1) NOT NULL DEFAULT 1,
  position             INT NOT NULL DEFAULT 0,

  weight_in_grams      INT NULL,
  width_mm             INT NULL,
  height_mm            INT NULL,
  length_mm            INT NULL,

  created_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY product_variants_sku_key (sku),
  KEY product_variants_product_id_position_idx (product_id, position),

  CONSTRAINT product_variants_product_id_fk
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0005_product_variants')
  ON DUPLICATE KEY UPDATE id = id;
