<?php

declare(strict_types=1);

namespace App\Catalog;

use PDO;

/**
 * Porta de packages/commerce/src/catalog/infrastructure/category.repository.ts.
 * Único ponto que roda SQL para categorias — nada mais no backend
 * monta essa query.
 */
final class CategoryRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** Categorias marcadas para aparecer na home. @return array<int, array<string, mixed>> */
    public function findHomeCategories(): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, slug, name, description, image_url, image_alt
             FROM categories
             WHERE is_active = 1 AND deleted_at IS NULL AND show_on_home = 1
             ORDER BY position ASC',
        );
        $stmt->execute();

        return array_map([self::class, 'toView'], $stmt->fetchAll());
    }

    /** Todas as categorias ativas, com contagem de produtos. @return array<int, array<string, mixed>> */
    public function findAllCategories(): array
    {
        $stmt = $this->db->prepare(
            'SELECT c.id, c.slug, c.name, c.description, c.image_url, c.image_alt,
                    (SELECT COUNT(*) FROM products p
                     WHERE p.category_id = c.id AND p.is_active = 1 AND p.deleted_at IS NULL) AS product_count
             FROM categories c
             WHERE c.is_active = 1 AND c.deleted_at IS NULL
             ORDER BY c.position ASC',
        );
        $stmt->execute();

        return array_map(function (array $row): array {
            $view = self::toView($row);
            $view['productCount'] = (int) $row['product_count'];
            return $view;
        }, $stmt->fetchAll());
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, slug, name, description, image_url, image_alt, meta_title, meta_description
             FROM categories
             WHERE slug = :slug AND is_active = 1 AND deleted_at IS NULL
             LIMIT 1',
        );
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        $view = self::toView($row);
        $view['metaTitle'] = $row['meta_title'];
        $view['metaDescription'] = $row['meta_description'];
        return $view;
    }

    /** @return array<int, string> */
    public function findAllSlugs(): array
    {
        $stmt = $this->db->query(
            'SELECT slug FROM categories WHERE is_active = 1 AND deleted_at IS NULL',
        );
        return array_column($stmt->fetchAll(), 'slug');
    }

    /** @param array<string, mixed> $row */
    private static function toView(array $row): array
    {
        return [
            'id' => $row['id'],
            'slug' => $row['slug'],
            'name' => $row['name'],
            'description' => $row['description'],
            'imageUrl' => $row['image_url'],
            'imageAlt' => $row['image_alt'],
        ];
    }
}
