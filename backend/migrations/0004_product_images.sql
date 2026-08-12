-- =====================================================================
-- 0004_product_images
--
-- Portado de packages/db/prisma/schema.prisma (model ProductImage).
-- `media_id`/biblioteca de mídia central (model Media) fica para uma
-- fase posterior (upload administrativo) — aqui as imagens seguem
-- direto por `url`, como já é o caso hoje mesmo no Next.js atual.
-- =====================================================================

CREATE TABLE IF NOT EXISTS product_images (
  id            VARCHAR(30)  NOT NULL PRIMARY KEY,
  product_id    VARCHAR(30)  NOT NULL,
  storage_key   VARCHAR(500) NULL,
  url           VARCHAR(500) NOT NULL,
  alt           VARCHAR(255) NOT NULL,
  width         INT NULL,
  height        INT NULL,
  blur_data_url TEXT NULL,
  position      INT NOT NULL DEFAULT 0,
  is_primary    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  KEY product_images_product_id_position_idx (product_id, position),

  CONSTRAINT product_images_product_id_fk
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0004_product_images')
  ON DUPLICATE KEY UPDATE id = id;
