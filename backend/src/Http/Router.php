<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Roteador mínimo, sem framework — a Hostinger compartilhada não roda
 * processo contínuo, então não há ganho em carregar um micro-framework
 * completo para responder GETs de catálogo.
 */
final class Router
{
    /** @var array<int, array{method: string, pattern: string, paramNames: array<int, string>, handler: callable}> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    private function add(string $method, string $path, callable $handler): void
    {
        $paramNames = [];
        $pattern = preg_replace_callback(
            '#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#',
            function (array $m) use (&$paramNames): string {
                $paramNames[] = $m[1];
                return '([^/]+)';
            },
            $path,
        );

        $this->routes[] = [
            'method' => $method,
            'pattern' => '#^' . $pattern . '$#',
            'paramNames' => $paramNames,
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $path): void
    {
        $path = '/' . trim(parse_url($path, PHP_URL_PATH) ?: '/', '/');
        if ($path === '/') {
            $path = '/';
        }

        $pathMatched = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['pattern'], $path, $matches)) {
                continue;
            }

            $pathMatched = true;
            if ($route['method'] !== $method) {
                continue;
            }

            array_shift($matches);
            $params = array_combine($route['paramNames'], $matches);
            ($route['handler'])($params ?: []);
            return;
        }

        if ($pathMatched) {
            Response::fromException(new MethodNotAllowedException('Método não permitido para esta rota.'));
        }

        Response::fromException(new NotFoundException('Rota não encontrada.'));
    }
}
