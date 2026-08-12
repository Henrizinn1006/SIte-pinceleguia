# 16 — Núcleo reutilizável VORTEXIS

Requisito 37. O objetivo declarado: que partes deste projeto sirvam a outros
e-commerces da VORTEXIS sem copiar e colar o repositório.

Reuso não acontece por boa intenção — acontece por fronteira que dói quando é
violada. Esta é a fronteira.

---

## 1. As quatro camadas

```
┌──────────────────────────────────────────────────────┐
│ 4. IDENTIDADE DO CLIENTE          apps/*             │
│    paleta, logo, tipografia, textos, tipos de seção  │
│    habilitados, regras de negócio próprias           │
│    ── DESCARTÁVEL: cada cliente tem a sua ──         │
├──────────────────────────────────────────────────────┤
│ 3. INTEGRAÇÕES                    packages/integr.   │
│    Mercado Pago, Melhor Envio, R2, Resend            │
│    ── SUBSTITUÍVEL: adapters atrás de interface ──   │
├──────────────────────────────────────────────────────┤
│ 2. CMS                            packages/cms       │
│    páginas, seções, menus, mídia, revisões           │
│    ── GENÉRICO ──                                    │
├──────────────────────────────────────────────────────┤
│ 1. COMMERCE CORE                  packages/commerce  │
│    produto, categoria, coleção, parceiro, carrinho,  │
│    pedido, estoque, cupom                            │
│    ── GENÉRICO: o coração ──                         │
└──────────────────────────────────────────────────────┘
```

Dependências apontam só para baixo. `commerce` não conhece `cms`. Nenhum dos
dois conhece `apps`.

---

## 2. A regra de nomenclatura

O requisito é claro, e vale repetir porque é a violação mais fácil de cometer:

```
❌  orixasService        ❌  guiasController      ❌  xangoProducts
❌  cerâmicaRepository   ❌  entidadeCategory     ❌  pincelGuiaTheme

✅  ProductService       ✅  CategoryRepository   ✅  Collection
✅  Partner              ✅  Section              ✅  Menu
```

**"Orixás", "Guias", "Cerâmicas", "Vestimentas" são linhas na tabela
`categories`. Nunca identificadores no código.**

O teste é direto: abrir qualquer arquivo de `packages/` e procurar por palavra
que só faça sentido nesta loja. Se encontrar, está no pacote errado.

Vale para nomes de arquivo, tipos, enums, chaves de tradução e comentários.

---

## 3. Onde fica cada coisa

### Genérico → `packages/`

| Pacote | Conteúdo |
|---|---|
| `db` | Schema Prisma, migrations, client singleton |
| `commerce/catalog` | Produto, variação, categoria, coleção, parceiro, tag |
| `commerce/cart` | Carrinho persistente, itens, merge de visitante |
| `commerce/checkout` | Cálculo de totais, criação de pedido |
| `commerce/orders` | Pedido, snapshot, máquina de estados |
| `commerce/inventory` | Estoque, reservas, movimentações |
| `commerce/coupons` | Validação e aplicação |
| `cms/pages` | Páginas e revisões |
| `cms/sections` | Registro de tipos, schemas, publicação |
| `cms/menus` | Menus e itens |
| `cms/media` | Biblioteca, upload, uso |
| `auth` | Sessão, RBAC, guards |
| `integrations` | `PaymentGateway`, `ShippingProvider`, `StorageProvider`, e-mail |
| `ui` | Primitivos sem opinião de marca; tokens como contrato |
| `config` | tsconfig, eslint, preset Tailwind |

### Específico da Pincel & Guia → `apps/`

| O quê | Onde |
|---|---|
| Paleta e tokens | `apps/storefront/src/app/globals.css` |
| Logo, favicon, ícones do PWA | `apps/*/public/` |
| Cormorant Garamond + Inter | `apps/storefront/src/app/layout.tsx` |
| Textos institucionais | banco (`content_pages`) |
| Quais tipos de seção estão ativos | `apps/storefront/src/config/sections.ts` |
| Componentes com estética própria (ornamento dourado, card de peça) | `apps/storefront/src/components/` |
| Rótulos em português da interface | `apps/*/src/messages/` |
| Regra de negócio exclusiva desta loja | `apps/*/src/modules/` |

