<?php

declare(strict_types=1);

namespace App\Admin;

use App\Http\ValidationException;
use PDO;

/**
 * CRUD administrativo de categorias. Diferente de
 * App\Catalog\CategoryRepository (só leitura pública, só ativas): aqui
 * o painel precisa ver e editar categorias inativas também.
 */
final class CategoryAdminRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<int, array<string, mixed>> */
    public function listAll(): array
    {
        $stmt = $this->db->query(
            'SELECT c.id, c.slug, c.name, c.description, c.image_url, c.image_alt, c.parent_id,
                    c.position, c.is_active, c.show_on_home, c.meta_title, c.meta_description,
                    c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS product_count
             FROM categories c
             WHERE c.deleted_at IS NULL
             ORDER BY c.position ASC, c.name ASC',
        );
        return array_map([self::class, 'toView'], $stmt->fetchAll());
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM categories WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : self::toView($row);
    }

    /** @param array<string, mixed> $data */
    public function create(array $data): string
    {
        $this->assertSlugAvailable($data['slug']);

        $id = 'c' . bin2hex(random_bytes(12));
        $stmt = $this->db->prepare(
            'INSERT INTO categories (id, name, slug, description, image_url, image_alt, parent_id, position,
                 is_active, show_on_home, meta_title, meta_description)
             VALUES (:id, :name, :slug, :description, :imageUrl, :imageAlt, :parentId, :position,
                 :isActive, :showOnHome, :metaTitle, :metaDescription)',
        );
        $stmt->execute([
            'id' => $id, 'name' => $data['name'], 'slug' => $data['slug'],
            'description' => $data['description'] ?? null, 'imageUrl' => $data['imageUrl'] ?? null,
            'imageAlt' => $data['imageAlt'] ?? null, 'parentId' => $data['parentId'] ?? null,
            'position' => $data['position'] ?? 0, 'isActive' => ($data['isActive'] ?? true) ? 1 : 0,
            'showOnHome' => ($data['showOnHome'] ?? false) ? 1 : 0,
            'metaTitle' => $data['metaTitle'] ?? null, 'metaDescription' => $data['metaDescription'] ?? null,
        ]);
        return $id;
    }

    /** @param array<string, mixed> $data @return array<string, array{de: mixed, para: mixed}> campos alterados, para auditoria */
    public function update(string $id, array $data): array
    {
        $current = $this->findById($id);
        if ($current === null) {
            throw new ValidationException('Categoria não encontrada.');
        }

        if (isset($data['slug']) && $data['slug'] !== $current['slug']) {
            $this->assertSlugAvailable($data['slug'], $id);
        }

        $fields = ['name', 'slug', 'description', 'imageUrl', 'imageAlt', 'parentId', 'position', 'isActive', 'showOnHome', 'metaTitle', 'metaDescription'];
        $columns = ['name' => 'name', 'slug' => 'slug', 'description' => 'description', 'imageUrl' => 'image_url', 'imageAlt' => 'image_alt', 'parentId' => 'parent_id', 'position' => 'position', 'isActive' => 'is_active', 'showOnHome' => 'show_on_home', 'metaTitle' => 'meta_title', 'metaDescription' => 'meta_description'];

        $sets = [];
        $params = ['id' => $id];
        $changes = [];

        foreach ($fields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            $column = $columns[$field];
            $sets[] = "{$column} = :{$field}";
            $params[$field] = is_bool($value) ? (int) $value : $value;

            if ($current[$field] !== $value) {
                $changes[$field] = ['de' => $current[$field], 'para' => $value];
            }
        }

        if ($sets === []) {
            return [];
        }

        $sql = 'UPDATE categories SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $this->db->prepare($sql)->execute($params);

        return $changes;
    }

    public function softDelete(string $id): void
    {
        $countStmt = $this->db->prepare(
            'SELECT COUNT(*) AS total FROM products WHERE category_id = :id AND deleted_at IS NULL',
        );
        $countStmt->execute(['id' => $id]);
        if ((int) $countStmt->fetch()['total'] > 0) {
            throw new ValidationException('Não é possível excluir uma categoria com produtos ativos. Mova ou remova os produtos primeiro.');
        }

        $stmt = $this->db->prepare('UPDATE categories SET deleted_at = :now WHERE id = :id');
        $stmt->execute(['now' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'), 'id' => $id]);
    }

    private function assertSlugAvailable(string $slug, ?string $excludingId = null): void
    {
        $sql = 'SELECT id FROM categories WHERE slug = :slug AND deleted_at IS NULL';
        $params = ['slug' => $slug];
        if ($excludingId !== null) {
            $sql .= ' AND id != :excludingId';
            $params['excludingId'] = $excludingId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        if ($stmt->fetch() !== false) {
            throw new ValidationException("Já existe uma categoria com o slug \"{$slug}\".");
        }
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
            'parentId' => $row['parent_id'],
            'position' => (int) $row['position'],
            'isActive' => (bool) $row['is_active'],
            'showOnHome' => (bool) $row['show_on_home'],
            'metaTitle' => $row['meta_title'],
            'metaDescription' => $row['meta_description'],
            'productCount' => isset($row['product_count']) ? (int) $row['product_count'] : null,
        ];
    }
}
