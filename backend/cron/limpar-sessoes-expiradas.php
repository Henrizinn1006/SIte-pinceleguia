<?php

declare(strict_types=1);

/**
 * Cron Job — roda a cada hora, por exemplo.
 * Comando sugerido no hPanel: php /caminho/para/backend/cron/limpar-sessoes-expiradas.php
 */

require __DIR__ . '/bootstrap.php';
adquirirLockOuSair('limpar-sessoes');

use App\Auth\RateLimiter;
use App\Auth\Session;
use App\Database\Connection;

$db = Connection::get();

$sessoesRemovidas = (new Session($db))->purgeExpired();
$tentativasRemovidas = (new RateLimiter($db))->purgeOld();

echo "[limpar-sessoes] {$sessoesRemovidas} sessões expiradas removidas, {$tentativasRemovidas} tentativas de login antigas removidas.\n";
