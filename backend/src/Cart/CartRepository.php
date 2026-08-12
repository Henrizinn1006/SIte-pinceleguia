<?php

declare(strict_types=1);

namespace App\Cart;

use App\Catalog\Pricing;
use App\Http\ValidationException;
use PDO;

/**
 * Carrinho de VISITANTE — identificado por um cookie opaco
 * (`session_token`), sem exigir conta/login (não existe cadastro de
 * cliente nesta fase). O carrinho nunca guarda preço, só
 * `variant_id` + `quantity`; o preço é sempre resolvido na hora via
 * App\Catalog\Pricing, para nunca vender por um valor desatualizado.
 */
final class CartRepository
{
    public const COOKIE_NAME = 'pg_cart';
    private const TTL_DAYS = 30;

    public function __construct(private readonly PDO $db)
    {
    }

    /** Lê o cookie da requisição atual, cria um carrinho novo se não houver (ou se estiver expirado). */
    public function getOrCreateCurrent(): string
    {
        $token = $_COOKIE[self::COOKIE_NAME] ?? null;

        if (is_string($token) && $token !== '') {
            $stmt = $this->db->prepare('SELECT id, expires_at FROM carts WHERE session_token = :token LIMIT 1');
            $stmt->execute(['token' => $token]);
            $row = $stmt->fetch();
            if ($row !== false && new \DateTimeImmutable($row['expires_at']) > new \DateTimeImmutable()) {
                return $row['id'];
            }
        }

        $newToken = bin2hex(random_bytes(32));
        $id = 'c' . bin2hex(random_bytes(12));
        $expiresAt = (new \DateTimeImmutable('+' . self::TTL_DAYS . ' days'))->format('Y-m-d H:i:s.v');

        $this->db->prepare('INSERT INTO carts (id, session_token, expires_at) VALUES (:id, :token, :expiresAt)')
            ->execute(['id' => $id, 'token' => $newToken, 'expiresAt' => $expiresAt]);

        setcookie(self::COOKIE_NAME, $newToken, [
            'expires' => time() + self::TTL_DAYS * 86400,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        return $id;
    }

    public function addItem(string $cartId, string $variantId, int $quantity): void
    {
        if ($quantity < 1) {
            throw new ValidationException('Quantidade precisa ser pelo menos 1.');
        }

        $variant = $this->db->prepare('SELECT id FROM product_variants WHERE id = :id AND is_active = 1 LIMIT 1');
        $variant->execute(['id' => $variantId]);
        if ($variant->fetch() === false) {
            throw new ValidationException('Peça não encontrada ou indisponível.');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO cart_items (id, cart_id, variant_id, quantity)
             VALUES (:id, :cartId, :variantId, :quantity)
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)',
        );
        $stmt->execute(['id' => 'c' . bin2hex(random_bytes(12)), 'cartId' => $cartId, 'variantId' => $variantId, 'quantity' => $quantity]);
    }

    public function updateItemQuantity(string $cartId, string $itemId, int $quantity): void
    {
        if ($quantity < 1) {
            throw new ValidationException('Quantidade precisa ser pelo menos 1.');
        }

        $stmt = $this->db->prepare('UPDATE cart_items SET quantity = :quantity WHERE id = :id AND cart_id = :cartId');
        $stmt->execute(['quantity' => $quantity, 'id' => $itemId, 'cartId' => $cartId]);
    }

    public function removeItem(string $cartId, string $itemId): void
    {
        $this->db->prepare('DELETE FROM cart_items WHERE id = :id AND cart_id = :cartId')
            ->execute(['id' => $itemId, 'cartId' => $cartId]);
    }

    public function clear(string $cartId): void
    {
        $this->db->prepare('DELETE FROM cart_items WHERE cart_id = :cartId')->execute(['cartId' => $cartId]);
    }

    /** @return array{items: array<int, array<string, mixed>>, subtotalInCents: int, totalItems: int} */
    public function getView(string $cartId): array
    {
        $stmt = $this->db->prepare(
            'SELECT ci.id AS item_id, ci.quantity, v.id AS variant_id, v.sku, v.name AS variant_name,
                    v.price_in_cents, v.sale_price_in_cents, v.stock, v.is_active AS variant_active,
                    p.id AS product_id, p.slug, p.name AS product_name, p.base_price_in_cents,
                    p.sale_price_in_cents AS product_sale_price_in_cents, p.sale_starts_at, p.sale_ends_at,
                    (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, position ASC LIMIT 1) AS image_url,
                    (SELECT alt FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, position ASC LIMIT 1) AS image_alt
             FROM cart_items ci
             JOIN product_variants v ON v.id = ci.variant_id
             JOIN products p ON p.id = v.product_id
             WHERE ci.cart_id = :cartId
             ORDER BY ci.created_at ASC',
        );
        $stmt->execute(['cartId' => $cartId]);

        $now = new \DateTimeImmutable();
        $items = [];
        $subtotal = 0;
        $totalItems = 0;

        foreach ($stmt->fetchAll() as $row) {
            $price = Pricing::resolveVariantPrice(
                [
                    'basePriceInCents' => (int) $row['base_price_in_cents'],
                    'salePriceInCents' => $row['product_sale_price_in_cents'] !== null ? (int) $row['product_sale_price_in_cents'] : null,
                    'saleStartsAt' => $row['sale_starts_at'] !== null ? new \DateTimeImmutable($row['sale_starts_at']) : null,
                    'saleEndsAt' => $row['sale_ends_at'] !== null ? new \DateTimeImmutable($row['sale_ends_at']) : null,
                ],
                ['priceInCents' => $row['price_in_cents'] !== null ? (int) $row['price_in_cents'] : null, 'salePriceInCents' => $row['sale_price_in_cents'] !== null ? (int) $row['sale_price_in_cents'] : null],
                $now,
            );

            $lineTotal = $price['effectivePriceInCents'] * (int) $row['quantity'];
            $subtotal += $lineTotal;
            $totalItems += (int) $row['quantity'];

            $items[] = [
                'itemId' => $row['item_id'],
                'variantId' => $row['variant_id'],
                'productSlug' => $row['slug'],
                'productName' => $row['product_name'],
                'variantName' => $row['variant_name'],
                'sku' => $row['sku'],
                'imageUrl' => $row['image_url'],
                'imageAlt' => $row['image_alt'],
                'quantity' => (int) $row['quantity'],
                'unitPriceInCents' => $price['effectivePriceInCents'],
                'lineTotalInCents' => $lineTotal,
                'stock' => (int) $row['stock'],
                'isAvailable' => (bool) $row['variant_active'] && (int) $row['stock'] >= (int) $row['quantity'],
            ];
        }

        return ['items' => $items, 'subtotalInCents' => $subtotal, 'totalItems' => $totalItems];
    }
}
