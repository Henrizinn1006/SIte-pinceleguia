# 15 — Estratégia PWA e cache

Dois sistemas de cache com objetivos opostos convivendo no mesmo projeto:

- **Storefront** — cachear o máximo possível. Página rápida vende mais.
- **Admin** — cachear o mínimo indispensável. Dado velho aqui causa prejuízo.

Tratá-los com a mesma estratégia seria erro nos dois sentidos.

---

## 1. O PWA do admin

### 1.1 O que ganhamos e o que não ganhamos

**Ganhamos:** ícone na tela de início, abertura em tela cheia sem barra de
navegador, carregamento instantâneo do shell, sensação de aplicativo.

**Não ganhamos, por decisão:** operar offline. O requisito 3 é explícito —
estoque, pedidos, pagamento e publicação dependem de confirmação do servidor.

Essa restrição não é preguiça, é correção. Um painel que aceita "baixar
estoque" offline e sincroniza depois vai, mais cedo ou mais tarde, vender uma
peça que já não existe. O conflito é irresolvível: não há como saber qual das
duas versões da realidade é a certa.

### 1.2 Manifest

```json
{
  "name": "Pincel & Guia Admin",
  "short_name": "P&G Admin",
  "description": "Painel administrativo da Pincel & Guia",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#F8F4EC",
  "theme_color": "#33251F",
  "lang": "pt-BR",
  "dir": "ltr",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512",
      "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Novo produto", "url": "/produtos/novo" },
    { "name": "Pedidos",      "url": "/pedidos" }
  ]
}
```

`theme_color` em café profundo e `background_color` em marfim — a paleta da
marca chega até a splash screen do Android.

O ícone `maskable` existe porque, sem ele, o Android recorta o ícone num
círculo e corta as bordas do logo.

**Sobre iOS:** o iPhone tem suporte parcial. Instalação exige "Adicionar à Tela
de Início" pelo Safari, não há prompt automático, e o service worker é
descartado com mais frequência. Como não dependemos de offline, o impacto é
pequeno — o painel abre em tela cheia e funciona. Vale um aviso na primeira
visita explicando como instalar no iPhone, porque o caminho não é óbvio.

### 1.3 Service worker — o que entra no cache

Com **Serwist** (sucessor mantido do `next-pwa`).

| Recurso | Estratégia | Por quê |
|---|---|---|
| `/_next/static/*` | CacheFirst, 30 dias | Hash no nome; imutável |
| Fontes | CacheFirst, 1 ano | Não mudam |
| Ícones e manifest | StaleWhileRevalidate | Mudam raramente |
| Shell de navegação | StaleWhileRevalidate | Abertura instantânea |
| **Qualquer dado** | **NetworkOnly** | Nunca servir estado velho |
| **Toda mutação** | **NetworkOnly** | Jamais em fila offline |
| Imagens do R2 | CacheFirst, 7 dias, teto de 60 | Miniatura muda pouco |

A regra que resume: **cache guarda a casca, nunca o conteúdo.** Layout, CSS e
JavaScript podem vir do disco. Preço, estoque e pedido vêm do servidor ou não
vêm.

### 1.4 Sem conexão

Não fingimos que funciona:

```
┌──────────────────────────────────────┐
│  ⚠  Sem conexão                      │
│                                      │
│  O painel precisa de internet para   │
│  salvar alterações com segurança.    │
│                                      │
│  Seu rascunho está guardado neste    │
│  aparelho e será enviado quando a    │
│  conexão voltar.                     │
│                                      │
│           [ Tentar novamente ]       │
└──────────────────────────────────────┘
```

Rascunho de formulário fica em `localStorage`, e a reconciliação compara
`updatedAt` antes de enviar — se outro dispositivo alterou depois, ela escolhe
qual versão manter. Isso é a única concessão ao offline, e é segura porque
rascunho não é estado publicado.

### 1.5 Atualização de versão

Nunca `skipWaiting` automático. Trocar o código sob os pés de alguém que está
no meio de um formulário de produto é o modo mais rápido de perder trabalho.

```
Nova versão detectada
   │
   └─ faixa discreta: "Nova versão disponível  [Atualizar]"
         │
         ├─ ela clica quando quiser → skipWaiting + reload
         └─ ou na próxima abertura do app
```

