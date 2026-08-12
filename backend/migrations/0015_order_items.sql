-- =====================================================================
-- 0015_order_items
--
-- SNAPSHOT da linha do pedido. Consultar um pedido antigo NUNCA faz
-- JOIN em products para descobrir nome ou preço — por isso todos os
-- campos "de exibição" (nome, sku, imagem, preço) são copiados aqui no
-- momento da compra, não referenciados.
-- =====================================================================

CREATE TABLE IF NOT EXISTS order_items (
  id                   VARCHAR(30) NOT NULL PRIMARY KEY,
  order_id             VARCHAR(30) NOT NULL,
  product_id           VARCHAR(30) NULL,
  variant_id           VARCHAR(30) NULL,

  product_name         VARCHAR(255) NOT NULL,
  variant_name         VARCHAR(255) NULL,
  sku                  VARCHAR(100) NULL,
  image_url            VARCHAR(500) NULL,
  unit_price_in_cents  INT NOT NULL,
  quantity             INT NOT NULL,
  subtotal_in_cents    INT NOT NULL,

  created_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  KEY order_items_order_id_idx (order_id),

  CONSTRAINT order_items_order_id_fk
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT order_items_product_id_fk
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT order_items_variant_id_fk
    FOREIGN KEY (variant_id) REFERENCES product_variants (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0015_order_items')
  ON DUPLICATE KEY UPDATE id = id;
