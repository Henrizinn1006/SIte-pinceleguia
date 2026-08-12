<?php

declare(strict_types=1);

/**
 * Seed de DEMONSTRAÇÃO — Pincel & Guia (Fase 1: catálogo + conteúdo).
 *
 * Porta de seed/demo.ts, restrita às tabelas que existem nesta fase
 * (categories, products, product_images, product_variants,
 * content_pages, settings). Cupom (DEMO10) fica para quando a tabela
 * `coupons` for criada, junto do carrinho/checkout — Fase 3.
 *
 * ⚠️  TODOS os dados abaixo são FICTÍCIOS — mesma ressalva do seed
 *     original em TypeScript. Nenhum preço, prazo ou texto jurídico
 *     aqui é real.
 *
 * Uso (CLI, requer php-cli e as variáveis DB_* no .env):
 *   php backend/seeds/demo.php
 */

require __DIR__ . '/../src/Config/Env.php';
require __DIR__ . '/../src/Database/Connection.php';

use App\Config\Env;
use App\Database\Connection;

Env::load(__DIR__ . '/../../.env');
$db = Connection::get();

function genId(): string
{
    return 'c' . bin2hex(random_bytes(12));
}

function slugToSku(string $slug): string
{
    $sku = strtoupper(preg_replace('/[^A-Z0-9]+/', '-', strtoupper($slug)) ?? $slug);
    return substr($sku, 0, 40);
}

$categories = [
    ['slug' => 'orixas', 'name' => 'Orixás', 'description' => 'Pratos em porcelana com representações autorais dos Orixás, pintados à mão.', 'imageUrl' => '/demo/oxossi.svg', 'imageAlt' => 'Prato de porcelana com representação de Oxóssi', 'showOnHome' => true, 'position' => 1],
    ['slug' => 'guias-e-entidades', 'name' => 'Guias & Entidades', 'description' => 'Peças dedicadas às entidades da Umbanda — Exus, Pombagiras, Pretos-Velhos e Caboclos.', 'imageUrl' => '/demo/exu-tranca-ruas.svg', 'imageAlt' => 'Prato de porcelana com representação de Exu Tranca-Ruas', 'showOnHome' => true, 'position' => 2],
    ['slug' => 'guias-de-protecao', 'name' => 'Guias de proteção', 'description' => 'Guias e acessórios montados peça a peça.', 'imageUrl' => '/demo/guia-protecao.svg', 'imageAlt' => 'Guia de proteção com contas claras e medalha dourada', 'showOnHome' => true, 'position' => 3],
    ['slug' => 'colecoes', 'name' => 'Coleções', 'description' => 'Conjuntos e séries especiais.', 'imageUrl' => '/demo/oxum.svg', 'imageAlt' => 'Prato de porcelana da coleção especial', 'showOnHome' => false, 'position' => 4],
];

