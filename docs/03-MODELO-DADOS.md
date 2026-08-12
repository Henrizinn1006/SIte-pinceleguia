# 03 — Modelo de Dados

PostgreSQL, migrations via `prisma migrate`. Nenhuma alteração de schema é feita direto no banco.

## Convenções globais

- Chave primária: `String @id @default(cuid())` — evita expor volume de vendas por ID sequencial.
- Timestamps: `createdAt` / `updatedAt` em toda tabela relevante.
- Exclusão lógica: `deletedAt DateTime?` em `products` e `categories` — nunca apagar algo referenciado por pedidos antigos.
- **Dinheiro: `Int` em centavos.** `R$ 157,00` → `15700`. Nenhum `Float`/`Decimal` para preço.
- Nomes de tabela em `snake_case` plural via `@@map`; modelos Prisma em `PascalCase`.
- Enums no banco, não strings soltas.

## Diagrama de relacionamentos

```
users ──< addresses
  │
  ├──< carts ──< cart_items >── product_variants >── products ──< product_images
  │                                                     │            │
  └──< orders ──< order_items (snapshot)                │            └─< (categoria)
        │  │                                            │
        │  ├──< order_status_history                    └──< inventory_movements
        │  ├──< payments ──< payment_events
        │  └──< shipments
        │
        └──> coupons ──< coupon_redemptions

categories ──< categories (auto-relação: subcategoria)
settings   (chave/valor: frete padrão, dados da loja, textos da home)
content_pages (institucionais editáveis)
admin_audit_log
```

## Entidades

### `users`
| Campo | Tipo | Notas |
|---|---|---|
| id | String PK | cuid |
| name / lastName | String | |
| email | String | **UNIQUE**, lowercase normalizado |
| emailVerified | Boolean | |
| passwordHash | String? | nulo se só login social |
| phone | String? | |
| role | Enum `CUSTOMER \| ADMIN` | default `CUSTOMER` |
| isActive | Boolean | permite desativar sem apagar |
| createdAt / updatedAt | | |

Tabelas auxiliares do Better Auth: `sessions`, `accounts`, `verifications`. Índice em `sessions.expiresAt` para limpeza.

### `addresses`
`userId FK`, `label`, `recipientName`, `zipCode`, `street`, `number`, `complement`, `district`, `city`, `state` (2 chars), `isDefault`.
Índice: `(userId, isDefault)`.

### `categories`
`id`, `name`, `slug` UNIQUE, `description?`, `imageUrl?`, `parentId FK? → categories`, `position Int`, `isActive`, `deletedAt?`, SEO (`metaTitle`, `metaDescription`).
Índices: `slug`, `(isActive, position)`.

> As categorias da home (Orixás, Guias & Entidades, Guias de proteção, Coleções) vêm daqui. **Nada hardcoded no frontend**, conforme a seção 4.

### `products`
| Campo | Tipo | Notas |
|---|---|---|
| id | String PK | |
| name | String | |
| slug | String UNIQUE | usado na URL `/produto/[slug]` |
| description | Text | |
| shortDescription | String? | usado no card e na meta description |
| categoryId | FK → categories | |
| basePriceInCents | Int | preço quando não há variação |
| salePriceInCents | Int? | preço promocional |
| saleStartsAt / saleEndsAt | DateTime? | promoção agendada |
| isActive | Boolean | |
| isFeatured | Boolean | alimenta "Peças em destaque" |
| weightInGrams, widthMm, heightMm, lengthMm | Int? | necessários para cotar frete |
| position | Int | ordenação manual |
| metaTitle / metaDescription | String? | SEO |
| deletedAt | DateTime? | |

Índices: `slug`, `(isActive, isFeatured)`, `(categoryId, isActive)`, `(isActive, createdAt DESC)`, índice GIN para busca textual em `name`/`description`.

**Constraint:** `salePriceInCents IS NULL OR salePriceInCents < basePriceInCents`.

### `product_images`
`productId FK`, `storageKey`, `url`, `alt` (obrigatório — acessibilidade), `width`, `height`, `position`, `isPrimary`.
Índice único parcial: **apenas uma imagem primária por produto**.

