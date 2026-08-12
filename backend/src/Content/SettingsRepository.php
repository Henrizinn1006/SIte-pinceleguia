<?php

declare(strict_types=1);

namespace App\Content;

use PDO;

/**
 * Porta de apps/storefront/src/modules/content/index.ts (getHero,
 * getFeaturedTitle, getStoreContact) — configuração editável (hoje só
 * via seed; edição pelo painel entra na Fase 2).
 *
 * Só as chaves em PUBLIC_KEYS são expostas por /api/configuracoes/publicas
 * — settings pode acumular chaves internas/administrativas no futuro
 * (ex.: frete) que não devem vazar por essa rota pública.
 */
final class SettingsRepository
{
    private const PUBLIC_KEYS = ['home.hero', 'home.featuredTitle', 'store.contact', 'shipping.flatRate'];

    private const HERO_FALLBACK = [
        'title' => 'Pincel & Guia',
        'subtitle' => 'Porcelana autoral feita à mão',
        'tagline' => 'Arte, fé e ancestralidade em cada peça',
        'ctaLabel' => 'Conheça a coleção',
        'ctaHref' => '/loja',
        'imageUrl' => '/demo/hero.svg',
        'imageAlt' => 'Composição com peças de porcelana pintadas à mão',
    ];

    private const FEATURED_TITLE_FALLBACK = [
        'title' => 'Peças em destaque',
        'linkLabel' => 'Ver todas',
    ];

    private const STORE_CONTACT_FALLBACK = [
        'email' => null,
        'whatsapp' => null,
        'instagram' => null,
        'legalName' => null,
        'document' => null,
    ];

    private const SHIPPING_FLAT_RATE_FALLBACK = [
        'priceInCents' => 0,
        'estimatedDays' => null,
        'label' => 'Envio padrão',
        'freeShippingThresholdInCents' => null,
    ];

    public function __construct(private readonly PDO $db)
    {
    }

    /** @return array<string, mixed> */
    public function getPublicSettings(): array
    {
        return [
            'homeHero' => $this->get('home.hero', self::HERO_FALLBACK),
            'homeFeaturedTitle' => $this->get('home.featuredTitle', self::FEATURED_TITLE_FALLBACK),
            'storeContact' => $this->get('store.contact', self::STORE_CONTACT_FALLBACK),
            'shippingFlatRate' => $this->get('shipping.flatRate', self::SHIPPING_FLAT_RATE_FALLBACK),
        ];
    }

    /** @param array<string, mixed> $fallback @return array<string, mixed> */
    private function get(string $key, array $fallback): array
    {
        if (!in_array($key, self::PUBLIC_KEYS, true)) {
            return $fallback;
        }

        try {
            $stmt = $this->db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
            $stmt->execute(['key' => $key]);
            $row = $stmt->fetch();
            if ($row === false) {
                return $fallback;
            }

            $decoded = json_decode((string) $row['value'], true);
            return is_array($decoded) ? [...$fallback, ...$decoded] : $fallback;
        } catch (\Throwable) {
            // Banco indisponível ou chave malformada: degrada com elegância,
            // igual ao fallback do módulo original em TypeScript.
            return $fallback;
        }
    }
}
