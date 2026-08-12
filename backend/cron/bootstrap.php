<?php

declare(strict_types=1);

/**
 * Bootstrap compartilhado dos scripts de Cron Job. Mesmo autoloader
 * manual do front controller (sem Composer).
 */
spl_autoload_register(function (string $class): void {
    if (!str_starts_with($class, 'App\\')) {
        return;
    }
    $relative = substr($class, strlen('App\\'));
    $path = __DIR__ . '/../src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

use App\Config\Env;

Env::load(__DIR__ . '/../../.env');

/**
 * Lock de arquivo — evita que o mesmo Cron Job rode duas vezes em
 * paralelo (ex.: uma execução atrasada ainda rodando quando a próxima
 * dispara). Se não conseguir o lock, sai silenciosamente com código 0
 * (não é uma falha, é só "já tem um rodando").
 */
function adquirirLockOuSair(string $nome): void
{
    $lockFile = sys_get_temp_dir() . "/pincelguia-cron-{$nome}.lock";
    $handle = fopen($lockFile, 'c');
    if ($handle === false || !flock($handle, LOCK_EX | LOCK_NB)) {
        fwrite(STDOUT, "[{$nome}] já em execução, saindo.\n");
        exit(0);
    }

    // Mantém o handle vivo (e o lock com ele) até o processo terminar.
    $GLOBALS['__cron_lock_handle'] = $handle;
}