$products = [
    ['slug' => 'prato-porcelana-nana-buruque', 'name' => 'Prato em porcelana — Nanã Buruquê', 'category' => 'orixas', 'image' => '/demo/nana-buruque.svg', 'priceInCents' => 15700, 'saleInCents' => null, 'stock' => 3, 'featured' => true, 'short' => 'Pintura autoral em porcelana, com acabamento em ouro.', 'description' => 'Prato decorativo em porcelana branca, com pintura autoral feita à mão representando Nanã Buruquê. Filete em ouro aplicado manualmente na borda. Por ser uma peça artesanal, pequenas variações de traço e tonalidade fazem parte da sua natureza — não há duas iguais.'],
    ['slug' => 'prato-porcelana-iemanja', 'name' => 'Prato em porcelana — Iemanjá', 'category' => 'orixas', 'image' => '/demo/iemanja.svg', 'priceInCents' => 15700, 'saleInCents' => null, 'stock' => 5, 'featured' => true, 'short' => 'Tons de azul e prata sobre porcelana branca.', 'description' => 'Prato decorativo em porcelana branca com pintura autoral de Iemanjá, em tons de azul. Acabamento com filete dourado na borda. Peça artesanal — cada exemplar tem pequenas variações próprias.'],
    ['slug' => 'prato-porcelana-oxossi', 'name' => 'Prato em porcelana — Oxóssi', 'category' => 'orixas', 'image' => '/demo/oxossi.svg', 'priceInCents' => 15700, 'saleInCents' => 13900, 'stock' => 2, 'featured' => true, 'short' => 'Pintura em tons de verde e ouro.', 'description' => 'Prato decorativo em porcelana branca com representação autoral de Oxóssi, o caçador. Pintura à mão em tons terrosos e dourados, com filete em ouro na borda.'],
    ['slug' => 'prato-porcelana-pombagira', 'name' => 'Prato em porcelana — Pombagira', 'category' => 'guias-e-entidades', 'image' => '/demo/pombagira.svg', 'priceInCents' => 15700, 'saleInCents' => null, 'stock' => 4, 'featured' => true, 'short' => 'Vermelho e preto sobre porcelana, com detalhes em ouro.', 'description' => 'Prato decorativo em porcelana branca com pintura autoral de Pombagira. Composição em vermelho e preto, com filete dourado aplicado à mão na borda.'],
    ['slug' => 'prato-porcelana-exu-tranca-ruas', 'name' => 'Prato em porcelana — Exu Tranca-Ruas', 'category' => 'guias-e-entidades', 'image' => '/demo/exu-tranca-ruas.svg', 'priceInCents' => 15700, 'saleInCents' => null, 'stock' => 1, 'featured' => true, 'short' => 'Peça de traço marcante, com acabamento em ouro.', 'description' => 'Prato decorativo em porcelana branca com representação autoral de Exu Tranca-Ruas. Pintura feita à mão, com filete em ouro na borda.'],
    ['slug' => 'guia-de-protecao-cristal', 'name' => 'Guia de proteção — cristal e dourado', 'category' => 'guias-de-protecao', 'image' => '/demo/guia-protecao.svg', 'priceInCents' => 15700, 'saleInCents' => null, 'stock' => 8, 'featured' => true, 'short' => 'Contas de cristal montadas peça a peça, com medalha dourada.', 'description' => 'Guia de proteção montada à mão, com contas de cristal e medalha em acabamento dourado. Cada guia é montada individualmente.'],
    ['slug' => 'prato-porcelana-oxum', 'name' => 'Prato em porcelana — Oxum', 'category' => 'orixas', 'image' => '/demo/oxum.svg', 'priceInCents' => 16900, 'saleInCents' => null, 'stock' => 3, 'featured' => false, 'short' => 'Dourado e âmbar sobre porcelana branca.', 'description' => 'Prato decorativo em porcelana branca com pintura autoral de Oxum, em tons dourados e âmbar. Filete em ouro na borda, aplicado à mão.'],
    ['slug' => 'prato-porcelana-ogum', 'name' => 'Prato em porcelana — Ogum', 'category' => 'orixas', 'image' => '/demo/ogum.svg', 'priceInCents' => 16900, 'saleInCents' => null, 'stock' => 0, 'featured' => false, 'short' => 'Verde profundo e detalhes metálicos.', 'description' => 'Prato decorativo em porcelana branca com representação autoral de Ogum. Pintura à mão em verde profundo, com detalhes metálicos e filete dourado.'],
];

$placeholderNotice = "> ⚠️ **Conteúdo de demonstração.** Este texto é um espaço reservado e **não tem validade jurídica**. Precisa ser substituído pelo conteúdo oficial fornecido pelo cliente antes do lançamento.\n\n";

$contentPages = [
    ['slug' => 'sobre', 'title' => 'Sobre', 'content' => $placeholderNotice . "Espaço reservado para a história da marca, o processo de criação das peças e a apresentação da artista.\n\nInformações necessárias: trajetória, técnica utilizada, o que torna cada peça única."],
    ['slug' => 'contato', 'title' => 'Contato', 'content' => $placeholderNotice . "Espaço reservado para os canais de atendimento.\n\nInformações pendentes: e-mail, WhatsApp, Instagram e horário de atendimento."],
    ['slug' => 'politica-de-privacidade', 'title' => 'Política de Privacidade', 'content' => $placeholderNotice . "Documento obrigatório pela LGPD. Deve descrever quais dados são coletados, com qual finalidade, por quanto tempo são guardados, com quem são compartilhados e como o titular exerce seus direitos.\n\nRecomendação: redigir com apoio jurídico."],
    ['slug' => 'termos', 'title' => 'Termos de Uso', 'content' => $placeholderNotice . "Documento que estabelece as condições de uso do site e de compra.\n\nRecomendação: redigir com apoio jurídico."],
    ['slug' => 'trocas-e-devolucoes', 'title' => 'Trocas e Devoluções', 'content' => $placeholderNotice . "Deve contemplar o direito de arrependimento de 7 dias previsto no Código de Defesa do Consumidor para compras online, além das condições específicas para peças artesanais.\n\nInformações pendentes: prazo, condições, quem paga o frete de devolução."],
    ['slug' => 'entrega', 'title' => 'Entrega', 'content' => $placeholderNotice . "Informações pendentes: prazo de produção, prazo de envio, transportadoras utilizadas, regiões atendidas e política de frete grátis (se houver)."],
    ['slug' => 'atendimento', 'title' => 'Atendimento', 'content' => $placeholderNotice . "Informações pendentes: canais, horários e prazo de resposta."],
];

