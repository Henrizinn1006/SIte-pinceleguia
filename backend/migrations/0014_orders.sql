-- =====================================================================
-- 0014_orders
--
-- Portado de packages/db/prisma/schema.prisma (model Order), sem
-- `user_id`/`coupon_id` (sem conta de cliente nem cupom nesta fase —
-- `coupon_code` fica como texto solto, não FK, para o dia em que
-- cupons existirem sem precisar migrar dado).
--
-- Guarda SNAPSHOT do cliente e do endereço — nunca depende de uma
-- tabela `users` que não existe ainda, e nunca muda retroativamente
-- se o cliente pedir para corrigir o endereço de um pedido já feito.
-- =====================================================================

CREATE TABLE IF NOT EXISTS orders (
  id                       VARCHAR(30)  NOT NULL PRIMARY KEY,
  order_number             VARCHAR(30)  NOT NULL,
  status                   ENUM('PENDING_PAYMENT','PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED','REFUNDED')
                            NOT NULL DEFAULT 'PENDING_PAYMENT',

  customer_name            VARCHAR(255) NOT NULL,
  customer_email           VARCHAR(255) NOT NULL,
  customer_phone           VARCHAR(30)  NOT NULL,
  customer_document        VARCHAR(20)  NULL,

  shipping_zip_code        VARCHAR(9)   NOT NULL,
  shipping_street          VARCHAR(255) NOT NULL,
  shipping_number          VARCHAR(20)  NOT NULL,
  shipping_complement      VARCHAR(255) NULL,
  shipping_district        VARCHAR(255) NOT NULL,
  shipping_city            VARCHAR(255) NOT NULL,
  shipping_state           VARCHAR(2)   NOT NULL,

  subtotal_in_cents        INT NOT NULL,
  shipping_in_cents        INT NOT NULL DEFAULT 0,
  discount_in_cents        INT NOT NULL DEFAULT 0,
  total_in_cents           INT NOT NULL,

  shipping_method          VARCHAR(100) NULL,
  shipping_carrier         VARCHAR(100) NULL,
  estimated_delivery_days  INT NULL,

  coupon_code              VARCHAR(50)  NULL,

  customer_note            TEXT NULL,
  internal_note            TEXT NULL,

  tracking_token           VARCHAR(64)  NOT NULL,

  paid_at                  DATETIME(3)  NULL,
  shipped_at               DATETIME(3)  NULL,
  delivered_at             DATETIME(3)  NULL,
  cancelled_at              DATETIME(3)  NULL,
  created_at               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY orders_order_number_key (order_number),
  UNIQUE KEY orders_tracking_token_key (tracking_token),
  KEY orders_user_created_idx (customer_email, created_at),
  KEY orders_status_created_idx (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0014_orders')
  ON DUPLICATE KEY UPDATE id = id;
