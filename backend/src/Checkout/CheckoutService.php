<?php

declare(strict_types=1);

namespace App\Checkout;

use App\Cart\CartRepository;
use App\Coupons\CouponRepository;
use App\Email\EmailQueue;
use App\Http\InsufficientStockException;
use App\Http\ValidationException;
use App\Orders\OrderRepository;
use App\Payments\MercadoPagoClient;
use App\Payments\PaymentRepository;
use PDO;

/**
 * Checkout como visitante — sem conta de cliente.
 *
 * Regra central (checklist de aceitação do projeto): "preços são
 * recalculados no servidor" e "duas compras concorrentes não vendem
 * estoque negativo". Por isso:
 *   1. O carrinho nunca guarda preço — só quantidade (ver CartRepository).
 *   2. Cada item é revalidado e o preço é resolvido de novo aqui,
 *      dentro da transação, nunca a partir de um valor vindo do
 *      navegador.
 *   3. O estoque é conferido e decrementado com `SELECT ... FOR UPDATE`
 *      dentro da mesma transação — a segunda de duas requisições
 *      concorrentes para a última unidade encontra o estoque já
 *      decrementado pela primeira e falha com 409, nunca fica negativo.
 *
 * Diferente do `StockReservation` do schema original (reservar no
 * carrinho, expirar depois): aqui o estoque só é tocado no momento do
 * checkout, não quando o item entra no carrinho — mais simples, sem
 * exigir um cron de liberação de reserva expirada. Trade-off registrado
 * em docs/migracao/02-relatorio-fase3.md.
 */
final class CheckoutService
{
    public function __construct(
        private readonly PDO $db,
        private readonly CartRepository $carts,
        private readonly OrderRepository $orders,
        private readonly PaymentRepository $payments,
        private readonly EmailQueue $emailQueue,
        private readonly CouponRepository $coupons,
    ) {
    }

