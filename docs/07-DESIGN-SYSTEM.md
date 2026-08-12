# 07 — Design System

Derivado da prévia visual aprovada pelo cliente. A imagem define a **direção**; este documento transforma isso em decisões implementáveis e consistentes.

## Paleta oficial da marca

Estes oito valores vieram do cliente e não devem ser alterados.

| Uso | Cor | HEX | Token |
|---|---|---|---|
| Fundo principal | Marfim | `#F8F4EC` | `cream` |
| Fundo secundário | Creme | `#EFE6D8` | `cream-dark` |
| Cards | Branco quente | `#FFFDF9` | `warm-white` |
| Texto principal | Café profundo | `#33251F` | `ink` |
| Texto secundário | Taupe | `#75645A` | `ink-muted` |
| Destaques | Dourado envelhecido | `#B4935A` | `gold` |
| Botões / CTA | Caramelo terroso | `#A77B50` | `caramel` |
| Complementar | Verde oliva suave | `#77745A` | `olive` |

## Contraste medido — o que a paleta entrega

Medições reais (WCAG 2.1), não estimativas:

| Combinação | Razão | Texto normal (4.5:1) | Elemento de UI (3:1) |
|---|---|---|---|
| Café profundo / marfim | **13.43:1** | ✅ | ✅ |
| Café profundo / creme | **11.91:1** | ✅ | ✅ |
| Café profundo / card | **14.50:1** | ✅ | ✅ |
| Taupe / marfim | **5.14:1** | ✅ | ✅ |
| Taupe / creme | **4.56:1** | ✅ | ✅ |
| Oliva / marfim | 4.32:1 | ❌ | ✅ |
| Caramelo / marfim | 3.42:1 | ❌ | ✅ |
| Dourado / marfim | 2.64:1 | ❌ | ❌ |
| Branco quente / caramelo | 3.70:1 | ❌ | ✅ |
| Branco quente / oliva | **4.67:1** | ✅ | ✅ |

**Consequência prática:** o dourado e o caramelo, que são a assinatura visual da marca, não podem carregar texto. Isso não é um defeito da paleta — é a natureza de tons médios e quentes. A solução não é abandoná-los, é usá-los onde brilham.

## Tons derivados

Criados a partir dos originais, mantendo o matiz e ajustando só a luminosidade até fechar o contraste:

| Token | HEX | Para quê | Contraste |
|---|---|---|---|
| `caramel-deep` | `#956D47` | Fundo de botão / CTA | 4.54:1 com branco quente |
| `caramel-text` | `#8C6743` | Caramelo quando for texto | 4.63:1 sobre marfim |
| `gold-text` | `#866B3D` | Dourado quando for texto | 4.58:1 sobre marfim |
| `olive-text` | `#737157` | Oliva quando for texto | 4.53:1 sobre marfim |
| `gold-soft` | `#C7AF84` | Hover e superfície — nunca texto | — |
| `beige` | `#E8DAC6` | Bordas e divisórias suaves | — |
| `beige-dark` | `#DDCAAD` | Bordas marcadas, campos de formulário | — |

## Regras de uso

**Dourado (`gold`)** — ornamento, filete, divisória, detalhe do logo. Área pequena, nunca texto, nunca fundo de botão. É o acento que dá o ar de peça artesanal.

**Caramelo (`caramel`)** — bordas, anel de foco, contorno de botão secundário. Como fundo de botão, use `caramel-deep`.

**Café profundo (`ink`)** — títulos e corpo de texto. É o tom que carrega toda a leitura.

**Taupe (`ink-muted`)** — texto de apoio, legendas, contagem de resultados.

**Oliva (`olive`)** — cor complementar, usada com parcimônia: hover de botão secundário e acentos pontuais. Como fundo com texto claro, passa em contraste.

**Anel de foco** — `caramel`, não dourado. O dourado dá 2.64:1 e reprova o mínimo de 3:1 exigido para elemento de interface. Esse detalhe é invisível para quem usa mouse e decisivo para quem navega por teclado.

## Tipografia

| Uso | Fonte | Peso | Observação |
|---|---|---|---|
| Títulos, logo, nomes de produto | **Cormorant Garamond** | 300 / 400 | Serifada elegante, próxima da prévia; tracking levemente aberto |
| Corpo, UI, formulários | **Inter** | 400 / 500 / 600 | Alta legibilidade, ótima em números e preços |

Carregadas via `next/font` com `display: swap` e subset latino — sem requisição a fonte externa, sem layout shift.

Escala (mobile → desktop, fluida com `clamp()`):

```
display  2.5rem → 4rem      hero
h1       2rem   → 3rem
h2       1.5rem → 2.25rem
h3       1.25rem → 1.5rem
body     1rem   (16px mínimo — nunca menor)
small    0.875rem
```

## Espaçamento, raio e sombra

Escala de 4px: `4 8 12 16 24 32 48 64 96 128`.

