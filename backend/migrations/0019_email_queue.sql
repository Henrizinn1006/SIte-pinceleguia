-- =====================================================================
-- 0019_email_queue
--
-- Não existe no schema.prisma original (só uma menção a Resend nas
-- variáveis de ambiente, sem tabela). Fila simples processada por
-- Cron Job — ver backend/cron/processar-fila-email.php — em vez de
-- enviar e-mail de forma síncrona no meio de uma requisição HTTP
-- (se o SMTP da Hostinger estiver lento, o cliente não fica esperando
-- a confirmação do pedido travada nisso).
-- =====================================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id               VARCHAR(30) NOT NULL PRIMARY KEY,
  to_email         VARCHAR(255) NOT NULL,
  to_name          VARCHAR(255) NULL,
  subject          VARCHAR(255) NOT NULL,
  body_html        TEXT NOT NULL,
  body_text        TEXT NULL,
  status           ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  attempts         INT NOT NULL DEFAULT 0,
  last_error       VARCHAR(500) NULL,
  related_order_id VARCHAR(30) NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  sent_at          DATETIME(3) NULL,

  KEY email_queue_status_created_at_idx (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0019_email_queue')
  ON DUPLICATE KEY UPDATE id = id;
