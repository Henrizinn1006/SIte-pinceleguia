-- =====================================================================
-- 0012_carts / 0013_cart_items (mesmo arquivo — sempre criadas juntas)
--
-- Portado de packages/db/prisma/schema.prisma (models Cart, CartItem),
-- restrito a carrinho de VISITANTE (sem conta de cliente ainda — não
-- existe cadastro/login de cliente nesta fase, só o carrinho por
-- `session_token`, um cookie opaco gerado no primeiro acesso).
-- `coupon_id` do schema original fica de fora: cupons são Fase 4.
-- =====================================================================

CREATE TABLE IF NOT EXISTS carts (
  id             VARCHAR(30)  NOT NULL PRIMARY KEY,
  session_token  VARCHAR(64)  NOT NULL,
  expires_at     DATETIME(3)  NOT NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY carts_session_token_key (session_token),
  KEY carts_expires_at_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0012_carts')
  ON DUPLICATE KEY UPDATE id = id;