```css
--radius-sm: 8px;    /* botões, inputs */
--radius-md: 16px;   /* cards */
--radius-lg: 24px;   /* seções, imagens de destaque */
--radius-full: 999px;

--shadow-soft:   0 2px 12px rgba(107,78,54,.06);
--shadow-medium: 0 4px 24px rgba(107,78,54,.10);
```

Sombras sempre em marrom transparente, nunca em preto — preto sobre creme produz uma sujeira acinzentada que quebra a atmosfera.

## Componentes-chave

**Header** — fundo creme com leve transparência e `backdrop-blur`; logo à esquerda; navegação centralizada em Cormorant com underline dourado no item ativo; busca, conta e carrinho à direita. No mobile: logo centralizado, hambúrguer à esquerda, carrinho à direita, com badge de contagem. Menu mobile abre em painel lateral (não dropdown), com áreas de toque de no mínimo 44×44px.

**Hero** — altura de ~85vh no desktop, ~70vh no mobile. Fundo creme com textura sutil. Composição fotográfica dos pratos à direita no desktop, **acima do texto** no mobile (a peça é o argumento de venda, o texto vem depois). Título em Cormorant, subtítulo em itálico, divisor dourado ornamental, CTA sólido. Todo o conteúdo vem da tabela `settings` — editável sem deploy.

**Card de categoria** — imagem à direita, título e "Ver coleção →" à esquerda, fundo bege, `radius-md`. Grade de 3 colunas no desktop, carrossel com scroll horizontal no mobile.

**Card de produto** — imagem quadrada (`aspect-square`, `object-cover`), nome em Cormorant, preço em Inter medium. Preço promocional com o valor original riscado ao lado, em `ink-muted`. Selo "Últimas unidades" quando `stock <= 2`; "Esgotado" em overlay quando zero. Hover no desktop revela a segunda imagem com transição de 300ms; no mobile não há hover — o card inteiro é o link.

**Galeria do produto** — imagem principal com zoom no hover (desktop) e pinch (mobile); miniaturas verticais à esquerda no desktop, carrossel com indicadores abaixo no mobile.

**Carrinho** — drawer lateral no desktop, página cheia no mobile. Sempre visível: subtotal, campo de cupom e CTA. Alteração de quantidade com feedback otimista e reconciliação com o servidor.

**Checkout** — coluna única, sem distração: header reduzido sem menu de navegação. Etapas: identificação → entrega → pagamento, com resumo do pedido fixo (sticky) no desktop e recolhível no mobile.

## Responsividade

Breakpoints Tailwind: `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`.

Mobile-first de verdade — cada layout é pensado para o celular primeiro, não reduzido a partir do desktop:

| Componente | Mobile | Desktop |
|---|---|---|
| Menu | Painel lateral deslizante | Barra horizontal |
| Filtros do catálogo | Bottom sheet com botão "Filtrar" fixo | Sidebar fixa à esquerda |
| Grade de produtos | 2 colunas | 3–4 colunas |
| Galeria | Carrossel com swipe | Miniaturas + zoom |
| Carrinho | Página cheia | Drawer lateral |
| Checkout | Etapas empilhadas | Duas colunas com resumo sticky |
| Tabelas do admin | Cards empilhados | Tabela com colunas |

## Acessibilidade (WCAG 2.1 AA)

- HTML semântico: `header`, `nav`, `main`, `section`, `article`, `footer`. Um `h1` por página.
- Contraste mínimo 4.5:1 em texto, 3:1 em componentes de interface — validado por token, não no olho.
- Todo elemento interativo alcançável por teclado, com foco visível (anel dourado de 2px, `outline-offset: 2px`).
- `alt` obrigatório em imagem de produto — é campo `NOT NULL` no banco, então não tem como esquecer.
- Formulários com `<label>` associado de verdade. Erro anunciado via `aria-describedby` e `role="alert"`.
- Drawer e modal com foco preso dentro, `Esc` fecha, foco retorna ao gatilho.
- `aria-live="polite"` para "Item adicionado ao carrinho".
- Alvos de toque de no mínimo 44×44px.
- `prefers-reduced-motion` respeitado em todas as animações.
- ARIA só onde o HTML nativo não resolve.

## Performance

Metas: LCP < 2.5s · CLS < 0.1 · INP < 200ms, em 4G.

- `next/image` com AVIF/WebP, `sizes` correto e `priority` apenas na imagem do hero.
- Lazy loading em tudo abaixo da dobra.
- Placeholder blur gerado no upload (evita CLS).
- Fontes com `display: swap` e preload das duas famílias.
- Server Components por padrão; `"use client"` apenas em interatividade real (galeria, filtros, carrinho).
- Paginação de 12 itens; nunca carregar o catálogo inteiro.
- ISR na home e nas páginas de produto, com revalidação por tag quando o admin salva.
- Orçamento de bundle: **< 120 KB de JS na primeira carga** da home. Verificado no CI.
