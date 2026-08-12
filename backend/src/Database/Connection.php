<?php

declare(strict_types=1);

namespace App\Database;

use App\Config\Env;
use PDO;
use PDOException;

/**
 * Conexão PDO única por requisição (equivalente ao singleton do Prisma
 * client em packages/db/src/index.ts, mas sem cache entre requisições —
 * em PHP tradicional cada requisição é um processo/execução isolada).
 */
final class Connection
{
    private static ?PDO $instance = null;

    public static function get(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $host = Env::get('DB_HOST', '127.0.0.1');
        $port = Env::get('DB_PORT', '3306');
        $name = Env::required('DB_NAME');
        $user = Env::required('DB_USER');
        $pass = Env::get('DB_PASSWORD', '');

        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        try {
            self::$instance = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, time_zone = '+00:00'",
            ]);
        } catch (PDOException $e) {
            // Nunca vazar host/usuário/senha na resposta — só no log do servidor.
            error_log('[db] falha de conexão: ' . $e->getMessage());
            throw new \RuntimeException('Não foi possível conectar ao banco de dados.', 0, $e);
        }

        return self::$instance;
    }
}
