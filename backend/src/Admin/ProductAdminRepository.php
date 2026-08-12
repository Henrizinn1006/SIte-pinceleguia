<?php

declare(strict_types=1);

namespace App\Admin;

use App\Http\ValidationException;
use PDO;

/**
 * CRUD administrativo de produtos — inclui inativos/sem estoque
 * (diferente de App\Catalog\ProductRepository, só leitura pública).
 * Todo produto criado aqui ganha uma variante "Padrão" automaticamente,
 * mesma convenção do seed (ver docs/03 do projeto original: "todo
 * produto tem ao menos uma variante").
 */
final class ProductAdminRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<int, array<string, mixed>> */
    public function listAll(): array
    {
        $stmt = $this->db->query(
            'SELECT p.id, p.slug, p.name, p.category_id, c.name AS category_name, p.base_price_in_cents,
                    p.sale_price_in_cents, p.is_active, p.is_featured, p.position, p.updated_at,
                    (SELECT COALESCE(SUM(v.stock), 0) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1) AS total_stock
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.deleted_at IS NULL
             ORDER BY p.updated_at DESC',
        );
        return array_map(fn (array $row): array => [
            'id' => $row['id'], 'slug' => $row['slug'], 'name' => $row['name'],
            'categoryId' => $row['category_id'], 'categoryName' => $row['category_name'],
            'basePriceInCents' => (int) $row['base_price_in_cents'],
            'salePriceInCents' => $row['sale_price_in_cents'] !== null ? (int) $row['sale_price_in_cents'] : null,
            'isActive' => (bool) $row['is_active'], 'isFeatured' => (bool) $row['is_featured'],
            'position' => (int) $row['position'], 'totalStock' => (int) $row['total_stock'],
            'updatedAt' => $row['updated_at'],
        ], $stmt->fetchAll());
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM products WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        $variantsStmt = $this->db->prepare(
            'SELECT id, sku, name, price_in_cents, sale_price_in_cents, stock, is_active, position
             FROM product_variants WHERE product_id = :id ORDER BY position ASC',
        );
        $variantsStmt->execute(['id' => $id]);

        $imagesStmt = $this->db->prepare(
            'SELECT id, url, alt, width, height, position, is_primary
             FROM product_images WHERE product_id = :id ORDER BY is_primary DESC, position ASC',
        );
        $imagesStmt->execute(['id' => $id]);

        return [
            ...self::toEditableFields($row),
            'id' => $row['id'],
            'variants' => $variantsStmt->fetchAll(),
            'images' => $imagesStmt->fetchAll(),
        ];
    }

    /** @param array<string, mixed> $data */
    public function create(array $data): string
    {
        $this->assertSlugAvailable($data['slug']);

        $id = 'c' . bin2hex(random_bytes(12));
        $stmt = $this->db->prepare(
            'INSERT INTO products (id, name, slug, description, short_description, category_id,
                 base_price_in_cents, sale_price_in_cents, sale_starts_at, sale_ends_at,
                 is_active, is_featured, position, weight_in_grams, width_mm, height_mm, length_mm,
                 meta_title, meta_description)
             VALUES (:id, :name, :slug, :description, :shortDescription, :categoryId,
                 :basePrice, :salePrice, :saleStartsAt, :saleEndsAt,
                 :isActive, :isFeatured, :position, :weight, :width, :height, :length,
                 :metaTitle, :metaDescription)',
        );
        $stmt->execute([
            'id' => $id, 'name' => $data['name'], 'slug' => $data['slug'],
            'description' => $data['description'], 'shortDescription' => $data['shortDescription'] ?? null,
            'categoryId' => $data['categoryId'], 'basePrice' => $data['basePriceInCents'],
            'salePrice' => $data['salePriceInCents'] ?? null,
            'saleStartsAt' => $data['saleStartsAt'] ?? null, 'saleEndsAt' => $data['saleEndsAt'] ?? null,
            'isActive' => ($data['isActive'] ?? true) ? 1 : 0, 'isFeatured' => ($data['isFeatured'] ?? false) ? 1 : 0,
            'position' => $data['position'] ?? 0, 'weight' => $data['weightInGrams'] ?? null,
            'width' => $data['widthMm'] ?? null, 'height' => $data['heightMm'] ?? null, 'length' => $data['lengthMm'] ?? null,
            'metaTitle' => $data['metaTitle'] ?? null, 'metaDescription' => $data['metaDescription'] ?? null,
        ]);

        $variantId = 'c' . bin2hex(random_bytes(12));
        $sku = $data['sku'] ?? self::slugToSku($data['slug']);
        $variantStmt = $this->db->prepare(
            'INSERT INTO product_variants (id, product_id, sku, name, stock, is_active, position)
             VALUES (:id, :productId, :sku, :name, :stock, 1, 0)',
        );
        $variantStmt->execute(['id' => $variantId, 'productId' => $id, 'sku' => $sku, 'name' => 'Padrão', 'stock' => $data['initialStock'] ?? 0]);

        return $id;
    }

    /** @param array<string, mixed> $data @return array<string, array{de: mixed, para: mixed}> */
    public function update(string $id, array $data): array
    {
        $current = $this->db->prepare('SELECT * FROM products WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $current->execute(['id' => $id]);
        $currentRow = $current->fetch();
        if ($currentRow === false) {
            throw new ValidationException('Produto não encontrado.');
        }

        if (isset($data['slug']) && $data['slug'] !== $currentRow['slug']) {
            $this->assertSlugAvailable($data['slug'], $id);
        }

        $columns = [
            'name' => 'name', 'slug' => 'slug', 'description' => 'description', 'shortDescription' => 'short_description',
            'categoryId' => 'category_id', 'basePriceInCents' => 'base_price_in_cents', 'salePriceInCents' => 'sale_price_in_cents',
            'saleStartsAt' => 'sale_starts_at', 'saleEndsAt' => 'sale_ends_at', 'isActive' => 'is_active',
            'isFeatured' => 'is_featured', 'position' => 'position', 'weightInGrams' => 'weight_in_grams',
            'widthMm' => 'width_mm', 'heightMm' => 'height_mm', 'lengthMm' => 'length_mm',
            'metaTitle' => 'meta_title', 'metaDescription' => 'meta_description',
        ];

        $currentView = self::toEditableFields($currentRow);
        $sets = [];
        $params = ['id' => $id];
        $changes = [];

        foreach ($columns as $field => $column) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            $sets[] = "{$column} = :{$field}";
            $params[$field] = is_bool($value) ? (int) $value : $value;

            if (($currentView[$field] ?? null) !== $value) {
                $changes[$field] = ['de' => $currentView[$field] ?? null, 'para' => $value];
            }
        }

        if ($sets !== []) {
            $sql = 'UPDATE products SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $this->db->prepare($sql)->execute($params);
        }

        return $changes;
    }

    public function softDelete(string $id): void
    {
        $stmt = $this->db->prepare('UPDATE products SET deleted_at = :now, is_active = 0 WHERE id = :id');
        $stmt->execute(['now' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'), 'id' => $id]);
    }

    /** @return array{de: int, para: int}|null null quando o valor não mudou */
    public function updateVariantStock(string $variantId, int $newStock): ?array
    {
        if ($newStock < 0) {
            throw new ValidationException('Estoque não pode ser negativo.');
        }

        $stmt = $this->db->prepare('SELECT stock FROM product_variants WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $variantId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new ValidationException('Variação não encontrada.');
        }

        $before = (int) $row['stock'];
        if ($before === $newStock) {
            return null;
        }

        $update = $this->db->prepare('UPDATE product_variants SET stock = :stock WHERE id = :id');
        $update->execute(['stock' => $newStock, 'id' => $variantId]);

        return ['de' => $before, 'para' => $newStock];
    }

    private function assertSlugAvailable(string $slug, ?string $excludingId = null): void
    {
        $sql = 'SELECT id FROM products WHERE slug = :slug AND deleted_at IS NULL';
        $params = ['slug' => $slug];
        if ($excludingId !== null) {
            $sql .= ' AND id != :excludingId';
            $params['excludingId'] = $excludingId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        if ($stmt->fetch() !== false) {
            throw new ValidationException("Já existe um produto com o slug \"{$slug}\".");
        }
    }

    private static function slugToSku(string $slug): string
    {
        $sku = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', $slug) ?? $slug);
        return substr($sku, 0, 40) . '-' . substr(bin2hex(random_bytes(2)), 0, 4);
    }

    /** @param array<string, mixed> $row */
    private static function toEditableFields(array $row): array
    {
        return [
            'name' => $row['name'], 'slug' => $row['slug'], 'description' => $row['description'],
            'shortDescription' => $row['short_description'], 'categoryId' => $row['category_id'],
            'basePriceInCents' => (int) $row['base_price_in_cents'],
            'salePriceInCents' => $row['sale_price_in_cents'] !== null ? (int) $row['sale_price_in_cents'] : null,
            'saleStartsAt' => $row['sale_starts_at'], 'saleEndsAt' => $row['sale_ends_at'],
            'isActive' => (bool) $row['is_active'], 'isFeatured' => (bool) $row['is_featured'],
            'position' => (int) $row['position'],
            'weightInGrams' => $row['weight_in_grams'] !== null ? (int) $row['weight_in_grams'] : null,
            'widthMm' => $row['width_mm'] !== null ? (int) $row['width_mm'] : null,
            'heightMm' => $row['height_mm'] !== null ? (int) $row['height_mm'] : null,
            'lengthMm' => $row['length_mm'] !== null ? (int) $row['length_mm'] : null,
            'metaTitle' => $row['meta_title'], 'metaDescription' => $row['meta_description'],
        ];
    }
}
