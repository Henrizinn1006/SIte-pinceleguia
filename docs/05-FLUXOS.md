# 05 — Fluxos Críticos

## Fluxo principal: produto → carrinho → checkout → pagamento → pedido → admin

```
1. CLIENTE ESCOLHE
   /produto/[slug] → seleciona variação e quantidade → addToCart()
   Servidor: valida que a variante existe, está ativa e tem estoque.
   Estoque NÃO é reservado aqui — item no carrinho não segura peça.

2. CARRINHO
   Persistido em banco (cookie httpOnly para visitante, userId se logado).
   Servidor recalcula subtotal a cada leitura, a partir do preço atual.
   Cupom pode ser aplicado — validado, mas ainda não consumido.

3. CHECKOUT
   Dados do cliente + endereço.
   calculateShipping(CEP) → ShippingProvider → opções de entrega.
   O cliente escolhe UMA opção; guardamos o ID, não o valor enviado por ele.

4. CRIAÇÃO DO PEDIDO  ← ponto mais crítico do sistema
   Uma única transação de banco:
     a. relê o carrinho no servidor
     b. revalida preço, disponibilidade e status de cada variante
     c. revalida o cupom (validade, mínimo, limite global e por cliente)
     d. recalcula subtotal, desconto, frete e total DO ZERO
     e. baixa o estoque de forma atômica e condicional
     f. cria order + order_items com SNAPSHOT completo
     g. registra inventory_movements e stock_reservations
     h. status = PENDING_PAYMENT
   Qualquer falha → rollback total. Nada de pedido pela metade.

5. PAGAMENTO
   PaymentGateway.createPayment() com o total calculado NO SERVIDOR.
   PIX    → devolve QR Code + copia-e-cola, expira em 30 min
   Cartão → token gerado no navegador pelo SDK do gateway;
            o número do cartão nunca toca nosso servidor
   Cliente é levado para /checkout/pagamento/[orderId].

6. CONFIRMAÇÃO  ← via webhook, nunca pelo frontend
   Mercado Pago → POST /api/webhooks/mercadopago
     a. verifica assinatura HMAC (x-signature)
     b. grava payment_event (UNIQUE em gatewayEventId → idempotente)
     c. CONSULTA a API do gateway pelo ID — o corpo do webhook
        é apenas um aviso, a fonte da verdade é a consulta
     d. se aprovado: payment=APPROVED, order=PAID, paidAt,
        libera reserva (a baixa de estoque já foi feita), e-mail ao cliente
     e. se rejeitado: devolve estoque, order=CANCELLED, avisa o cliente
     f. responde 200 rapidamente
   A tela do cliente faz polling do status. Ela NUNCA marca como pago.

7. OPERAÇÃO (admin)
   Pedido aparece no dashboard como PAID.
   Admin: PREPARING → SHIPPED (com código de rastreio) → DELIVERED.
   Cada mudança grava order_status_history e dispara e-mail.
```

## Máquina de estados do pedido

```
PENDING_PAYMENT ──┬─→ PAID ──→ PREPARING ──→ SHIPPED ──→ DELIVERED
                  │              │              │
                  └─→ CANCELLED ←┴──────────────┘
                       PAID ──→ REFUNDED
```

Transições permitidas ficam num mapa em `modules/orders/domain/order-status.ts`. O admin não consegue pular etapas nem "descancelar" um pedido. Toda transição registra autor, timestamp e observação.

## Cálculo de totais — função pura e testável

```ts
// modules/checkout/domain/calculate-totals.ts — zero I/O
export function calculateTotals(input: {
  items: { unitPriceInCents: number; quantity: number }[];
  coupon?: Coupon;
  shippingInCents: number;
  freeShippingThresholdInCents?: number;
}): OrderTotals
```

Ordem de aplicação (importa e precisa estar travada por teste):

1. `subtotal = Σ (preçoUnitário × quantidade)`
2. `desconto` — percentual sobre o subtotal (respeitando `maxDiscountInCents`) ou valor fixo; nunca maior que o subtotal
3. `frete` — zerado se `(subtotal − desconto) ≥ limiteDeFreteGrátis`
4. `total = subtotal − desconto + frete`

Cupom **não** incide sobre o frete. Arredondamento sempre para baixo, em centavos inteiros.

## Estoque

