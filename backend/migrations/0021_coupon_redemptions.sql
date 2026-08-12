-- =====================================================================
-- 0021_coupon_redemptions
--
-- Portado de packages/db/prisma/schema.prisma (model CouponRedemption),
-- sem `user_id` (não existe conta de cliente nesta migração — usa
-- `customer_email`, o mesmo snapshot já usado em `orders`). O UNIQUE em
-- (coupon_id, order_id) impede um pedido resgatar o mesmo cupom duas
-- vezes (ex.: em caso de retry do checkout).
-- =====================================================================

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id                          VARCHAR(30) NOT NULL PRIMARY KEY,
  coupon_id                   VARCHAR(30) NOT NULL,
  order_id                    VARCHAR(30) NOT NULL,
  customer_email             VARCHAR(255) NOT NULL,
  discount_applied_in_cents   INT NOT NULL,
  created_at                  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE KEY coupon_redemptions_coupon_id_order_id_key (coupon_id, order_id),
  KEY coupon_redemptions_coupon_id_email_idx (coupon_id, customer_email),

  CONSTRAINT coupon_redemptions_coupon_id_fk
    FOREIGN KEY (coupon_id) REFERENCES coupons (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT coupon_redemptions_order_id_fk
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0021_coupon_redemptions')
  ON DUPLICATE KEY UPDATE id = id;