Exceção: se a versão em cache for incompatível com a API (verificado por um
header de versão), a atualização é forçada com aviso — melhor interromper do
que enviar dado num formato que o servidor não entende mais.

---

## 2. Cache do storefront

### 2.1 Por rota

| Rota | Estratégia | Revalidação |
|---|---|---|
| `/` (home) | ISR 60s + tag `home` | Ao publicar revisão |
| `/produto/[slug]` | ISR 300s + tag `product:{slug}` | Ao salvar o produto |
| `/categoria/[slug]` | ISR 300s + tags | Ao alterar categoria ou seus produtos |
| `/colecao/[slug]` | ISR 300s + tag | Ao alterar coleção |
| `/parceiro/[slug]` | ISR 300s + tag | Ao alterar parceiro |
| `/loja` com filtro | Dinâmica | — |
| `/carrinho`, `/checkout` | Dinâmica, `no-store` | — |
| Institucionais | ISR 1h + tag `page:{slug}` | Ao publicar |
| `sitemap.xml` | ISR 1h | — |

O TTL existe como rede de segurança. O caminho normal é a invalidação por tag,
que é imediata e cirúrgica.

### 2.2 Tags

```
home                    composição da home
menu:{key}              menu principal, rodapé
settings                contato, redes, frete
product:{slug}          uma peça
products                qualquer listagem
category:{slug}         uma categoria
categories              árvore de categorias
collection:{slug}       uma coleção
partner:{slug}          um parceiro
page:{slug}             página institucional
```

**Invalidar de menos deixa conteúdo velho no ar. Invalidar demais joga fora o
cache inteiro e o site fica lento por alguns minutos.** Regra: toda mutação
declara explicitamente suas tags — nunca "invalida tudo por garantia".

Exemplo: mudar o preço de um produto invalida `product:{slug}`, `products` e
as tags das categorias dele. Não invalida `home`, a menos que ele apareça numa
seção de destaque — o que o use-case sabe consultando.

### 2.3 A ponte entre os dois deploys

```
ADMIN                                    STOREFRONT
  │                                          │
  │ publica (transação confirmada)           │
  │                                          │
  ├─ POST /api/revalidate ──────────────────▶│
  │  x-revalidate-secret: ***                │
  │  { "tags": ["home", "menu:principal"] }  │
  │                                          ├─ verifica o segredo
  │                                          ├─ revalidateTag(cada tag)
  │◀───────────────────── 200 { revalidated }┤
  │                                          │
  ├─ sucesso → "Publicado ✓"                 │
  └─ falha   → "Publicado, cache pendente"   │
               + botão de reenviar           │
```

O endpoint fica em `apps/storefront/src/app/api/revalidate/route.ts`:
compara o segredo em tempo constante, aceita no máximo 50 tags por chamada,
tem rate limit, e registra tudo.

**Falha na revalidação não desfaz a publicação.** O conteúdo está publicado; só
o cache está atrasado, e expira sozinho pelo TTL. O painel mostra o estado real
em vez de mentir que deu tudo certo.

---

## 3. Cache do admin (servidor)

Oposto do storefront: `export const dynamic = "force-dynamic"` como padrão em
todas as rotas administrativas. Nenhuma página do painel é pré-renderizada.

Duas exceções, ambas com cache curto por request:

- Permissões do usuário — carregadas uma vez por requisição.
- Listas de apoio (categorias, parceiros) nos formulários — 30s.

Contagens do dashboard são consultadas a cada carregamento. São `COUNT` com
índice; o custo é irrelevante e ver faturamento defasado seria pior.

---

## 4. Imagens

Upload → R2 → servido por domínio próprio.

Transformação de tamanho: `next/image` na Vercel cobre bem o storefront, mas
tem cota no plano Pro (5.000 imagens originais/mês). Com catálogo pequeno,
sobra. Se crescer, a alternativa é Cloudflare Images.

> DECISÃO PENDENTE: Vercel Image Optimization ou Cloudflare Images? Começar
> com Vercel e migrar se a cota apertar é o caminho de menor custo inicial.

**Compressão antes do upload**, no navegador: redimensiona para 2000px no lado
maior e converte para WebP com qualidade 82. Uma foto de celular sai de ~5 MB
para ~400 KB. Isso muda a experiência de cadastrar produto no 4G de
insuportável para instantânea, e economiza cota de transformação.
