<?php

declare(strict_types=1);

/**
 * Bootstrap dos testes — mesmo autoloader manual do front controller,
 * sem depender de vendor/autoload.php (PHPUnit é dependência só de
 * DEV; produção na Hostinger não precisa dele).
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
