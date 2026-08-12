-- =====================================================================
-- 0011_audit_logs
--
-- Portado de packages/db/prisma/schema.prisma (model AuditLog). Toda
-- alteração administrativa relevante — e toda tentativa NEGADA por
-- falta de permissão — entra aqui. `changes` guarda só os campos
-- alterados, com valores sensíveis mascarados antes de chegar no
-- banco (ver backend/src/Audit/AuditLogger.php) — nunca senha, token
-- ou segredo de gateway.
-- =====================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id           VARCHAR(30)  NOT NULL PRIMARY KEY,
  user_id      VARCHAR(30)  NULL,
  user_email   VARCHAR(255) NOT NULL,
  action       VARCHAR(190) NOT NULL,
  entity_type  VARCHAR(100) NOT NULL,
  entity_id    VARCHAR(30)  NULL,
  entity_label VARCHAR(255) NULL,
  changes      JSON NULL,
  denied       TINYINT(1)   NOT NULL DEFAULT 0,
  ip_address   VARCHAR(45)  NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  KEY audit_logs_created_at_idx (created_at),
  KEY audit_logs_user_id_created_at_idx (user_id, created_at),
  KEY audit_logs_entity_type_entity_id_idx (entity_type, entity_id),
  KEY audit_logs_action_created_at_idx (action, created_at),

  CONSTRAINT audit_logs_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0011_audit_logs')
  ON DUPLICATE KEY UPDATE id = id;
