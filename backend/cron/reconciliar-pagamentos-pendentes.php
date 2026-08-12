<?php

declare(strict_types=1);

/**
 * Cron Job — roda a cada 15-30 minutos.
 * Comando sugerido no hPanel: php /caminho/para/backend/cron/reconciliar-pagamentos-pendentes.php
 *
 * Cobre dois casos que o webhook sozinho não garante:
 *   1. O webhook do Mercado Pago não chegou (rede instável, etc.) mas
 *      o pagamento foi aprovado — aqui a gente confirma direto na API
 *      e marca como pago.
 *   2. O PIX expirou sem pagamento — o pedido é cancelado e o
 *      ESTOQUE É DEVOLVIDO (ele tinha sido decrementado no checkout,
 *      ver App\Checkout\CheckoutService).
 *
 * ⚠️ Não testado contra a API real do Mercado Pago nesta sessão.
 */

require __DIR__ . '/bootstrap.php';
adquirirLockOuSair('reconciliar-pagamentos');

use App\Database\Connection;
use App\Orders\OrderRepository;
use App\Orders\OrderStateMachine;
use App\Payments\MercadoPagoClient;
use App\Payments\PaymentRepository;

const IDADE_MINIMA_MINUTOS = 20;

$db = Connection::get();
$client = MercadoPagoClient::fromEnv();

if ($client === null) {
    echo "[reconciliar-pagamentos] Mercado Pago não configurado (MP_ACCESS_TOKEN ausente) — nada a fazer.\n";
    exit(0);
}

$payments = new PaymentRepository($db);
$orders = new OrderRepository($db);

$stmt = $db->prepare(
    "SELECT p.id AS payment_id, p.gateway_payment_id, p.order_id, o.status AS order_status
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE p.status = 'PENDING' AND p.gateway_payment_id IS NOT NULL
       AND p.created_at <= :threshold",
);
$stmt->execute(['threshold' => (new DateTimeImmutable('-' . IDADE_MINIMA_MINUTOS . ' minutes'))->format('Y-m-d H:i:s.v')]);
$pendentes = $stmt->fetchAll();

$confirmados = 0;
$cancelados = 0;
$erros = 0;

foreach ($pendentes as $row) {
    try {
        $paymentData = $client->getPayment($row['gateway_payment_id']);
        $mpStatus = $paymentData['status'] ?? 'pending';

        if ($mpStatus === 'approved') {
            $payments->updateStatus($row['payment_id'], 'APPROVED', $paymentData);
            if ($row['order_status'] !== 'PAID') {
                OrderStateMachine::assertCanTransition($row['order_status'], 'PAID');
                $orders->transition($row['order_id'], $row['order_status'], 'PAID', 'Confirmado por reconciliação (cron).', 'cron-reconciliacao');
            }
            $confirmados++;
            continue;
        }

        // PIX expirado ou pagamento explicitamente rejeitado/cancelado no
        // gateway — cancela o pedido e devolve o estoque que tinha sido
        // decrementado no checkout.
        if (in_array($mpStatus, ['rejected', 'cancelled', 'expired'], true)) {
            $payments->updateStatus($row['payment_id'], 'CANCELLED', $paymentData);

            if ($row['order_status'] === 'PENDING_PAYMENT') {
                $db->beginTransaction();
                try {
                    $itemsStmt = $db->prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = :orderId');
                    $itemsStmt->execute(['orderId' => $row['order_id']]);
                    foreach ($itemsStmt->fetchAll() as $item) {
                        if ($item['variant_id'] === null) {
                            continue;
                        }
                        $db->prepare('UPDATE product_variants SET stock = stock + :quantity WHERE id = :id')
                            ->execute(['quantity' => $item['quantity'], 'id' => $item['variant_id']]);
                    }

                    OrderStateMachine::assertCanTransition('PENDING_PAYMENT', 'CANCELLED');
                    $orders->transition($row['order_id'], 'PENDING_PAYMENT', 'CANCELLED', 'Pagamento não confirmado (PIX expirado ou rejeitado) — estoque devolvido.', 'cron-reconciliacao');

                    $db->commit();
                } catch (Throwable $e) {
                    $db->rollBack();
                    throw $e;
                }
            }
            $cancelados++;
        }
    } catch (Throwable $e) {
        $erros++;
        error_log('[reconciliar-pagamentos] falha no pedido ' . $row['order_id'] . ': ' . $e->getMessage());
    }
}

echo "[reconciliar-pagamentos] {$confirmados} confirmados, {$cancelados} cancelados (estoque devolvido), {$erros} erros.\n";
