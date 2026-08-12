-- =====================================================================
-- 0008_users
--
-- Portado de packages/db/prisma/schema.prisma (model User), reduzido
-- para o que a Fase 2 precisa: só quem acessa o painel. `is_admin`
-- substitui o RBAC completo (Role/Permission/RolePermission/UserRole)
-- do schema original — deliberadamente adiado, conforme
-- "Adie para depois do lançamento: múltiplos papéis se apenas uma
-- pessoa usar o painel". Endereço, carrinho e pedidos (que também
-- referenciam User no schema original) ficam para quando essas
-- features existirem (Fase 3+).
--
-- Não há cadastro público: a única forma de criar o primeiro usuário é
-- o script CLI backend/bin/criar-admin.php — ver docs/13 do projeto
-- original sobre o risco de formulário de registro em painel admin.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id             VARCHAR(30)  NOT NULL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  is_admin       TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at  DATETIME(3)  NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY users_email_key (email),
  KEY users_is_active_idx (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0008_users')
  ON DUPLICATE KEY UPDATE id = id;
