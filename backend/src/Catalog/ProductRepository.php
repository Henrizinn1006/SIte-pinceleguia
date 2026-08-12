<?php

declare(strict_types=1);

namespace App\Catalog;

use PDO;

/**
 * Porta de packages/commerce/src/catalog/infrastructure/product.repository.ts.
 *
 * Diferenças deliberadas em relação ao original Prisma:
 *  - `mode: "insensitive"` do Postgres não existe no MySQL/MariaDB;
 *    a busca por nome/descrição depende da collation utf8mb4_unicode_ci
 *    definida nas migrations (0002/0003), que já é case-insensitive.
 *  - Sem geração de SQL dinâmica via ORM: o WHERE é montado à mão com
 *    parâmetros nomeados, sempre via prepared statement.
 */
final class ProductRepository
{
    private const LOW_STOCK_THRESHOLD = 2;

    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array{items: array<int, array<string, mixed>>, total: int, page: int, pageSize: int, totalPages: int, hasNext: bool, hasPrevious: bool} */
    public function findProducts(ProductFilters $filters): array
    {
        [$where, $params] = $this->buildWhere($filters);
        $orderBy = $this->buildOrderBy($filters);
        $page = $filters->pagina;
        $pageSize = ProductFilters::PAGE_SIZE;
        $offset = ($page - 1) * $pageSize;

        $countStmt = $this->db->prepare("SELECT COUNT(*) AS total FROM products p WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $totalPages = max(1, (int) ceil($total / $pageSize));

        $sql = "SELECT p.id FROM products p WHERE {$where} ORDER BY {$orderBy} LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $ids = array_column($stmt->fetchAll(), 'id');

        $items = $ids === [] ? [] : $this->hydrateListItems($ids, $orderBy);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
            'totalPages' => $totalPages,
            'hasNext' => $page < $totalPages,
            'hasPrevious' => $page > 1,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function findFeaturedProducts(int $limit = 6): array
    {
        $stmt = $this->db->prepare(
            'SELECT id FROM products
             WHERE is_active = 1 AND deleted_at IS NULL AND is_featured = 1
             ORDER BY position ASC, created_at DESC
             LIMIT :limit',
        );
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $ids = array_column($stmt->fetchAll(), 'id');

        return $ids === [] ? [] : $this->hydrateListItems($ids, 'p.position ASC, p.created_at DESC');
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT p.*, c.name AS category_name, c.slug AS category_slug
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.slug = :slug AND p.is_active = 1 AND p.deleted_at IS NULL
             LIMIT 1',
        );
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        return $this->toDetail($row);
    }

    /** @return array<int, array<string, mixed>> */
    public function findRelatedProducts(string $productId, string $categorySlug, int $limit = 4): array
    {
        $stmt = $this->db->prepare(
            'SELECT p.id
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.is_active = 1 AND p.deleted_at IS NULL
               AND p.id != :productId
               AND c.slug = :categorySlug
             ORDER BY p.is_featured DESC, p.created_at DESC
             LIMIT :limit',
        );
        $stmt->bindValue(':productId', $productId);
        $stmt->bindValue(':categorySlug', $categorySlug);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $ids = array_column($stmt->fetchAll(), 'id');

        return $ids === [] ? [] : $this->hydrateListItems($ids, 'p.is_featured DESC, p.created_at DESC');
    }

    /** @return array<int, string> */
    public function findAllSlugs(): array
    {
        $stmt = $this->db->query(
            'SELECT slug FROM products WHERE is_active = 1 AND deleted_at IS NULL ORDER BY updated_at DESC',
        );
        return array_column($stmt->fetchAll(), 'slug');
    }

    /** @return array{minInCents: int, maxInCents: int} */
    public function getPriceRange(): array
    {
        $stmt = $this->db->query(
            'SELECT MIN(base_price_in_cents) AS min_price, MAX(base_price_in_cents) AS max_price
             FROM products WHERE is_active = 1 AND deleted_at IS NULL',
        );
        $row = $stmt->fetch();

        return [
            'minInCents' => (int) ($row['min_price'] ?? 0),
            'maxInCents' => (int) ($row['max_price'] ?? 0),
        ];
    }

    /**
     * @return array{0: string, 1: array<string, mixed>}
     */
    private function buildWhere(ProductFilters $filters): array
    {
        $conditions = ['p.is_active = 1', 'p.deleted_at IS NULL'];
        $params = [];

        if ($filters->categoria !== null) {
            $conditions[] = 'p.category_id = (SELECT id FROM categories WHERE slug = :categoria AND is_active = 1 LIMIT 1)';
            $params['categoria'] = $filters->categoria;
        }

        if ($filters->q !== null) {
            $conditions[] = '(p.name LIKE :q1 OR p.short_description LIKE :q2 OR p.description LIKE :q3)';
            $like = '%' . $filters->q . '%';
            $params['q1'] = $like;
            $params['q2'] = $like;
            $params['q3'] = $like;
        }

        if ($filters->precoMin !== null) {
            $conditions[] = 'p.base_price_in_cents >= :precoMin';
            $params['precoMin'] = $filters->precoMin * 100;
        }

        if ($filters->precoMax !== null) {
            $conditions[] = 'p.base_price_in_cents <= :precoMax';
            $params['precoMax'] = $filters->precoMax * 100;
        }

        if ($filters->disponibilidade === 'em-estoque') {
            $conditions[] = 'EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1 AND v.stock > 0)';
        }

        return [implode(' AND ', $conditions), $params];
    }

    /** Sempre com o prefixo "p." — ambas as consultas (seleção de IDs e
     *  hidratação) fazem JOIN com categories, então uma coluna sem
     *  prefixo (ex.: created_at, que também existe em categories)
     *  ficaria ambígua para o MySQL. */
    private function buildOrderBy(ProductFilters $filters): string
    {
        return match ($filters->ordem) {
            'menor-preco' => 'p.base_price_in_cents ASC, p.name ASC',
            'maior-preco' => 'p.base_price_in_cents DESC, p.name ASC',
            'destaque' => 'p.is_featured DESC, p.position ASC, p.created_at DESC',
            default => 'p.created_at DESC',
        };
    }

    /**
     * Busca a lista completa de produtos pelos IDs já paginados/ordenados
     * e preserva a ordem original (o `ORDER BY` roda de novo aqui porque
     * `WHERE id IN (...)` não garante ordem).
     *
     * @param array<int, string> $ids
     * @return array<int, array<string, mixed>>
     */
    private function hydrateListItems(array $ids, string $orderBy): array
    {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT p.*, c.name AS category_name, c.slug AS category_slug
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.id IN ({$placeholders})
             ORDER BY {$orderBy}",
        );
        $stmt->execute($ids);
        $rows = $stmt->fetchAll();

        $rowsById = [];
        foreach ($rows as $row) {
            $rowsById[$row['id']] = $row;
        }

        $ordered = [];
        foreach ($ids as $id) {
            if (isset($rowsById[$id])) {
                $ordered[] = $rowsById[$id];
            }
        }

        return array_map([$this, 'toListItem'], $ordered);
    }

