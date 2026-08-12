# 14 — CMS e Section Builder

O módulo mais delicado do projeto. Delicado não por dificuldade técnica, mas
porque é onde a pressão de escopo empurra para o lado errado: cada "seria bom
se ela também pudesse…" aproxima o produto de um construtor livre, e um
construtor livre destrói a identidade visual que a VORTEXIS entrega.

---

## 1. A regra que sustenta o módulo

```
A VORTEXIS decide COMO cada seção parece.
A cliente decide QUAIS seções existem, em que ORDEM,
                 com QUAL conteúdo, e QUANDO publicar.
```

Não há sobreposição. A cliente nunca escolhe cor, fonte, espaçamento ou
posição absoluta. Escolhe entre variantes que nós desenhamos.

Isso não é limitar a cliente — é entregar um site que continua bonito depois
de seis meses de edições. Todo CMS que permite CSS livre vira, com o tempo, um
site que ninguém reconhece.

**Teste prático para aceitar um pedido de campo novo:** *"se a cliente
preencher isso do pior jeito possível, o site fica feio?"* Se sim, o campo não
existe — vira variante nossa, ou não vira nada.

---

## 2. Anatomia de um tipo de seção

Cada tipo é um contrato de quatro partes, definido em `packages/cms`:

```
packages/cms/sections/types/collection/
├── schema.ts      Zod do config + regras de items
├── definition.ts  metadados: nome, ícone, o que aceita
├── editor.tsx     formulário no admin        (importado por apps/admin)
└── render.tsx     componente do storefront   (importado por apps/storefront)
```

Exemplo — seção de coleção:

```ts
export const collectionSection = defineSection({
  type: "COLLECTION",
  label: "Coleção",
  description: "Destaca uma coleção com alguns produtos dela.",
  icon: "layers",

  // Config: só APRESENTAÇÃO. Nenhum id de entidade aqui.
  config: z.object({
    layout: z.enum(["grid", "carrossel"]).default("grid"),
    productLimit: z.number().int().min(2).max(12).default(6),
    showDescription: z.boolean().default(true),
    ctaLabel: z.string().max(40).default("Ver coleção"),
  }),

  // Relações: viram section_items, com FK de verdade.
  items: {
    accepts: ["collection"],
    min: 1,
    max: 1,
  },
});
```

**Adicionar um tipo novo** é criar essa pasta e registrar no índice. Nenhuma
migration, nenhuma alteração no admin, nenhuma alteração no storefront — os
dois leem o registro. É esse desenho que atende ao "estruture para novos tipos
poderem ser adicionados futuramente".

### 2.1 Tipos iniciais

| Tipo | Aceita | Config principal |
|---|---|---|
| `HERO` | 1 mídia | título, subtítulo, tagline, CTA, alinhamento |
| `BANNER` | 1 banner | — |
| `CATEGORIES` | N categorias, ou automático | layout, quantidade |
| `FEATURED_PRODUCTS` | automático | quantidade, ordenação |
| `PRODUCT_LIST` | N produtos (curadoria) | layout, colunas |
| `COLLECTION` | 1 coleção | layout, limite, CTA |
| `PARTNER` | 1 parceiro | mostrar produtos, limite, CTA |
| `IMAGE_TEXT` | 1 mídia | lado da imagem, texto, CTA |
| `GALLERY` | N mídias | colunas, proporção |
| `TESTIMONIALS` | — | depoimentos no config |
| `CTA` | — | título, texto, botão, variante |
| `TEXT` | — | conteúdo rico |
| `NEW_ARRIVALS` | automático | quantidade, janela de dias |

### 2.2 Conteúdo automático vs. curadoria

Duas fontes, e a escolha entre elas é do tipo de seção:

**Automático** — a seção guarda a *regra*, não a lista.
`{ "source": "partner", "limit": 8, "sort": "recent" }`
Produto novo da Maria aparece na home sozinho. É o que o requisito 12 descreve.

**Curadoria** — `section_items` com os produtos escolhidos e a ordem definida
por ela. Usado quando a vitrine é uma composição pensada.

Tipos como `PARTNER` e `COLLECTION` oferecem os dois modos, com um seletor no
editor. `PRODUCT_LIST` é sempre curadoria; `NEW_ARRIVALS` é sempre automático.

---

## 3. Rascunho, preview e publicação

```
     ┌──────────┐  editar  ┌──────────┐ publicar ┌────────────┐
     │  (nada)  │─────────▶│ RASCUNHO │─────────▶│ PUBLICADO  │
     └──────────┘          └────┬─────┘          └─────┬──────┘
                                │                      │ nova edição
                                │ preview              ▼
                                ▼                 ┌──────────┐
                        /preview?token=…          │ ARQUIVADO│
                                                  └────┬─────┘
                                                       │ restaurar
                                                       ▼
                                                  (vira rascunho)
```

**Publicar é uma transação**, nunca uma sequência de updates:

