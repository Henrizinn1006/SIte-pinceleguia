-- =====================================================================
-- 0020_coupons
--
-- Portado de packages/db/prisma/schema.prisma (model Coupon).
-- `discount_value` é dual-purpose conforme discount_type: percentual
-- inteiro (PERCENTAGE) ou centavos (FIXED) — mesma convenção do
-- original, documentada ali por comentário.
-- =====================================================================

CREATE TABLE IF NOT EXISTS coupons (
  id                        VARCHAR(30)  NOT NULL PRIMARY KEY,
  code                      VARCHAR(50)  NOT NULL,
  description               VARCHAR(255) NULL,
  discount_type             ENUM('PERCENTAGE','FIXED') NOT NULL,
  discount_value            INT NOT NULL,
  min_order_in_cents        INT NULL,
  max_discount_in_cents     INT NULL,
  starts_at                 DATETIME(3) NULL,
  ends_at                   DATETIME(3) NULL,
  usage_limit               INT NULL,
  usage_count               INT NOT NULL DEFAULT 0,
  usage_limit_per_customer  INT NULL,
  is_active                 TINYINT(1) NOT NULL DEFAULT 1,
  created_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY coupons_code_key (code),
  KEY coupons_code_is_active_idx (code, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0020_coupons')
  ON DUPLICATE KEY UPDATE id = id;