$settings = [
    ['key' => 'home.hero', 'group' => 'home', 'value' => ['title' => 'Pincel & Guia', 'subtitle' => 'Porcelana autoral feita à mão', 'tagline' => 'Arte, fé e ancestralidade em cada peça', 'ctaLabel' => 'Conheça a coleção', 'ctaHref' => '/loja', 'imageUrl' => '/demo/hero.svg', 'imageAlt' => 'Composição de demonstração com três pratos de porcelana pintados à mão']],
    ['key' => 'home.featuredTitle', 'group' => 'home', 'value' => ['title' => 'Peças em destaque', 'linkLabel' => 'Ver todas']],
    ['key' => 'shipping.flatRate', 'group' => 'frete', 'value' => ['priceInCents' => 2500, 'estimatedDays' => 7, 'label' => 'Envio padrão', 'freeShippingThresholdInCents' => null]],
    ['key' => 'store.contact', 'group' => 'loja', 'value' => ['email' => null, 'whatsapp' => null, 'instagram' => null, 'legalName' => null, 'document' => null]],
];

echo "🌱 Populando banco com dados de DEMONSTRAÇÃO (Fase 1)...\n\n";

$db->beginTransaction();
try {
    // --- Configurações ---
    $stmt = $db->prepare('INSERT INTO settings (`key`, value, `group`) VALUES (:key, :value, :group)
        ON DUPLICATE KEY UPDATE value = VALUES(value), `group` = VALUES(`group`)');
    foreach ($settings as $s) {
        $stmt->execute(['key' => $s['key'], 'value' => json_encode($s['value'], JSON_UNESCAPED_UNICODE), 'group' => $s['group']]);
    }
    echo '✓ ' . count($settings) . " configurações\n";

    // --- Páginas institucionais ---
    $findPage = $db->prepare('SELECT id FROM content_pages WHERE slug = :slug');
    $insertPage = $db->prepare('INSERT INTO content_pages (id, slug, title, content, is_published, is_placeholder) VALUES (:id, :slug, :title, :content, 1, 1)');
    foreach ($contentPages as $p) {
        $findPage->execute(['slug' => $p['slug']]);
        if ($findPage->fetch() === false) {
            $insertPage->execute(['id' => genId(), 'slug' => $p['slug'], 'title' => $p['title'], 'content' => $p['content']]);
        }
    }
    echo '✓ ' . count($contentPages) . " páginas institucionais (placeholders)\n";

    // --- Categorias ---
    $categoryIdBySlug = [];
    $findCategory = $db->prepare('SELECT id FROM categories WHERE slug = :slug');
    $insertCategory = $db->prepare(
        'INSERT INTO categories (id, slug, name, description, image_url, image_alt, show_on_home, position, meta_title, meta_description)
         VALUES (:id, :slug, :name, :description, :imageUrl, :imageAlt, :showOnHome, :position, :metaTitle, :metaDescription)',
    );
    $updateCategory = $db->prepare(
        'UPDATE categories SET name = :name, description = :description, image_url = :imageUrl, image_alt = :imageAlt,
         show_on_home = :showOnHome, position = :position WHERE id = :id',
    );
    foreach ($categories as $c) {
        $findCategory->execute(['slug' => $c['slug']]);
        $existing = $findCategory->fetch();

        if ($existing !== false) {
            $id = $existing['id'];
            $updateCategory->execute([
                'id' => $id, 'name' => $c['name'], 'description' => $c['description'],
                'imageUrl' => $c['imageUrl'], 'imageAlt' => $c['imageAlt'],
                'showOnHome' => $c['showOnHome'] ? 1 : 0, 'position' => $c['position'],
            ]);
        } else {
            $id = genId();
            $insertCategory->execute([
                'id' => $id, 'slug' => $c['slug'], 'name' => $c['name'], 'description' => $c['description'],
                'imageUrl' => $c['imageUrl'], 'imageAlt' => $c['imageAlt'], 'showOnHome' => $c['showOnHome'] ? 1 : 0,
                'position' => $c['position'], 'metaTitle' => "{$c['name']} | Pincel & Guia", 'metaDescription' => $c['description'],
            ]);
        }
        $categoryIdBySlug[$c['slug']] = $id;
    }
    echo '✓ ' . count($categories) . " categorias\n";

    // --- Produtos ---
    $findProduct = $db->prepare('SELECT id FROM products WHERE slug = :slug');
    $insertProduct = $db->prepare(
        'INSERT INTO products (id, slug, name, description, short_description, category_id, base_price_in_cents,
             sale_price_in_cents, is_active, is_featured, position, weight_in_grams, width_mm, height_mm, length_mm,
             meta_title, meta_description)
         VALUES (:id, :slug, :name, :description, :short, :categoryId, :price, :sale, 1, :featured, :position,
             900, 280, 60, 280, :metaTitle, :metaDescription)',
    );
    $findImage = $db->prepare('SELECT id FROM product_images WHERE product_id = :productId LIMIT 1');
    $insertImage = $db->prepare(
        'INSERT INTO product_images (id, product_id, url, alt, width, height, position, is_primary)
         VALUES (:id, :productId, :url, :alt, 800, 800, 0, 1)',
    );
    $upsertVariant = $db->prepare(
        'INSERT INTO product_variants (id, product_id, sku, name, stock, is_active, position)
         VALUES (:id, :productId, :sku, :name, :stock, 1, 0)
         ON DUPLICATE KEY UPDATE stock = VALUES(stock)',
    );

    foreach ($products as $index => $p) {
        $categoryId = $categoryIdBySlug[$p['category']] ?? null;
        if ($categoryId === null) {
            throw new RuntimeException("Categoria não encontrada: {$p['category']}");
        }

        $findProduct->execute(['slug' => $p['slug']]);
        $existingProduct = $findProduct->fetch();
        $productId = $existingProduct['id'] ?? genId();

        if ($existingProduct === false) {
            $insertProduct->execute([
                'id' => $productId, 'slug' => $p['slug'], 'name' => $p['name'], 'description' => $p['description'],
                'short' => $p['short'], 'categoryId' => $categoryId, 'price' => $p['priceInCents'],
                'sale' => $p['saleInCents'], 'featured' => $p['featured'] ? 1 : 0, 'position' => $index,
                'metaTitle' => "{$p['name']} | Pincel & Guia", 'metaDescription' => $p['short'],
            ]);
        }

        $findImage->execute(['productId' => $productId]);
        if ($findImage->fetch() === false) {
            $insertImage->execute(['id' => genId(), 'productId' => $productId, 'url' => $p['image'], 'alt' => "[DEMONSTRAÇÃO] {$p['name']}"]);
        }

        $sku = slugToSku($p['slug']);
        $existingVariantId = null;
        $findVariant = $db->prepare('SELECT id FROM product_variants WHERE sku = :sku');
        $findVariant->execute(['sku' => $sku]);
        $existingVariant = $findVariant->fetch();

        $upsertVariant->execute([
            'id' => $existingVariant['id'] ?? genId(), 'productId' => $productId, 'sku' => $sku,
            'name' => 'Padrão', 'stock' => $p['stock'],
        ]);
    }
    echo '✓ ' . count($products) . " produtos (com variante padrão e imagem)\n";

    $db->commit();
    echo "\n✅ Concluído. Lembre-se: todos os dados são fictícios.\n";
} catch (\Throwable $e) {
    $db->rollBack();
    fwrite(STDERR, '❌ Falha no seed: ' . $e->getMessage() . "\n");
    exit(1);
}