    /** @param array<string, mixed> $row */
    private function toListItem(array $row): array
    {
        $now = new \DateTimeImmutable();
        $price = Pricing::resolvePrice($this->priceInput($row), $now);
        $image = $this->primaryImage($row['id']);
        $totalStock = $this->totalStock($row['id']);

        return [
            'id' => $row['id'],
            'slug' => $row['slug'],
            'name' => $row['name'],
            'shortDescription' => $row['short_description'],
            'categoryName' => $row['category_name'],
            'categorySlug' => $row['category_slug'],
            'priceInCents' => $price['priceInCents'],
            'salePriceInCents' => $price['salePriceInCents'],
            'effectivePriceInCents' => $price['effectivePriceInCents'],
            'image' => $image,
            'totalStock' => $totalStock,
            'isAvailable' => $totalStock > 0,
            'isLowStock' => $totalStock > 0 && $totalStock <= self::LOW_STOCK_THRESHOLD,
            'isFeatured' => (bool) $row['is_featured'],
        ];
    }

    /** @param array<string, mixed> $row */
    private function toDetail(array $row): array
    {
        $now = new \DateTimeImmutable();
        $price = Pricing::resolvePrice($this->priceInput($row), $now);

        $imagesStmt = $this->db->prepare(
            'SELECT url, alt, width, height, blur_data_url
             FROM product_images WHERE product_id = :id
             ORDER BY is_primary DESC, position ASC',
        );
        $imagesStmt->execute(['id' => $row['id']]);
        $images = array_map(fn (array $img): array => [
            'url' => $img['url'],
            'alt' => $img['alt'],
            'width' => $img['width'] !== null ? (int) $img['width'] : null,
            'height' => $img['height'] !== null ? (int) $img['height'] : null,
            'blurDataUrl' => $img['blur_data_url'],
        ], $imagesStmt->fetchAll());

        $variantsStmt = $this->db->prepare(
            'SELECT id, sku, name, stock, price_in_cents, sale_price_in_cents
             FROM product_variants WHERE product_id = :id AND is_active = 1
             ORDER BY position ASC',
        );
        $variantsStmt->execute(['id' => $row['id']]);
        $variantRows = $variantsStmt->fetchAll();

        $totalStock = 0;
        $variants = [];
        foreach ($variantRows as $v) {
            $totalStock += (int) $v['stock'];
            $vp = Pricing::resolveVariantPrice($this->priceInput($row), [
                'priceInCents' => $v['price_in_cents'] !== null ? (int) $v['price_in_cents'] : null,
                'salePriceInCents' => $v['sale_price_in_cents'] !== null ? (int) $v['sale_price_in_cents'] : null,
            ], $now);

            $variants[] = [
                'id' => $v['id'],
                'sku' => $v['sku'],
                'name' => $v['name'],
                'priceInCents' => $vp['priceInCents'],
                'salePriceInCents' => $vp['salePriceInCents'],
                'stock' => (int) $v['stock'],
                'isAvailable' => (int) $v['stock'] > 0,
            ];
        }

        return [
            'id' => $row['id'],
            'slug' => $row['slug'],
            'name' => $row['name'],
            'shortDescription' => $row['short_description'],
            'description' => $row['description'],
            'categoryName' => $row['category_name'],
            'categorySlug' => $row['category_slug'],
            'priceInCents' => $price['priceInCents'],
            'salePriceInCents' => $price['salePriceInCents'],
            'effectivePriceInCents' => $price['effectivePriceInCents'],
            'image' => $images[0] ?? null,
            'images' => $images,
            'variants' => $variants,
            'hasRealVariants' => count($variants) > 1,
            'totalStock' => $totalStock,
            'isAvailable' => $totalStock > 0,
            'isLowStock' => $totalStock > 0 && $totalStock <= self::LOW_STOCK_THRESHOLD,
            'isFeatured' => (bool) $row['is_featured'],
            'metaTitle' => $row['meta_title'],
            'metaDescription' => $row['meta_description'],
            'weightInGrams' => $row['weight_in_grams'] !== null ? (int) $row['weight_in_grams'] : null,
        ];
    }

