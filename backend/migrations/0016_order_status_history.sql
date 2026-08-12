-- =====================================================================
-- 0016_order_status_history
--
-- Trilha de toda transição de status do pedido — a máquina de estados
-- em App\Checkout\OrderStateMachine grava uma linha aqui a cada
-- mudança, além do timestamp específico (paid_at, shipped_at...) na
-- própria tabela orders.
-- =====================================================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id          VARCHAR(30) NOT NULL PRIMARY KEY,
  order_id    VARCHAR(30) NOT NULL,
  from_status ENUM('PENDING_PAYMENT','PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED','REFUNDED') NULL,
  to_status   ENUM('PENDING_PAYMENT','PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED','REFUNDED') NOT NULL,
  note        VARCHAR(500) NULL,
  changed_by  VARCHAR(255) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  KEY order_status_history_order_id_created_at_idx (order_id, created_at),

  CONSTRAINT order_status_history_order_id_fk
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0016_order_status_history')
  ON DUPLICATE KEY UPDATE id = id;