| Momento | O que acontece |
|---|---|
| Adicionar ao carrinho | Apenas verifica. Não reserva. |
| Criar pedido | Baixa atômica + reserva com validade de 30 min |
| Pagamento aprovado | Reserva liberada (a baixa já é definitiva) |
| Pagamento rejeitado | Estoque devolvido, pedido cancelado |
| Reserva expirada (cron) | Estoque devolvido, pedido cancelado |
| Cancelamento pelo admin | Estoque devolvido com movimento registrado |
| Ajuste manual | Movimento `MANUAL_ADJUSTMENT` com justificativa e autor |

**Por que baixar no pedido e não no pagamento:** com PIX, existe uma janela de até 30 minutos entre pedido e confirmação. Peças artesanais costumam ter estoque 1. Se não baixássemos na criação, duas pessoas poderiam gerar QR Code para a mesma peça e uma delas pagaria por algo inexistente — um problema muito pior de resolver do que uma reserva temporária.

## Frete

```ts
interface ShippingOption {
  id: string; providerId: string; name: string;   // "PAC", "SEDEX"
  carrier: string; priceInCents: number;
  estimatedDays: number; deadline?: Date;
}
```

Estratégia por fase:

- **Fase 1–3 — `FlatRateProvider`**: valor configurado no admin, com regra opcional de frete grátis acima de X. Funciona sem contrato externo e permite lançar a loja.
- **Fase 4 — `MelhorEnvioProvider`**: cotação real por CEP, peso e dimensões, com múltiplas transportadoras e geração de etiqueta.
- **Futuro** — `PickupProvider` (retirada) é só mais um adapter.

Cotações são cacheadas por 1h por `(CEP, peso, dimensões)` para reduzir chamadas externas. O valor apresentado ao cliente é sempre reconfirmado no servidor antes de criar o pedido.

> DECISÃO PENDENTE: origem do envio (CEP e endereço reais da loja) e se haverá contrato com Melhor Envio ou Correios.

## Pagamento — detalhes de segurança

**PIX:** `createPayment` → QR Code + copia-e-cola + expiração. Nenhum dado sensível envolvido.

**Cartão:** o Payment Brick do Mercado Pago roda no navegador, tokeniza os dados e devolve um token de uso único. Nosso servidor recebe **apenas o token**. Consequência prática: número, CVV e validade nunca entram no nosso banco, nos nossos logs ou na nossa infraestrutura — e o escopo de PCI-DSS fica reduzido ao mínimo (SAQ A).

**Webhook — as quatro regras:**

1. Verificar a assinatura HMAC antes de qualquer processamento; assinatura inválida → 401 e nada é gravado.
2. Registrar o evento com `UNIQUE` em `gatewayEventId` — reenvios (que são rotineiros) viram no-op.
3. Nunca confiar no corpo do webhook para valor ou status: consultar a API do gateway pelo ID.
4. Conferir se o valor aprovado bate com o total do pedido. Divergência → não aprova, registra alerta.

## Recuperação e casos de borda

| Situação | Tratamento |
|---|---|
| Webhook não chega | Job de reconciliação consulta o gateway para pedidos `PENDING_PAYMENT` com mais de 15 min |
| Cliente fecha o navegador após pagar | Pedido já existe; webhook confirma; e-mail com link de acompanhamento |
| Preço muda entre carrinho e checkout | Servidor detecta, avisa o cliente e pede reconfirmação |
| Peça esgota durante o checkout | `InsufficientStockError` com mensagem clara e item destacado no carrinho |
| Cupom expira durante o checkout | Removido com aviso, totais recalculados |
| Pagamento aprovado em pedido já cancelado | Estorno automático + alerta para o admin |

## Checkout como visitante — recomendação

**Sim, permitir.** Exigir cadastro antes da compra é uma das maiores causas de abandono de carrinho no varejo brasileiro, e o público desta loja não é necessariamente familiarizado com cadastros.

Implementação: o pedido é criado com `userId = null` e os dados do cliente no snapshot. Ao final, oferecemos criar conta com um clique (a senha é o único dado que falta). Se depois a pessoa se cadastrar com o mesmo e-mail **verificado**, os pedidos anteriores são vinculados à conta.

Acompanhamento do pedido para visitante: link com token assinado enviado por e-mail — nunca acesso por adivinhação do número do pedido.