### `product_variants`
`productId FK`, `sku` UNIQUE, `name` ("Tamanho P"), `priceInCents?` (sobrepõe o preço base), `salePriceInCents?`, `stock Int`, `isActive`, `position`, dimensões opcionais.

> Todo produto tem **pelo menos uma variante**, mesmo os que não têm opções — uma variante "padrão". Isso elimina o `if (temVariacao)` espalhado por todo o código de estoque e carrinho, que é uma fonte clássica de bug.

**Constraint:** `stock >= 0`.

### `inventory_movements` — trilha de auditoria do estoque
`variantId FK`, `type` (`SALE`, `RESTOCK`, `MANUAL_ADJUSTMENT`, `CANCELLATION_RETURN`, `RESERVATION`, `RESERVATION_RELEASE`), `quantity Int` (positivo ou negativo), `orderId?`, `userId?` (quem fez o ajuste), `note?`, `createdAt`.

Toda alteração de `stock` gera um registro aqui. Se o estoque físico divergir do sistema, existe histórico para investigar.

### `stock_reservations`
`variantId FK`, `orderId FK`, `quantity`, `expiresAt`, `releasedAt?`.
Necessário para PIX: o pedido fica aguardando pagamento por 30 min com a peça reservada. Um job libera reservas expiradas. Índice em `expiresAt` (parcial, `releasedAt IS NULL`).

### `carts` / `cart_items`
`carts`: `id`, `userId FK?`, `sessionToken?` (cookie httpOnly para visitante), `expiresAt`, `couponId?`.
`cart_items`: `cartId FK`, `variantId FK`, `quantity`.
UNIQUE `(cartId, variantId)` — adicionar o mesmo item soma quantidade em vez de duplicar linha.

> **O carrinho vive no servidor**, não em localStorage. Isso atende ao requisito de persistência e impede manipulação de preço pelo cliente. Ao logar, o carrinho de visitante é mesclado ao do usuário.

### `coupons`
`code` UNIQUE (uppercase), `description`, `discountType` (`PERCENTAGE \| FIXED`), `discountValue Int` (basis points ou centavos), `minOrderInCents?`, `maxDiscountInCents?` (teto para cupom percentual), `startsAt?`, `endsAt?`, `usageLimit?`, `usageCount`, `usageLimitPerCustomer?`, `isActive`.

### `coupon_redemptions`
`couponId FK`, `orderId FK`, `userId?`, `discountAppliedInCents`. UNIQUE `(couponId, orderId)`.
O limite por cliente é verificado contando esta tabela, dentro da mesma transação que cria o pedido.

### `orders` — o núcleo
| Campo | Notas |
|---|---|
| id | cuid |
| orderNumber | String UNIQUE, legível (`PG-2026-000142`) — é o que o cliente informa no atendimento |
| userId FK? | nulo se checkout como visitante |
| status | Enum (ver abaixo) |
| **Snapshot do cliente** | `customerName`, `customerEmail`, `customerPhone`, `customerDocument?` |
| **Snapshot do endereço** | `shippingZipCode`, `shippingStreet`, `shippingNumber`, `shippingComplement`, `shippingDistrict`, `shippingCity`, `shippingState` |
| **Valores** | `subtotalInCents`, `shippingInCents`, `discountInCents`, `totalInCents` |
| Frete | `shippingMethod`, `shippingCarrier?`, `estimatedDeliveryDays?` |
| couponId FK?, couponCode? | código também copiado como texto |
| customerNote? / internalNote? | |
| paidAt, shippedAt, deliveredAt, cancelledAt | DateTime? |

**Por que tanto snapshot:** se o cliente mudar de endereço ou o produto mudar de nome, o pedido antigo tem que continuar contando a verdade daquele momento. É requisito explícito da seção 12 e é o que torna o histórico auditável.

Índices: `orderNumber`, `(userId, createdAt DESC)`, `(status, createdAt DESC)`, `customerEmail`.

**Status:**
```
PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED
       └──────────┴────────┴─────────→ CANCELLED
                                     → REFUNDED
```
Transições válidas ficam numa máquina de estados em `modules/orders/domain/` — o admin não consegue pular de `PENDING_PAYMENT` para `DELIVERED`.

