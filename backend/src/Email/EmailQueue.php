<?php

declare(strict_types=1);

namespace App\Email;

use PDO;

/**
 * Fila de e-mail simples — enfileirar é síncrono e rápido (um INSERT),
 * o envio de verdade acontece depois, via Cron Job
 * (backend/cron/processar-fila-email.php). Assim, se o SMTP da
 * Hostinger estiver lento ou fora do ar, quem acabou de finalizar a
 * compra não fica esperando isso na resposta HTTP.
 */
final class EmailQueue
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function enqueue(string $toEmail, ?string $toName, string $subject, string $bodyHtml, ?string $bodyText = null, ?string $relatedOrderId = null): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO email_queue (id, to_email, to_name, subject, body_html, body_text, related_order_id)
             VALUES (:id, :toEmail, :toName, :subject, :bodyHtml, :bodyText, :relatedOrderId)',
        );
        $stmt->execute([
            'id' => 'c' . bin2hex(random_bytes(12)), 'toEmail' => $toEmail, 'toName' => $toName,
            'subject' => $subject, 'bodyHtml' => $bodyHtml, 'bodyText' => $bodyText, 'relatedOrderId' => $relatedOrderId,
        ]);
    }
}
