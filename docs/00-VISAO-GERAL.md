# 00 — Visão Geral

## O que estamos construindo

Um e-commerce completo e operável pelo cliente final, não um catálogo estático:

```
Site público  →  Carrinho  →  Checkout  →  Gateway de pagamento
                                                   ↓ webhook
                              Pedido  ←  Confirmação de pagamento
                                 ↓
                         Painel administrativo
                    (produtos, estoque, pedidos, cupons)
```

O sistema precisa atender simultaneamente a três públicos:

1. **Cliente comprador** — navega, escolhe, compra e acompanha o pedido.
2. **Andreia / operação da loja** — cadastra peças, controla estoque, despacha pedidos. Precisa ser simples o bastante para uso diário sem suporte técnico.
3. **VORTEXIS** — precisa conseguir manter, evoluir e reaproveitar a base em outros projetos.

## Resumo executivo das decisões

| Área | Decisão | Onde está detalhado |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript, full-stack | [01-STACK](01-STACK.md) |
| Estilo | Tailwind CSS + tokens de design próprios | [07-DESIGN-SYSTEM](07-DESIGN-SYSTEM.md) |
| Banco | PostgreSQL gerenciado (Neon) | [03-MODELO-DADOS](03-MODELO-DADOS.md) |
| ORM | Prisma + migrations versionadas | [03-MODELO-DADOS](03-MODELO-DADOS.md) |
| Auth | Better Auth (e-mail/senha, sessões, roles) | [06-SEGURANCA](06-SEGURANCA.md) |
| Pagamento | Mercado Pago **atrás de uma interface `PaymentGateway`** | [05-FLUXOS](05-FLUXOS.md) |
| Frete | Melhor Envio ou taxa fixa, **atrás de `ShippingProvider`** | [05-FLUXOS](05-FLUXOS.md) |
| Imagens | Cloudflare R2 (S3-compatível), **atrás de `StorageProvider`** | [02-ARQUITETURA](02-ARQUITETURA.md) |
| Hospedagem | Vercel (serverless gerenciado) | [08-DEPLOY-E-CUSTOS](08-DEPLOY-E-CUSTOS.md) |
| Arquitetura | Monólito modular com camadas explícitas | [02-ARQUITETURA](02-ARQUITETURA.md) |

## Princípios inegociáveis do projeto

1. **O frontend nunca decide nada importante.** Preço, estoque, desconto, valor de frete e status de pagamento são sempre recalculados e confirmados no servidor.
2. **Toda integração externa entra por uma interface.** Trocar Mercado Pago por outro gateway, ou Melhor Envio por Correios, deve ser uma troca de adapter — não uma reescrita.
3. **Pedido é um snapshot imutável.** Mudar o preço de um produto hoje não pode alterar o histórico de um pedido de ontem.
4. **Dinheiro é inteiro em centavos.** Nunca `float`. Nunca. `R$ 157,00` é armazenado como `15700`.
5. **Nada de dado inventado.** Onde falta informação real do cliente, existe um placeholder explicitamente marcado e uma entrada em [10-DECISOES-PENDENTES](10-DECISOES-PENDENTES.md).

## Sobre a referência visual

A prévia aprovada define a direção estética, não o layout final pixel a pixel. O que extraímos dela como obrigatório:

- Paleta clara: off-white, creme, bege, marrom e dourado discreto como acento.
- Tipografia serifada elegante nos títulos, sans-serif legível no corpo.
- Muito espaço em branco; a fotografia das peças é a protagonista.
- Cantos arredondados e sombras suaves; nenhuma borda dura ou cor saturada.
- Header com logo centralizado à esquerda, navegação horizontal, ícones de busca / conta / carrinho à direita.
- Hero amplo com composição de pratos, seguido de faixa de categorias e grade de destaques.

Diferenças intencionais em relação à imagem: o mobile não será uma redução do desktop, e os blocos de categoria e destaque virão do banco de dados, não fixos no código.
