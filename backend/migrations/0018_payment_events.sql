-- =====================================================================
-- 0018_payment_events
--
-- Garante idempotência do webhook: o UNIQUE em gateway_event_id faz
-- com que reenviar o mesmo evento (o Mercado Pago reenvia se não
-- receber 200 a tempo) seja um no-op — ver
-- App\Payments\MercadoPagoWebhookHandler.
-- =====================================================================

CREATE TABLE IF NOT EXISTS payment_events (
  id                VARCHAR(30) NOT NULL PRIMARY KEY,
  payment_id        VARCHAR(30) NULL,
  gateway           VARCHAR(50) NOT NULL,
  gateway_event_id  VARCHAR(100) NOT NULL,
  event_type        VARCHAR(100) NOT NULL,
  payload           JSON NOT NULL,
  processed_at      DATETIME(3) NULL,
  error             VARCHAR(500) NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE KEY payment_events_gateway_event_id_key (gateway_event_id),
  KEY payment_events_processed_at_idx (processed_at),

  CONSTRAINT payment_events_payment_id_fk
    FOREIGN KEY (payment_id) REFERENCES payments (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0018_payment_events')
  ON DUPLICATE KEY UPDATE id = id;
