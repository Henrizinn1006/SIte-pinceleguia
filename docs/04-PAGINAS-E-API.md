# 04 — Páginas, Rotas e API

## Páginas públicas

| Rota | Página | Renderização | Notas |
|---|---|---|---|
| `/` | Home | ISR (revalidar 60s) | Hero, categorias, destaques — tudo do banco |
| `/loja` | Catálogo completo | SSR | Filtros e ordenação via query string |
| `/loja?categoria=&preco=&disponibilidade=&ordem=&pagina=` | Catálogo filtrado | SSR | Estado nos parâmetros da URL → compartilhável e indexável |
| `/categoria/[slug]` | Categoria | ISR | URL amigável e canônica para SEO |
| `/produto/[slug]` | Produto | ISR + `generateStaticParams` | Galeria, variações, relacionados, JSON-LD |
| `/busca?q=` | Resultados | SSR | `noindex` |
| `/carrinho` | Carrinho | Dinâmica | `noindex` |
| `/checkout` | Checkout | Dinâmica | `noindex`, headers de cache desativados |
| `/checkout/pagamento/[orderId]` | Pagamento (PIX/cartão) | Dinâmica | |
| `/pedido/[orderNumber]` | Confirmação / acompanhamento | Dinâmica | Acesso por token para visitante |
| `/sobre` `/contato` | Institucionais | ISR | |
| `/politica-de-privacidade` `/termos` `/trocas-e-devolucoes` `/entrega` `/atendimento` | Institucionais | ISR | Conteúdo em `content_pages` |
| `/entrar` `/cadastro` `/recuperar-senha` `/redefinir-senha/[token]` | Autenticação | Dinâmica | `noindex` |

Arquivos especiais: `sitemap.ts`, `robots.ts`, `not-found.tsx`, `error.tsx`, `opengraph-image.tsx`.

## Área do cliente — `/minha-conta/*`

`/minha-conta` (resumo) · `/dados` · `/enderecos` · `/enderecos/novo` · `/enderecos/[id]/editar` · `/pedidos` · `/pedidos/[orderNumber]` · `/alterar-senha`

Protegida por middleware: sessão válida obrigatória, senão redireciona para `/entrar?redirect=…`.

## Painel administrativo — `/admin/*`

| Rota | Função |
|---|---|
| `/admin` | Dashboard: faturamento do período, pedidos por status, aguardando pagamento, estoque baixo, total de produtos ativos |
| `/admin/produtos` | Lista com busca, filtro por categoria/status, ordenação |
| `/admin/produtos/novo` · `/admin/produtos/[id]` | Formulário: dados, preço, promoção, dimensões, SEO, imagens (drag & drop, reordenar), variações, destaque |
| `/admin/categorias` | CRUD + reordenação |
| `/admin/pedidos` | Lista com filtro por status, período e busca por número/e-mail/nome |
| `/admin/pedidos/[id]` | Detalhe completo: cliente, itens, pagamento, endereço, histórico, alterar status, código de rastreio, nota interna |
| `/admin/estoque` | Visão consolidada, ajuste manual com justificativa, histórico de movimentações |
| `/admin/cupons` · `/admin/cupons/novo` · `/admin/cupons/[id]` | CRUD de cupons |
| `/admin/clientes` · `/admin/clientes/[id]` | Consulta de clientes e histórico de compras |
| `/admin/paginas` | Edição do conteúdo institucional |
| `/admin/configuracoes` | Frete padrão, frete grátis, hero da home, dados de contato, redes sociais |
| `/admin/usuarios` | Gestão de administradores (Fase 5) |

Protegido por middleware **e** por verificação de role dentro de cada action. `noindex` no layout inteiro.

---

## Server Actions (mutações da própria aplicação)

Toda action: valida entrada com Zod → verifica autenticação/autorização → chama o use-case → `revalidatePath`.

### Carrinho — `modules/cart`
```
addToCart({ variantId, quantity })
updateCartItem({ itemId, quantity })
removeCartItem({ itemId })
applyCoupon({ code })
removeCoupon()
mergeGuestCart()            // chamada após o login
```

### Checkout — `modules/checkout`
```
calculateShipping({ zipCode })       // consulta ShippingProvider
createOrder({ customer, address, shippingOptionId, paymentMethod })
  → transação: valida carrinho, recalcula totais no servidor,
    valida cupom, baixa estoque, cria pedido, cria intenção de pagamento
```

### Conta — `modules/accounts`
```
signUp / signIn / signOut / requestPasswordReset / resetPassword
updateProfile / changePassword
createAddress / updateAddress / deleteAddress / setDefaultAddress
```

### Admin — todas exigem `role === "ADMIN"`
```
createProduct / updateProduct / archiveProduct / toggleFeatured
createVariant / updateVariant / archiveVariant
uploadProductImage / reorderProductImages / deleteProductImage / setPrimaryImage
createCategory / updateCategory / archiveCategory / reorderCategories
updateOrderStatus / addTrackingCode / addInternalNote / cancelOrder
adjustStock({ variantId, quantity, reason })
createCoupon / updateCoupon / toggleCoupon
updateSetting / updateContentPage
```

## Route Handlers (`/api/*`)

Existem apenas onde um endpoint HTTP real é necessário.

| Método | Rota | Função | Proteção |
|---|---|---|---|
| POST | `/api/webhooks/mercadopago` | Recebe notificação de pagamento | Assinatura HMAC `x-signature` + idempotência por `gatewayEventId` |
| POST | `/api/uploads/presign` | Gera URL pré-assinada do R2 | Sessão ADMIN + tipo e tamanho de arquivo validados |
| GET | `/api/cep/[cep]` | Consulta de endereço por CEP | Rate limit por IP |
| GET | `/api/health` | Health check | Público, sem dados |
| GET | `/api/produtos/busca?q=` | Autocomplete da busca | Rate limit, resposta enxuta |
| POST | `/api/cron/liberar-reservas` | Libera reservas de estoque expiradas | Header `Authorization: Bearer $CRON_SECRET` |

**Regra:** nenhum endpoint aceita preço, total ou desconto vindo do cliente. O servidor recebe `variantId` e `quantity` e calcula o resto.

## Contrato de filtros do catálogo

Os filtros vivem na query string para serem compartilháveis, indexáveis e recuperáveis pelo botão "voltar":

```
/loja?categoria=orixas&precoMin=10000&precoMax=30000
     &disponibilidade=em-estoque&ordem=menor-preco&pagina=2
```

Ordenação disponível: `recentes` (padrão) · `menor-preco` · `maior-preco` · `destaque`.

Parsing e validação centralizados em `modules/catalog/domain/product-filters.ts` — adicionar um filtro novo (por cor, por coleção) é acrescentar um campo a um schema Zod, não mexer em componente. Paginação server-side de 12 itens, com botão "Carregar mais" no mobile.