    /**
     * @param array<string, mixed> $customer
     * @return array{order: array<string, mixed>, payment: ?array<string, mixed>}
     */
    public function checkout(string $cartId, array $customer): array
    {
        $this->validateCustomer($customer);

        $this->db->beginTransaction();
        try {
            $itemsStmt = $this->db->prepare(
                'SELECT ci.id AS item_id, ci.quantity, v.id AS variant_id, v.sku, v.name AS variant_name,
                        v.price_in_cents, v.sale_price_in_cents, v.stock,
                        p.id AS product_id, p.name AS product_name, p.base_price_in_cents,
                        p.sale_price_in_cents AS product_sale_price_in_cents, p.sale_starts_at, p.sale_ends_at,
                        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, position ASC LIMIT 1) AS image_url
                 FROM cart_items ci
                 JOIN product_variants v ON v.id = ci.variant_id
                 JOIN products p ON p.id = v.product_id
                 WHERE ci.cart_id = :cartId
                 FOR UPDATE',
            );
            $itemsStmt->execute(['cartId' => $cartId]);
            $rows = $itemsStmt->fetchAll();

            if ($rows === []) {
                throw new ValidationException('Seu carrinho está vazio.');
            }

            $now = new \DateTimeImmutable();
            $subtotal = 0;
            $orderItems = [];

            foreach ($rows as $row) {
                $quantity = (int) $row['quantity'];
                $stock = (int) $row['stock'];

                if ($stock < $quantity) {
                    throw new InsufficientStockException($row['variant_id'], $stock, $quantity);
                }

                $price = \App\Catalog\Pricing::resolveVariantPrice(
                    [
                        'basePriceInCents' => (int) $row['base_price_in_cents'],
                        'salePriceInCents' => $row['product_sale_price_in_cents'] !== null ? (int) $row['product_sale_price_in_cents'] : null,
                        'saleStartsAt' => $row['sale_starts_at'] !== null ? new \DateTimeImmutable($row['sale_starts_at']) : null,
                        'saleEndsAt' => $row['sale_ends_at'] !== null ? new \DateTimeImmutable($row['sale_ends_at']) : null,
                    ],
                    ['priceInCents' => $row['price_in_cents'] !== null ? (int) $row['price_in_cents'] : null, 'salePriceInCents' => $row['sale_price_in_cents'] !== null ? (int) $row['sale_price_in_cents'] : null],
                    $now,
                );

                $lineTotal = $price['effectivePriceInCents'] * $quantity;
                $subtotal += $lineTotal;

                $orderItems[] = [
                    'productId' => $row['product_id'], 'variantId' => $row['variant_id'],
                    'productName' => $row['product_name'], 'variantName' => $row['variant_name'],
                    'sku' => $row['sku'], 'imageUrl' => $row['image_url'],
                    'unitPriceInCents' => $price['effectivePriceInCents'], 'quantity' => $quantity,
                    'subtotalInCents' => $lineTotal,
                ];

                // Baixa de estoque só ocorre aqui, com a linha travada pelo
                // FOR UPDATE acima — é isso que impede estoque negativo sob
                // concorrência.
                $this->db->prepare('UPDATE product_variants SET stock = stock - :quantity WHERE id = :id')
                    ->execute(['quantity' => $quantity, 'id' => $row['variant_id']]);
            }

            $shippingInCents = $this->resolveFlatShippingRate();

            $discountInCents = 0;
            $couponId = null;
            $couponCode = isset($customer['couponCode']) ? trim((string) $customer['couponCode']) : '';
            if ($couponCode !== '') {
                $applied = $this->coupons->validateAndCalculateDiscount($couponCode, $subtotal, $customer['email']);
                $couponId = $applied['couponId'];
                $discountInCents = $applied['discountInCents'];
            }

            $totalInCents = max(0, $subtotal + $shippingInCents - $discountInCents);

            $orderId = $this->orders->insertOrder([
                'orderNumber' => $this->orders->generateOrderNumber(),
                'customerName' => $customer['name'],
                'customerEmail' => $customer['email'],
                'customerPhone' => $customer['phone'],
                'customerDocument' => $customer['document'] ?? null,
                'shippingZipCode' => $customer['shipping']['zipCode'],
                'shippingStreet' => $customer['shipping']['street'],
                'shippingNumber' => $customer['shipping']['number'],
                'shippingComplement' => $customer['shipping']['complement'] ?? null,
                'shippingDistrict' => $customer['shipping']['district'],
                'shippingCity' => $customer['shipping']['city'],
                'shippingState' => $customer['shipping']['state'],
                'subtotalInCents' => $subtotal,
                'shippingInCents' => $shippingInCents,
                'discountInCents' => $discountInCents,
                'totalInCents' => $totalInCents,
                'shippingMethod' => 'flat',
                'couponCode' => $couponId !== null ? mb_strtoupper($couponCode) : null,
                'customerNote' => $customer['note'] ?? null,
                'trackingToken' => $this->orders->generateTrackingToken(),
            ]);

            foreach ($orderItems as $item) {
                $this->orders->insertOrderItem($orderId, $item);
            }

            if ($couponId !== null) {
                $this->coupons->recordRedemption($couponId, $orderId, $customer['email'], $discountInCents);
            }

            $this->carts->clear($cartId);

            $payment = $this->createPixPayment($orderId, $totalInCents, $customer);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        $order = $this->orders->findById($orderId);

        $this->emailQueue->enqueue(
            $customer['email'],
            $customer['name'],
            "Pedido {$order['orderNumber']} recebido — Pincel & Guia",
            $this->renderConfirmationEmail($order),
            null,
            $orderId,
        );

        return ['order' => $order, 'payment' => $payment];
    }

