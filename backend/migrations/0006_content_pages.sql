-- =====================================================================
-- 0006_content_pages
--
-- Portado de packages/db/prisma/schema.prisma (model ContentPage).
-- Páginas institucionais (Sobre, Contato, Políticas...). `is_placeholder`
-- controla o aviso de "conteúdo provisório" e o noindex — ver
-- backend/src/Content/ContentPageRepository.php e o relatório da Fase 1
-- sobre por que esse conteúdo ainda é fictício.
-- =====================================================================

CREATE TABLE IF NOT EXISTS content_pages (
  id                VARCHAR(30)  NOT NULL PRIMARY KEY,
  slug              VARCHAR(255) NOT NULL,
  title             VARCHAR(255) NOT NULL,
  content           TEXT NOT NULL,
  meta_title        VARCHAR(255) NULL,
  meta_description  VARCHAR(500) NULL,
  is_published      TINYINT(1) NOT NULL DEFAULT 0,
  is_placeholder    TINYINT(1) NOT NULL DEFAULT 1,
  position          INT NOT NULL DEFAULT 0,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE KEY content_pages_slug_key (slug),
  KEY content_pages_slug_is_published_idx (slug, is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (id) VALUES ('0006_content_pages')
  ON DUPLICATE KEY UPDATE id = id;
