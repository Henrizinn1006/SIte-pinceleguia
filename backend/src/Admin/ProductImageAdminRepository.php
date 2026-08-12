<?php

declare(strict_types=1);

namespace App\Admin;

use App\Http\ValidationException;
use PDO;

/**
 * Upload de imagem de produto — armazenamento local (a pasta de
 * uploads fica dentro do document root, mas com execução de PHP
 * desligada via .htaccess, ver backend/storage/uploads/.htaccess).
 *
 * Checklist de segurança aplicado aqui (ver checklist-producao.md):
 *  - extensão E tipo MIME E assinatura real do arquivo (getimagesize
 *    lê os bytes, não confia no Content-Type enviado pelo navegador);
 *  - nome do arquivo é sempre gerado aleatoriamente — o nome original
 *    nunca vira caminho no disco (previne path traversal e
 *    "foto.jpg.php");
 *  - limite de tamanho.
 *
 * Redimensionamento/compressão via GD fica condicionado a
 * `extension_loaded('gd')` — o plano Hostinger do cliente ainda não
 * foi confirmado (ver docs/migracao/00-relatorio-fase1.md).
 */
final class ProductImageAdminRepository
{
    private const ALLOWED_MIME_TO_EXT = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

    public function __construct(private readonly PDO $db, private readonly string $uploadDir, private readonly string $publicUrlPrefix)
    {
    }

    /**
     * @param array{tmp_name:string, size:int, error:int, name:string} $file equivalente a um item de $_FILES
     */
    public function upload(string $productId, array $file, string $alt, bool $isPrimary): string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new ValidationException('Falha no envio do arquivo.');
        }
        if ($file['size'] <= 0 || $file['size'] > self::MAX_BYTES) {
            throw new ValidationException('Imagem precisa ter até 5 MB.');
        }
        if (trim($alt) === '') {
            throw new ValidationException('Texto alternativo (alt) é obrigatório — acessibilidade, não é opcional.');
        }

        // Assinatura real do arquivo — nunca confiar em extensão ou
        // Content-Type enviados pelo navegador.
        $imageInfo = @getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            throw new ValidationException('Arquivo enviado não é uma imagem válida.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($file['tmp_name']);
        if (!isset(self::ALLOWED_MIME_TO_EXT[$realMime])) {
            throw new ValidationException('Formato de imagem não suportado. Use JPEG, PNG ou WebP.');
        }

        $extension = self::ALLOWED_MIME_TO_EXT[$realMime];
        $filename = bin2hex(random_bytes(16)) . '.' . $extension;

        if (!is_dir($this->uploadDir) && !mkdir($this->uploadDir, 0755, true) && !is_dir($this->uploadDir)) {
            throw new \RuntimeException('Não foi possível preparar o diretório de upload.');
        }

        $destination = rtrim($this->uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \RuntimeException('Falha ao salvar o arquivo enviado.');
        }

        if ($isPrimary) {
            $this->db->prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = :id')->execute(['id' => $productId]);
        }

        $positionStmt = $this->db->prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM product_images WHERE product_id = :id');
        $positionStmt->execute(['id' => $productId]);
        $position = (int) $positionStmt->fetch()['next_position'];

        $id = 'c' . bin2hex(random_bytes(12));
        $url = rtrim($this->publicUrlPrefix, '/') . '/' . $filename;

        $insert = $this->db->prepare(
            'INSERT INTO product_images (id, product_id, storage_key, url, alt, width, height, position, is_primary)
             VALUES (:id, :productId, :storageKey, :url, :alt, :width, :height, :position, :isPrimary)',
        );
        $insert->execute([
            'id' => $id, 'productId' => $productId, 'storageKey' => $filename, 'url' => $url,
            'alt' => $alt, 'width' => $imageInfo[0], 'height' => $imageInfo[1],
            'position' => $position, 'isPrimary' => $isPrimary ? 1 : 0,
        ]);

        return $id;
    }

    public function delete(string $imageId): void
    {
        $stmt = $this->db->prepare('SELECT storage_key FROM product_images WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $imageId]);
        $row = $stmt->fetch();
        if ($row === false) {
            throw new ValidationException('Imagem não encontrada.');
        }

        $this->db->prepare('DELETE FROM product_images WHERE id = :id')->execute(['id' => $imageId]);

        if ($row['storage_key'] !== null) {
            $path = rtrim($this->uploadDir, '/\\') . DIRECTORY_SEPARATOR . $row['storage_key'];
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