---

## 4. Tokens: o contrato entre `ui` e a marca

`packages/ui` não pode conter HEX. Ele consome variáveis CSS que o app define:

```css
/* packages/ui — o CONTRATO. Nomes semânticos, valores vazios. */
:root {
  --ui-surface: ;
  --ui-surface-raised: ;
  --ui-text: ;
  --ui-text-muted: ;
  --ui-accent: ;
  --ui-accent-contrast: ;
  --ui-border: ;
}
```

```css
/* apps/storefront — a Pincel & Guia PREENCHE o contrato */
:root {
  --ui-surface: var(--color-cream);          /* marfim */
  --ui-surface-raised: var(--color-warm-white);
  --ui-text: var(--color-ink);               /* café profundo */
  --ui-text-muted: var(--color-ink-muted);   /* taupe */
  --ui-accent: var(--color-caramel-deep);
  --ui-accent-contrast: var(--color-warm-white);
  --ui-border: var(--color-beige);
}
```

O Cliente B preenche o mesmo contrato com a paleta dele. Nenhum componente de
`ui` muda.

**O que `ui` NÃO deve conter:** o `ProductCard` da Pincel & Guia, com selo
dourado de promoção e tipografia serifada. Esse é da marca. O que vai para `ui`
é o `Card` genérico sobre o qual ele é construído.

Essa distinção é onde a maioria dos design systems se perde: sobe componente
demais para o pacote compartilhado, e no segundo cliente descobre que precisa
de dez props booleanas para descaracterizá-lo.

---

## 5. Limites honestos deste reuso

Vale dizer o que **não** vai funcionar, para ninguém se frustrar depois.

**Um pacote não vira produto sozinho.** `packages/commerce` extraído hoje serve
a um segundo cliente com o mesmo formato de negócio — loja brasileira, catálogo
pequeno, Postgres, Prisma, Next. Cliente com assinatura recorrente, marketplace
ou multimoeda vai precisar de alterações no core, não só de configuração.

**O schema é compartilhado, e isso tem preço.** `packages/db` tem um schema só.
Cliente que precisar de campo próprio vai exigir ou uma coluna a mais para
todos, ou um mecanismo de campos customizados, ou um fork. Nenhuma das três é
gratuita.

**Versionar pacote interno dá trabalho.** Enquanto for um repositório, é
simples. No dia em que dois clientes usarem o mesmo `commerce` em produção,
mudança quebrando um deles vira problema real — e aí entra versionamento
semântico, changelog e janela de migração.

**A recomendação:** manter tudo neste repositório até existir o segundo cliente
concreto. Extrair para pacotes publicados antes disso é otimização especulativa.
O que fazemos agora é *deixar preparado* — a fronteira existe, a disciplina de
nomes existe, e a extração no futuro é mecânica em vez de arqueológica.

---

## 6. Verificação contínua

Três checagens automáticas no CI, para a fronteira não erodir em silêncio:

**1. Nome de domínio do cliente em pacote genérico**

```bash
grep -riE "orix|exu|pombagira|umbanda|candomble|ceramica|pincel" packages/ \
  && echo "❌ termo específico do cliente em packages/" && exit 1
```

**2. Import invertido** — `packages/` importando de `apps/`

```bash
grep -rn "from \"@/apps\|from \"apps/" packages/ \
  && echo "❌ pacote dependendo de app" && exit 1
```

**3. HEX dentro de `packages/ui`**

```bash
grep -rnE "#[0-9a-fA-F]{6}" packages/ui/src \
  && echo "❌ cor fixa no pacote de UI" && exit 1
```

Regra que não é verificada é regra que já foi quebrada. Essas três rodam no CI
e falham o build.
