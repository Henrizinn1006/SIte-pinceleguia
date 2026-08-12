<?php

declare(strict_types=1);

/**
 * Cria o primeiro (ou próximo) administrador do painel.
 *
 * Porta de seed/criar-admin.ts. Não existe cadastro público no painel
 * por design — formulário de registro em área administrativa é convite
 * a força bruta (mesma decisão do projeto original, ver docs/13).
 *
 * Uso (CLI):
 *   php backend/bin/criar-admin.php --email=voce@exemplo.com --nome="Seu Nome"
 *
 * Gera uma senha aleatória e mostra UMA VEZ no terminal — não fica
 * salva em lugar nenhum além do hash no banco.
 */

require __DIR__ . '/../src/Config/Env.php';
require __DIR__ . '/../src/Database/Connection.php';
require __DIR__ . '/../src/Auth/PasswordHasher.php';
require __DIR__ . '/../src/Auth/UserRepository.php';

use App\Auth\PasswordHasher;
use App\Auth\UserRepository;
use App\Config\Env;
use App\Database\Connection;

Env::load(__DIR__ . '/../../.env');

$options = getopt('', ['email:', 'nome:']);
$email = isset($options['email']) ? mb_strtolower(trim((string) $options['email'])) : null;
$nome = isset($options['nome']) ? trim((string) $options['nome']) : null;

if ($email === null || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Uso: php backend/bin/criar-admin.php --email=voce@exemplo.com --nome=\"Seu Nome\"\n");
    exit(1);
}
if ($nome === null || $nome === '') {
    fwrite(STDERR, "Informe --nome=\"Seu Nome\".\n");
    exit(1);
}

$db = Connection::get();
$users = new UserRepository($db);

$existing = $users->findByEmail($email);
if ($existing !== null) {
    fwrite(STDOUT, "Já existe um usuário com este e-mail (id: {$existing['id']}). Nada foi alterado.\n");
    fwrite(STDOUT, "Para redefinir a senha, use um script separado (ainda não existe nesta fase) ou edite via phpMyAdmin com cuidado.\n");
    exit(0);
}

// Senha aleatória, legível o suficiente para digitar uma vez, ~72 bits de entropia.
function gerarSenhaAleatoria(): string
{
    $alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $grupos = [];
    for ($g = 0; $g < 3; $g++) {
        $grupo = '';
        for ($i = 0; $i < 4; $i++) {
            $grupo .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
        }
        $grupos[] = $grupo;
    }
    return implode('-', $grupos);
}

$senha = gerarSenhaAleatoria();
$hash = PasswordHasher::hash($senha);
$id = $users->create($nome, $email, $hash, true);

fwrite(STDOUT, "\n✅ Administrador criado.\n\n");
fwrite(STDOUT, "  id:    {$id}\n");
fwrite(STDOUT, "  nome:  {$nome}\n");
fwrite(STDOUT, "  email: {$email}\n");
fwrite(STDOUT, "  senha: {$senha}\n\n");
fwrite(STDOUT, "⚠️  Esta senha só é mostrada agora. Guarde-a num gerenciador de senhas e troque no primeiro acesso, se/quando essa tela existir.\n\n");