    private function primaryImage(string $productId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT url, alt, width, height, blur_data_url
             FROM product_images WHERE product_id = :id AND is_primary = 1
             LIMIT 1',
        );
        $stmt->execute(['id' => $productId]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        return [
            'url' => $row['url'],
            'alt' => $row['alt'],
            'width' => $row['width'] !== null ? (int) $row['width'] : null,
            'height' => $row['height'] !== null ? (int) $row['height'] : null,
            'blurDataUrl' => $row['blur_data_url'],
        ];
    }

    private function totalStock(string $productId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COALESCE(SUM(stock), 0) AS total FROM product_variants
             WHERE product_id = :id AND is_active = 1',
        );
        $stmt->execute(['id' => $productId]);
        return (int) $stmt->fetch()['total'];
    }

    /** @param array<string, mixed> $row */
    private function priceInput(array $row): array
    {
        return [
            'basePriceInCents' => (int) $row['base_price_in_cents'],
            'salePriceInCents' => $row['sale_price_in_cents'] !== null ? (int) $row['sale_price_in_cents'] : null,
            'saleStartsAt' => $row['sale_starts_at'] !== null ? new \DateTimeImmutable($row['sale_starts_at']) : null,
            'saleEndsAt' => $row['sale_ends_at'] !== null ? new \DateTimeImmutable($row['sale_ends_at']) : null,
        ];
    }
}
