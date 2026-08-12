-- =====================================================================
-- 0017_payments
--
-- Cartão: APENAS bandeira e 4 últimos dígitos. Número completo, CVV e
-- validade NUNCA são armazenados — isso nem chega no nosso backend
-- (Mercado Pago Bricks/Checkout Pro tokeniza no navegador do cliente).
-- `raw_response` guarda o payload já sanitizado da API do gateway,
-- para depuração, nunca dado sensível.
-- =====================================================================

CREATE TABLE IF NOT EXISTS payments (
  id                    VARCHAR(30) NOT NULL PRIMARY KEY,
  order_id              VARCHAR(30) NOT NULL,
  gateway               VARCHAR(50) NOT NULL DEFAULT 'mercadopago',
  gateway_payment_id    VARCHAR(100) NULL,
  method                ENUM('PIX','CREDIT_CARD','DEBIT_CARD','BOLETO') NOT NULL,
  status                ENUM('PENDING','APPROVED','IN_PROCESS','REJECTED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  amount_in_cents       INT NOT NULL,
  installments          INT NULL,

  pix_qr_code           TEXT NULL,
  pix_qr_code_base64    TEXT NULL,
  pix_expires_at        DATETIME(3) NULL,

  card_brand            VARCHAR(30) NULL,
  card_last_four        VARCHAR(4)  NULL,

  rejection_reason      VARCHAR(255) NULL,
  raw_response          JSON NULL,
  paid_at               DATETIME(3) NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY payments_gateway_payment_id_key (gateway_payment_id),
  KEY payments_order_id_idx (order_id),
  KEY payments_status_created_at_idx (status, created_at),

  CONSTRAINT payments_order_id_fk
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0017_payments')
  ON DUPLICATE KEY UPDATE id = id;