    /** @param array<string, mixed> $customer @return ?array<string, mixed> */
    private function createPixPayment(string $orderId, int $totalInCents, array $customer): ?array
    {
        $client = MercadoPagoClient::fromEnv();

        if ($client === null) {
            // Mercado Pago não configurado (sem MP_ACCESS_TOKEN) — o pedido
            // é criado mesmo assim (não trava a venda por causa de
            // configuração pendente), mas fica sem meio de pagamento
            // disponível. O frontend precisa tratar `payment === null`.
            $this->payments->insert([
                'orderId' => $orderId, 'method' => 'PIX', 'status' => 'PENDING', 'amountInCents' => $totalInCents,
            ]);
            return null;
        }

        try {
            $pix = $client->createPixPayment(
                $totalInCents,
                "Pedido Pincel & Guia",
                $customer['email'],
                $customer['name'],
                $customer['document'] ?? null,
                $orderId,
            );
        } catch (\Throwable $e) {
            error_log('[mercadopago] falha ao criar pagamento PIX: ' . $e->getMessage());
            $this->payments->insert([
                'orderId' => $orderId, 'method' => 'PIX', 'status' => 'PENDING', 'amountInCents' => $totalInCents,
            ]);
            return null;
        }

        $paymentId = $this->payments->insert([
            'orderId' => $orderId, 'gateway' => 'mercadopago', 'gatewayPaymentId' => $pix['id'],
            'method' => 'PIX', 'status' => $this->mapMercadoPagoStatus($pix['status']),
            'amountInCents' => $totalInCents, 'pixQrCode' => $pix['qrCode'], 'pixQrCodeBase64' => $pix['qrCodeBase64'],
            'pixExpiresAt' => $pix['expiresAt'] !== null ? (new \DateTimeImmutable($pix['expiresAt']))->format('Y-m-d H:i:s.v') : null,
            'rawResponse' => $pix['raw'],
        ]);

        return ['id' => $paymentId, 'qrCode' => $pix['qrCode'], 'qrCodeBase64' => $pix['qrCodeBase64'], 'expiresAt' => $pix['expiresAt']];
    }

    private function mapMercadoPagoStatus(string $mpStatus): string
    {
        return match ($mpStatus) {
            'approved' => 'APPROVED',
            'in_process', 'pending' => 'PENDING',
            'rejected' => 'REJECTED',
            'refunded' => 'REFUNDED',
            'cancelled' => 'CANCELLED',
            default => 'PENDING',
        };
    }

    private function resolveFlatShippingRate(): int
    {
        $stmt = $this->db->prepare("SELECT value FROM settings WHERE `key` = 'shipping.flatRate' LIMIT 1");
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row === false) {
            return 0;
        }
        $decoded = json_decode((string) $row['value'], true);
        return (int) ($decoded['priceInCents'] ?? 0);
    }

    /** @param array<string, mixed> $customer */
    private function validateCustomer(array $customer): void
    {
        foreach (['name', 'email', 'phone'] as $field) {
            if (trim((string) ($customer[$field] ?? '')) === '') {
                throw new ValidationException("Informe {$field}.");
            }
        }
        if (!filter_var($customer['email'], FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('E-mail inválido.');
        }

        $shipping = $customer['shipping'] ?? null;
        if (!is_array($shipping)) {
            throw new ValidationException('Informe o endereço de entrega.');
        }
        foreach (['zipCode', 'street', 'number', 'district', 'city', 'state'] as $field) {
            if (trim((string) ($shipping[$field] ?? '')) === '') {
                throw new ValidationException("Informe o campo de endereço \"{$field}\".");
            }
        }
    }

    /** @param array<string, mixed> $order */
    private function renderConfirmationEmail(array $order): string
    {
        $itemsHtml = '';
        foreach ($order['items'] as $item) {
            $itemsHtml .= sprintf(
                '<tr><td>%s (%d×)</td><td>R$ %s</td></tr>',
                htmlspecialchars($item['productName']),
                $item['quantity'],
                number_format($item['subtotalInCents'] / 100, 2, ',', '.'),
            );
        }

        return <<<HTML
            <h1>Recebemos seu pedido {$order['orderNumber']}</h1>
            <p>Olá {$order['customerName']}, obrigado pela compra!</p>
            <table>{$itemsHtml}</table>
            <p>Total: R$ {$this->formatCents($order['totalInCents'])}</p>
            <p>Assim que o pagamento for confirmado, avisaremos por aqui.</p>
            HTML;
    }

    private function formatCents(int $cents): string
    {
        return number_format($cents / 100, 2, ',', '.');
    }
}
