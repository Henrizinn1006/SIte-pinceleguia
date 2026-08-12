<?php

declare(strict_types=1);

/**
 * Cron Job — roda a cada poucos minutos.
 * Comando sugerido no hPanel: php /caminho/para/backend/cron/processar-fila-email.php
 *
 * Processa até 20 e-mails pendentes por execução (evita um lote gigante
 * travar o cron se a fila acumular). Falhas incrementam `attempts` e
 * ficam com status `failed` depois de 5 tentativas — não ficam
 * tentando para sempre.
 */

require __DIR__ . '/bootstrap.php';
adquirirLockOuSair('processar-email');

use App\Database\Connection;
use App\Email\SmtpMailer;

const MAX_TENTATIVAS = 5;
const LOTE = 20;

$db = Connection::get();

if (!SmtpMailer::isConfigured()) {
    echo "[processar-email] SMTP não configurado (SMTP_HOST ausente no .env) — nada a fazer.\n";
    exit(0);
}

$stmt = $db->prepare(
    "SELECT id, to_email, to_name, subject, body_html FROM email_queue
     WHERE status = 'pending' AND attempts < :maxTentativas
     ORDER BY created_at ASC LIMIT :lote",
);
$stmt->bindValue(':maxTentativas', MAX_TENTATIVAS, PDO::PARAM_INT);
$stmt->bindValue(':lote', LOTE, PDO::PARAM_INT);
$stmt->execute();
$emails = $stmt->fetchAll();

$enviados = 0;
$falhados = 0;

foreach ($emails as $email) {
    try {
        SmtpMailer::send($email['to_email'], $email['to_name'], $email['subject'], $email['body_html']);

        $db->prepare("UPDATE email_queue SET status = 'sent', sent_at = :now WHERE id = :id")
            ->execute(['now' => (new DateTimeImmutable())->format('Y-m-d H:i:s.v'), 'id' => $email['id']]);
        $enviados++;
    } catch (Throwable $e) {
        $novasTentativas = 1; // incrementado abaixo via SQL
        $db->prepare(
            "UPDATE email_queue SET attempts = attempts + 1, last_error = :error,
                 status = IF(attempts + 1 >= :maxTentativas, 'failed', 'pending')
             WHERE id = :id",
        )->execute(['error' => substr($e->getMessage(), 0, 500), 'maxTentativas' => MAX_TENTATIVAS, 'id' => $email['id']]);
        $falhados++;
        error_log('[processar-email] falha ao enviar ' . $email['id'] . ': ' . $e->getMessage());
    }
}

echo "[processar-email] {$enviados} enviados, {$falhados} falharam nesta execução.\n";
