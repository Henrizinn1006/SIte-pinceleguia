-- =====================================================================
-- 0013_cart_items
--
-- O carrinho NUNCA guarda preço — só quantidade. O preço é sempre
-- resolvido na hora de exibir/finalizar, via App\Catalog\Pricing, para
-- nunca vender por um preço desatualizado (promoção que já acabou,
-- reajuste feito pelo admin depois do item ter sido adicionado).
-- =====================================================================

CREATE TABLE IF NOT EXISTS cart_items (
  id          VARCHAR(30) NOT NULL PRIMARY KEY,
  cart_id     VARCHAR(30) NOT NULL,
  variant_id  VARCHAR(30) NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY cart_items_cart_id_variant_id_key (cart_id, variant_id),

  CONSTRAINT cart_items_cart_id_fk
    FOREIGN KEY (cart_id) REFERENCES carts (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT cart_items_variant_id_fk
    FOREIGN KEY (variant_id) REFERENCES product_variants (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0013_cart_items')
  ON DUPLICATE KEY UPDATE id = id;