```ts
await db.$transaction(async (tx) => {
  await tx.pageRevision.updateMany({
    where: { pageId, status: "PUBLISHED" },
    data:  { status: "ARCHIVED" },
  });
  await tx.pageRevision.update({
    where: { id: draftId },
    data:  { status: "PUBLISHED", publishedAt: new Date() },
  });
});

// fora da transação — falha aqui não desfaz a publicação
await revalidateStorefront(["home"]);
await audit.record(actor, "section.publish", { pageId, revisionId: draftId });
```

Se a revalidação falhar, o conteúdo *está* publicado — só demora até o cache
expirar. O painel mostra "publicado, cache pendente" e oferece reenvio. O
inverso (cache limpo, publicação não gravada) seria pior.

**Editar depois de publicado** clona a revisão publicada como novo rascunho.
A cliente nunca edita direto o que está no ar.

**Rollback** é promover uma revisão arquivada. As últimas 10 ficam acessíveis
no painel com data, autor e nota.

---

## 4. Preview

```
Admin: [Pré-visualizar]
   │
   ├─ gera cookie assinado (HMAC), 30 min, escopo do storefront
   │
   └─ abre https://pinceleguia.com.br/?preview=<token>
          │
          └─ storefront detecta o cookie e lê a revisão DRAFT
             + banner fixo "PRÉ-VISUALIZAÇÃO — não publicado"
             + noindex, no-store
```

O banner é obrigatório. Sem ele, é questão de tempo até alguém confundir
preview com produção e concluir que "publicou sozinho".

> DECISÃO PENDENTE: o preview precisa ser compartilhável com terceiros
> (mandar link para alguém aprovar antes)? Se sim, o token vira link de uso
> limitado, o que muda o desenho. Como está, exige sessão autenticada.

---

## 5. Ordenação

Drag-and-drop com `dnd-kit`, que traz suporte a teclado de fábrica — arrastar
com o mouse não pode ser o único caminho.

Alternativa sempre visível: botões ↑ ↓ em cada seção. No celular, arrastar
lista longa com o polegar é frustrante; os botões são mais rápidos.

A ordem persiste em `sections.position`, com `@@unique([revisionId, position])`.
Reordenar reescreve as posições da revisão numa transação — sem isso, duas
abas abertas produzem ordens conflitantes.

---

## 6. O admin no celular

O requisito 31 é explícito, e é o requisito mais fácil de descumprir sem
perceber: um painel administrativo "responsivo" costuma ser um desktop
espremido.

| Componente | Desktop | Celular |
|---|---|---|
| Navegação | Sidebar fixa | Barra inferior (5 destinos) + gaveta |
| Listagens | Tabela com colunas | **Cards empilhados**, não tabela rolando |
| Filtros | Barra superior | Bottom sheet |
| Formulário de produto | Duas colunas | Uma coluna, seções recolhíveis |
| Upload de imagem | Arrastar e soltar | **Botão grande: câmera ou galeria** |
| Section Builder | Lista + painel lateral | Lista; editar abre tela cheia |
| Ações principais | Topo direito | **Barra fixa no rodapé**, ao alcance do polegar |
| Detalhe do pedido | Duas colunas | Abas: Itens · Cliente · Pagamento |

A regra de ouro: **ação primária de cada tela fica ao alcance do polegar**, não
no canto superior direito.

### 6.1 O fluxo que precisa ser fácil

Requisito 32, do jeito que deve funcionar na prática:

```
Abrir PWA → [+ Novo produto]
   │
   ├─ 📷 Adicionar fotos      ← primeiro, não último
   │     câmera ou galeria, múltiplas, compressão automática
   │
   ├─ Nome
   ├─ Preço            ← teclado numérico
   ├─ Estoque          ← teclado numérico
   ├─ Categoria        ← seleção rápida, com as mais usadas primeiro
   │
   └─ [Salvar rascunho]  ou  [Publicar]
```

Foto vem primeiro de propósito: é o que ela tem em mãos ao terminar a peça, e
é o campo que dá contexto ao resto do formulário.

Tudo além disso — SEO, dimensões, variações, coleções, tags — fica em "Mais
opções", recolhido. Um formulário com 20 campos visíveis no celular garante que
nenhum produto será cadastrado fora do computador.

---

## 7. Storefront dinâmico

A home deixa de ser um componente com seções fixas:

```tsx
// apps/storefront/src/app/(loja)/page.tsx
export const revalidate = 60;

export default async function HomePage() {
  const revision = await getPublishedRevision("home");
  return (
    <>
      {revision.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
```

`SectionRenderer` consulta o registro de tipos e monta o componente
correspondente. Tipo desconhecido — porque a revisão é antiga ou o tipo foi
removido — não quebra a página: registra aviso e não renderiza nada.

**Uma consulta, não N.** As seções chegam com seus `items` e as entidades
relacionadas num único `findUnique` com `include` aninhado. Sem isso, uma home
com 8 seções vira 30 idas ao banco.

Categorias, menu e rodapé seguem o mesmo princípio — nada hardcoded. O
`src/lib/site.ts` atual, com `mainNav` fixo, é substituído por consulta a
`menus`. É a última peça hardcoded que sobra do que já construímos.
