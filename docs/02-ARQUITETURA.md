# 02 — Arquitetura

## Princípio central

Monólito **modular**. A separação que importa não é entre servidores — é entre camadas.

```
┌──────────────────────────────────────────────────┐
│  APRESENTAÇÃO   app/ + components/               │
│  Páginas, componentes React, layouts.            │
│  NÃO contém regra de negócio. NÃO fala com o DB. │
└───────────────────┬──────────────────────────────┘
                    │ chama use-cases
┌───────────────────▼──────────────────────────────┐
│  APLICAÇÃO      modules/*/application/           │
│  Use-cases: orquestram, validam, transacionam.   │
│  Ex.: criarPedido, aplicarCupom, reservarEstoque │
└───────────────────┬──────────────────────────────┘
                    │ usa
┌───────────────────▼──────────────────────────────┐
│  DOMÍNIO        modules/*/domain/                │
│  Tipos, regras puras, cálculos. ZERO I/O.        │
│  Ex.: calcularTotais, validarCupom, precoFinal   │
└───────────────────┬──────────────────────────────┘
                    │ implementado por
┌───────────────────▼──────────────────────────────┐
│  INFRAESTRUTURA modules/*/infrastructure/        │
│  Prisma, Mercado Pago, Melhor Envio, R2, Resend. │
└──────────────────────────────────────────────────┘
```

**Regra de dependência:** as setas só apontam para baixo. `domain/` não importa nada de `infrastructure/`, de `next/` ou do Prisma. É isso que torna as regras de preço, cupom e estoque testáveis em milissegundos e portáveis para outro projeto da VORTEXIS.

## Estrutura de pastas

```
src/
├── app/
│   ├── (loja)/                    # site público
│   │   ├── page.tsx               # Home
│   │   ├── loja/                  # catálogo
│   │   ├── produto/[slug]/
│   │   ├── categoria/[slug]/
│   │   ├── carrinho/
│   │   ├── checkout/
│   │   ├── pedido/[numero]/
│   │   └── (institucional)/       # sobre, contato, políticas
│   ├── (conta)/minha-conta/       # área logada do cliente
│   ├── admin/                     # painel — layout e middleware próprios
│   ├── api/
│   │   ├── webhooks/mercadopago/  # POST — assinatura verificada
│   │   ├── uploads/               # POST — URL pré-assinada
│   │   └── health/
│   ├── sitemap.ts
│   └── robots.ts
│
├── modules/                       # ← o coração do sistema
│   ├── catalog/                   # produtos, categorias, variações, imagens
│   ├── cart/                      # carrinho e itens
│   ├── inventory/                 # estoque, reservas, movimentações
│   ├── coupons/                   # cupons e regras de desconto
│   ├── checkout/                  # orquestra pedido + pagamento + frete
│   ├── orders/                    # pedidos, status, histórico
│   ├── payments/                  # PaymentGateway + adapter Mercado Pago
│   ├── shipping/                  # ShippingProvider + adapters
│   ├── storage/                   # StorageProvider + adapter R2
│   ├── accounts/                  # usuários, endereços, perfis
│   └── notifications/             # e-mails transacionais
│
├── components/
│   ├── ui/                        # primitivos (Button, Input, Dialog…)
│   ├── loja/                      # ProductCard, CartDrawer, Gallery…
│   └── admin/                     # DataTable, StatusBadge, forms…
│
├── lib/
│   ├── db.ts                      # singleton do Prisma
│   ├── auth.ts                    # config do Better Auth
│   ├── env.ts                     # validação das env vars com Zod
│   ├── money.ts                   # centavos → formatação, nunca float
│   ├── errors.ts                  # erros de domínio tipados
│   ├── rate-limit.ts
│   └── logger.ts                  # log estruturado, com redação de PII
│
└── styles/
    └── globals.css                # tokens de design
```

Cada módulo segue o mesmo formato interno:

```
modules/orders/
├── domain/
│   ├── order.types.ts
│   └── order-totals.ts        # função pura, 100% testável
├── application/
│   ├── create-order.ts
│   └── update-order-status.ts
├── infrastructure/
│   └── order.repository.ts    # única coisa que conhece o Prisma
└── index.ts                   # API pública do módulo
```

**Módulos conversam apenas pelo `index.ts` um do outro.** Ninguém importa `modules/orders/infrastructure/...` de fora do módulo `orders`.

## As três interfaces que protegem o projeto

Estas abstrações são a diferença entre "trocar de fornecedor" e "reescrever o sistema".

### `PaymentGateway`

```ts
export interface PaymentGateway {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  getPayment(gatewayPaymentId: string): Promise<PaymentStatus>;
  verifyWebhook(req: WebhookRequest): Promise<VerifiedEvent | null>;
  refund(gatewayPaymentId: string, amountInCents?: number): Promise<RefundResult>;
}
```

Implementação inicial: `MercadoPagoGateway`. O use-case `createOrder` recebe um `PaymentGateway` injetado — nos testes, recebe um fake, sem rede.

### `ShippingProvider`

```ts
export interface ShippingProvider {
  readonly name: string;
  quote(input: QuoteInput): Promise<ShippingOption[]>;   // CEP + dimensões + peso
  createLabel?(orderId: string): Promise<LabelResult>;   // opcional
  track?(code: string): Promise<TrackingEvent[]>;        // opcional
}
```

Implementações previstas: `FlatRateProvider` (taxa configurada no admin — funciona desde o dia 1, sem contrato externo) e `MelhorEnvioProvider`. Retirada no local entra como um terceiro adapter, se o cliente quiser.

### `StorageProvider`

```ts
export interface StorageProvider {
  getUploadUrl(key: string, contentType: string): Promise<PresignedUpload>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
}
```

O banco guarda apenas `key`, `url`, `alt`, `width`, `height`, `position` — **nunca o binário da imagem**, conforme a seção 14 do briefing. O upload vai direto do navegador para o R2 via URL pré-assinada, sem passar pelo nosso servidor.

## Tratamento de erros

Erros de domínio são tipados e explícitos, nunca `throw new Error("deu ruim")`:

```ts
class InsufficientStockError extends DomainError { code = "INSUFFICIENT_STOCK" }
class CouponExpiredError    extends DomainError { code = "COUPON_EXPIRED" }
class PaymentDeclinedError  extends DomainError { code = "PAYMENT_DECLINED" }
```

A camada de apresentação traduz `code` para mensagem em português. O usuário vê "Restam apenas 2 unidades desta peça", nunca um stack trace. O log guarda o detalhe técnico; a resposta HTTP não.

## Convenções de TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`.
- `any` proibido. Onde o tipo é realmente desconhecido (payload de webhook), usa-se `unknown` + parsing com Zod.
- Todo dado que cruza a fronteira do sistema (form, query string, webhook, env var) passa por um schema Zod antes de ser usado.
- Valores monetários são `number` inteiro em centavos, com o sufixo `InCents` no nome (`priceInCents`, `subtotalInCents`). O helper `lib/money.ts` centraliza formatação e aritmética.
