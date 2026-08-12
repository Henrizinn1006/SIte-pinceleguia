<?php

declare(strict_types=1);

namespace App\Email;

use App\Config\Env;

/**
 * Cliente SMTP mínimo via socket puro — sem PHPMailer/Composer.
 * Suporta AUTH LOGIN e STARTTLS (porta 587) ou SSL implícito (porta
 * 465), que é o que a Hostinger oferece. `mail()` nativo do PHP não
 * foi usado porque não autentica em SMTP com usuário/senha de forma
 * confiável entre hosts.
 *
 * ⚠️ Não testado contra o SMTP real da Hostinger nesta sessão — sem
 * credenciais disponíveis. Implementado conforme RFC 5321/4954;
 * validar com uma conta de e-mail real antes de confiar em produção.
 */
final class SmtpMailer
{
    public static function isConfigured(): bool
    {
        return Env::get('SMTP_HOST') !== null;
    }

    /** @throws \RuntimeException se o envio falhar em qualquer etapa */
    public static function send(string $toEmail, ?string $toName, string $subject, string $bodyHtml): void
    {
        $host = Env::required('SMTP_HOST');
        $port = (int) Env::get('SMTP_PORT', '587');
        $user = Env::required('SMTP_USER');
        $pass = Env::required('SMTP_PASSWORD');
        $fromEmail = Env::get('SMTP_FROM_EMAIL', $user);
        $fromName = Env::get('SMTP_FROM_NAME', 'Pincel & Guia');

        $transport = $port === 465 ? "ssl://{$host}" : $host;
        $socket = @fsockopen($transport, $port, $errno, $errstr, 15);
        if ($socket === false) {
            throw new \RuntimeException("Falha ao conectar no SMTP {$host}:{$port} — {$errstr}");
        }

        try {
            self::expect($socket, 220);
            self::command($socket, 'EHLO ' . gethostname(), 250);

            if ($port !== 465) {
                self::command($socket, 'STARTTLS', 220);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('Falha ao negociar STARTTLS com o SMTP.');
                }
                self::command($socket, 'EHLO ' . gethostname(), 250);
            }

            self::command($socket, 'AUTH LOGIN', 334);
            self::command($socket, base64_encode($user), 334);
            self::command($socket, base64_encode($pass), 235);

            self::command($socket, "MAIL FROM:<{$fromEmail}>", 250);
            self::command($socket, "RCPT TO:<{$toEmail}>", 250);
            self::command($socket, 'DATA', 354);

            $headers = implode("\r\n", [
                'From: ' . self::encodeHeader($fromName) . " <{$fromEmail}>",
                'To: ' . ($toName !== null ? self::encodeHeader($toName) . " <{$toEmail}>" : $toEmail),
                'Subject: ' . self::encodeHeader($subject),
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: 8bit',
            ]);

            $data = $headers . "\r\n\r\n" . str_replace("\n.", "\n..", $bodyHtml) . "\r\n.";
            self::command($socket, $data, 250);
            self::command($socket, 'QUIT', 221);
        } finally {
            fclose($socket);
        }
    }

    /** @param resource $socket */
    private static function command($socket, string $command, int $expectedCode): void
    {
        fwrite($socket, $command . "\r\n");
        self::expect($socket, $expectedCode);
    }

    /** @param resource $socket */
    private static function expect($socket, int $expectedCode): void
    {
        $response = '';
        while (($line = fgets($socket, 512)) !== false) {
            $response .= $line;
            // Linha final de uma resposta multi-linha tem um espaço depois do código; "-" indica continuação.
            if (strlen($line) >= 4 && $line[3] === ' ') {
                break;
            }
        }

        $code = (int) substr($response, 0, 3);
        if ($code !== $expectedCode) {
            throw new \RuntimeException("SMTP respondeu {$code}, esperado {$expectedCode}: {$response}");
        }
    }

    private static function encodeHeader(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }
}