### `order_items` — snapshot da linha
`orderId FK`, `productId FK?` (`ON DELETE SET NULL`), `variantId FK?`, e então **copiado no momento da compra**: `productName`, `variantName?`, `sku?`, `imageUrl?`, `unitPriceInCents`, `quantity`, `subtotalInCents`.

Consultar um pedido de 2026 nunca faz JOIN em `products` para saber preço ou nome.

### `payments`
`orderId FK`, `gateway` ("mercadopago"), `gatewayPaymentId` UNIQUE, `method` (`PIX \| CREDIT_CARD \| BOLETO`), `status` (`PENDING \| APPROVED \| REJECTED \| REFUNDED \| CANCELLED`), `amountInCents`, `installments?`, `pixQrCode?`, `pixQrCodeBase64?`, `pixExpiresAt?`, `cardBrand?`, `cardLastFour?`, `rawResponse Json` (com dados sensíveis removidos), `paidAt?`.

> **Nunca** armazenamos número de cartão, CVV ou validade. Apenas bandeira e 4 últimos dígitos, que o próprio gateway devolve.

### `payment_events` — idempotência de webhook
`paymentId FK?`, `gateway`, `gatewayEventId` **UNIQUE**, `eventType`, `payload Json`, `processedAt?`, `error?`.

O `UNIQUE` em `gatewayEventId` é o que garante que um webhook reenviado pelo Mercado Pago (o que acontece rotineiramente) não aprove o mesmo pedido duas vezes.

### `shipments`
`orderId FK`, `carrier`, `trackingCode?`, `trackingUrl?`, `labelUrl?`, `shippedAt?`, `deliveredAt?`, `providerShipmentId?`.

### `settings` — configuração editável pelo admin
`key` UNIQUE, `value Json`, `group`.
Guarda: taxa de frete fixa, faixa de frete grátis, textos e imagem do hero, dados de contato da loja, redes sociais. **Permite mudar o hero da home sem deploy**, como pedido na seção 3.

### `content_pages`
`slug` UNIQUE, `title`, `content` (Markdown/HTML), `metaTitle?`, `metaDescription?`, `isPublished`.
Para Sobre, Política de Privacidade, Termos, Trocas e Devoluções, Entrega. Nascem com placeholder marcado — nenhum texto jurídico inventado.

### `admin_audit_log`
`userId FK`, `action`, `entityType`, `entityId`, `changes Json`, `ipAddress`, `createdAt`.
Registra quem mudou preço, quem cancelou pedido, quem ajustou estoque.

## Controle de concorrência de estoque

O cenário a evitar: duas pessoas comprando a última peça ao mesmo tempo.

A decisão é **não confiar em leitura seguida de escrita**. A baixa é atômica e condicional, no próprio banco:

```sql
UPDATE product_variants
   SET stock = stock - $quantidade
 WHERE id = $variantId
   AND stock >= $quantidade;
-- se afetou 0 linhas → InsufficientStockError, transação inteira sofre rollback
```

Tudo isso dentro de uma transação Prisma que cria pedido, itens, movimentações e reserva:

```ts
await db.$transaction(async (tx) => {
  for (const item of items) {
    const r = await tx.$executeRaw`UPDATE product_variants
        SET stock = stock - ${item.qty}
      WHERE id = ${item.variantId} AND stock >= ${item.qty}`;
    if (r === 0) throw new InsufficientStockError(item.variantId);
  }
  const order = await tx.order.create({ /* … */ });
  await tx.inventoryMovement.createMany({ /* … */ });
  await tx.stockReservation.createMany({ /* … */ });
  return order;
}, { isolationLevel: "ReadCommitted", timeout: 10_000 });
```

Peças artesanais frequentemente têm estoque 1 — este é o ponto do sistema que mais merece teste automatizado, e ele está priorizado na Fase 6.

**Devolução ao estoque** acontece em: cancelamento manual, rejeição do pagamento e expiração da reserva (job periódico). Sempre gerando `inventory_movement`, nunca por `UPDATE` direto.
