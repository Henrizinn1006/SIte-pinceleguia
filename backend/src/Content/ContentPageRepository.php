<?php

declare(strict_types=1);

namespace App\Content;

use PDO;

/**
 * Porta parcial de apps/storefront/src/modules/content/index.ts
 * (getContentPage / getAllContentPageSlugs).
 */
final class ContentPageRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT slug, title, content, meta_title, meta_description, is_placeholder, updated_at
             FROM content_pages
             WHERE slug = :slug AND is_published = 1
             LIMIT 1',
        );
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        return [
            'slug' => $row['slug'],
            'title' => $row['title'],
            'content' => $row['content'],
            'metaTitle' => $row['meta_title'],
            'metaDescription' => $row['meta_description'],
            'isPlaceholder' => (bool) $row['is_placeholder'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    /** @return array<int, string> */
    public function findAllSlugs(): array
    {
        $stmt = $this->db->query('SELECT slug FROM content_pages WHERE is_published = 1');
        return array_column($stmt->fetchAll(), 'slug');
    }
}
