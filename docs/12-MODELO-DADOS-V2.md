# 12 — Modelo de dados v2

Complementa [03-MODELO-DADOS](03-MODELO-DADOS.md). Tudo que não aparece aqui
permanece como está.

Convenções mantidas: `cuid` como PK, dinheiro em `Int` centavos, `deletedAt`
para exclusão lógica, enums no banco, migrations versionadas.

---

## 1. Catálogo dinâmico

### 1.1 `categories` — hierarquia sem teto artificial

O requisito pede mais de dois níveis "se puder ser modelado de maneira limpa".

**Três abordagens consideradas:**

| Abordagem | Consulta de subárvore | Complexidade | Veredito |
|---|---|---|---|
| Só `parentId` (adjacency list) | Recursiva ou N queries | Baixa | Lenta em árvore profunda |
| Closure table | Um JOIN | Alta — tabela auxiliar a manter | Exagero para dezenas de categorias |
| `parentId` + `path` materializado | Um `LIKE 'path%'` indexado | Média | **Escolhida** |

```prisma
model Category {
  id       String  @id @default(cuid())
  name     String
  slug     String  @unique
  parentId String? @map("parent_id")

  /// Caminho materializado: "/vestimentas/orixas/"
  /// Mantido pela aplicação DENTRO da transação que move a categoria.
  /// Permite buscar a subárvore com: WHERE path LIKE '/vestimentas/%'
  path     String
  depth    Int     @default(0)

  description     String?
  imageId         String? @map("image_id")   // → media
  position        Int     @default(0)
  isActive        Boolean @default(true)  @map("is_active")
  showOnHome      Boolean @default(false) @map("show_on_home")
  metaTitle       String? @map("meta_title")
  metaDescription String? @map("meta_description")
  deletedAt       DateTime? @map("deleted_at")

  parent   Category?         @relation("Tree", fields: [parentId], references: [id])
  children Category[]        @relation("Tree")
  image    Media?            @relation(fields: [imageId], references: [id])
  products ProductCategory[]

  @@index([path])
  @@index([parentId, position])
  @@index([isActive, showOnHome, position])
  @@map("categories")
}
```

**Profundidade máxima de 3 é regra de negócio, não de schema.** O banco aceita
mais; a aplicação recusa e explica por quê. Navegação com quatro níveis vira
labirinto para o comprador — a restrição protege a loja, não o modelo.

Mover uma categoria reescreve o `path` de toda a subárvore, numa transação.
Com o volume esperado (dezenas), é instantâneo.

### 1.2 `product_categories` — muitos-para-muitos ⚠️ MUDANÇA

```prisma
model ProductCategory {
  productId  String  @map("product_id")
  categoryId String  @map("category_id")

  /// Define breadcrumb e URL canônica. Sem isso o SEO gera duplicata.
  isPrimary  Boolean @default(false) @map("is_primary")
  position   Int     @default(0)

  product  Product  @relation(fields: [productId],  references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([productId, categoryId])
  @@index([categoryId, position])
  @@map("product_categories")
}
```

**Invariante:** todo produto tem exatamente uma categoria primária. Garantido
por índice único parcial (`WHERE is_primary`) mais validação no use-case —
constraint pega o erro, validação dá a mensagem em português.

`products.categoryId` sai. A migration cria uma linha primária por produto
existente.

### 1.3 `collections` — agrupamento transversal

Coleção não é categoria. Categoria é *o que a peça é*; coleção é *por que ela
está junta das outras* — campanha, tema, data comemorativa. Uma coleção
atravessa categorias.

```prisma
model Collection {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  imageId     String?   @map("image_id")
  bannerId    String?   @map("banner_id")

  /// Janela de exibição. Nula em ambos = sempre visível.
  startsAt    DateTime? @map("starts_at")
  endsAt      DateTime? @map("ends_at")

  isActive    Boolean   @default(true)  @map("is_active")
  isFeatured  Boolean   @default(false) @map("is_featured")
  position    Int       @default(0)
  metaTitle       String? @map("meta_title")
  metaDescription String? @map("meta_description")
  deletedAt   DateTime? @map("deleted_at")

  products CollectionProduct[]

  @@index([slug])
  @@index([isActive, startsAt, endsAt])
  @@map("collections")
}

model CollectionProduct {
  collectionId String @map("collection_id")
  productId    String @map("product_id")
  position     Int    @default(0)   // ordem curada pela proprietária

  @@id([collectionId, productId])
  @@index([collectionId, position])
  @@map("collection_products")
}
```

A ordem dentro da coleção é curadoria, não algoritmo — por isso `position`
manual em vez de ordenar por data.

### 1.4 `partners` — organização editorial, não marketplace

```prisma
model Partner {
  id          String  @id @default(cuid())
  name        String
  slug        String  @unique
  description String? @db.Text
  logoId      String? @map("logo_id")
  bannerId    String? @map("banner_id")

  instagram   String?
  whatsapp    String?
  website     String?

  /// Controla se existe página pública /parceiro/[slug]
  hasPublicPage Boolean @default(false) @map("has_public_page")

  isActive  Boolean   @default(true) @map("is_active")
  position  Int       @default(0)
  metaTitle       String? @map("meta_title")
  metaDescription String? @map("meta_description")
  deletedAt DateTime? @map("deleted_at")

  products Product[]

  @@index([slug])
  @@index([isActive, position])
  @@map("partners")
}
```

`products.partnerId` opcional — peça da própria casa fica sem parceiro.

**Fronteira explícita:** não existe `commission`, `payout` ou `partner_balance`.
Parceiro aqui é curadoria de catálogo. Marketplace com split é outro produto,
com outro modelo de dados e outras obrigações fiscais — se vier, vem como
módulo novo, não como colunas coladas aqui.

### 1.5 Ajustes em `products`

```prisma
model Product {
  // … campos atuais mantidos …

  partnerId     String? @map("partner_id")
  lowStockAlert Int     @default(2) @map("low_stock_alert")  // estoque mínimo

  // categoryId REMOVIDO → product_categories
  // imagens agora referenciam media

  categories  ProductCategory[]
  collections CollectionProduct[]
  partner     Partner?          @relation(fields: [partnerId], references: [id])
  tags        ProductTag[]
}

model Tag {
  id       String       @id @default(cuid())
  name     String
  slug     String       @unique
  products ProductTag[]
  @@map("tags")
}

model ProductTag {
  productId String @map("product_id")
  tagId     String @map("tag_id")
  @@id([productId, tagId])
  @@map("product_tags")
}
```

`product_images` passa a apontar para `media` em vez de guardar URL solta —
assim a biblioteca sabe onde cada arquivo é usado antes de permitir exclusão.

---

## 2. Biblioteca de mídia

```prisma
model Media {
  id           String  @id @default(cuid())
  storageKey   String  @unique @map("storage_key")
  url          String
  mimeType     String  @map("mime_type")
  sizeInBytes  Int     @map("size_in_bytes")
  width        Int?
  height       Int?
  blurDataUrl  String? @map("blur_data_url")

  /// Texto alternativo. Editável no painel — acessibilidade é conteúdo.
  alt          String?
  caption      String?

  uploadedBy   String?  @map("uploaded_by")
  createdAt    DateTime @default(now()) @map("created_at")
  deletedAt    DateTime? @map("deleted_at")

  productImages ProductImage[]
  categories    Category[]
  // … demais relações

  @@index([createdAt(sort: Desc)])
  @@index([mimeType])
  @@map("media")
}
```

**"Onde esta imagem está sendo usada?"** — o requisito 19 pede isso antes de
excluir. Com FKs reais, a resposta é uma contagem de relações. Se houver uso,
a exclusão é recusada com a lista de onde aparece.

Nunca se apaga o arquivo do storage junto: marca-se `deletedAt` e um job
posterior remove o que estiver órfão há mais de 30 dias. Apagar imagem por
engano é irreversível; adiar não custa nada.

---

## 3. CMS

### 3.1 `pages` e `page_revisions` — publicação atômica

A composição de uma página é a lista *ordenada* de seções. Publicar precisa
trocar a lista inteira de uma vez — senão o visitante pega meia página nova.

Por isso as seções pertencem a uma **revisão**, não à página.

```prisma
enum RevisionStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Page {
  id        String  @id @default(cuid())
  /// Chave estável usada no código: "home", "sobre", "contato".
  key       String  @unique
  title     String
  slug      String? @unique   // null para páginas de rota fixa, como a home

  /// Página de sistema não pode ser excluída pelo painel.
  isSystem  Boolean @default(false) @map("is_system")

  metaTitle       String? @map("meta_title")
  metaDescription String? @map("meta_description")
  ogImageId       String? @map("og_image_id")

  revisions PageRevision[]

  @@map("pages")
}

model PageRevision {
  id          String         @id @default(cuid())
  pageId      String         @map("page_id")
  status      RevisionStatus @default(DRAFT)
  note        String?        // "adicionei seção de parceiro"
  createdById String?        @map("created_by_id")
  publishedAt DateTime?      @map("published_at")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  page     Page      @relation(fields: [pageId], references: [id], onDelete: Cascade)
  sections Section[]

  @@index([pageId, status])
  @@map("page_revisions")
}
```

**Invariantes:** no máximo uma revisão `PUBLISHED` e no máximo uma `DRAFT` por
página. Índices únicos parciais garantem.

O storefront lê sempre a `PUBLISHED`. O preview lê a `DRAFT`. Publicar é uma
transação: a atual vira `ARCHIVED`, a rascunho vira `PUBLISHED`.

**Rollback vem de graça:** reverter é promover uma revisão arquivada. Custo:
algumas dezenas de linhas duplicadas por publicação — irrelevante.

### 3.2 `sections` — o equilíbrio entre relacional e JSONB

O requisito 35 é explícito: nem tabela com dezenas de colunas nulas, nem JSONB
como desculpa para não modelar.

**A linha divisória que adotamos:**

- **Relação vira FK.** Quais produtos, qual coleção, qual parceiro, qual
  imagem. Precisa de integridade referencial e de responder "onde esta coleção
  está sendo usada?".
- **Apresentação vira JSONB.** Alinhamento, variante de layout, rótulo do
  botão, número de colunas. Muda por tipo de seção, não tem integridade a
  proteger, e criar coluna para cada uma seria exatamente a tabela larga que
  o requisito proíbe.

```prisma
enum SectionType {
  HERO
  BANNER
  CATEGORIES
  FEATURED_PRODUCTS
  PRODUCT_LIST
  COLLECTION
  PARTNER
  IMAGE_TEXT
  GALLERY
  TESTIMONIALS
  CTA
  TEXT
  NEW_ARRIVALS
}

model Section {
  id         String      @id @default(cuid())
  revisionId String      @map("revision_id")
  type       SectionType
  position   Int

  title    String?
  subtitle String?

  /// Configuração de APRESENTAÇÃO, validada por schema Zod discriminado
  /// por `type`. Ver packages/cms/sections/schemas.
  /// Nunca guardar aqui id de entidade — isso é papel de section_items.
  config Json @default("{}")

  /// Versão do schema do config. Permite migrar configurações antigas
  /// quando a VORTEXIS evoluir um tipo de seção.
  configVersion Int @default(1) @map("config_version")

  isVisible Boolean @default(true) @map("is_visible")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  revision PageRevision  @relation(fields: [revisionId], references: [id], onDelete: Cascade)
  items    SectionItem[]

  @@unique([revisionId, position])
  @@index([revisionId, position])
  @@map("sections")
}

/// Referências da seção a entidades reais. Exatamente UMA das FKs
/// preenchida por linha — garantido por CHECK constraint.
model SectionItem {
  id        String @id @default(cuid())
  sectionId String @map("section_id")
  position  Int    @default(0)

  productId    String? @map("product_id")
  categoryId   String? @map("category_id")
  collectionId String? @map("collection_id")
  partnerId    String? @map("partner_id")
  mediaId      String? @map("media_id")

  /// Sobrescritas pontuais: legenda da imagem na galeria, link do banner.
  overrides Json @default("{}")

  section Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@index([sectionId, position])
  @@map("section_items")
}
```

CHECK constraint (SQL adicionado na migration):

```sql
ALTER TABLE section_items ADD CONSTRAINT exactly_one_reference CHECK (
  (product_id    IS NOT NULL)::int +
  (category_id   IS NOT NULL)::int +
  (collection_id IS NOT NULL)::int +
  (partner_id    IS NOT NULL)::int +
  (media_id      IS NOT NULL)::int = 1
);
```

**Seleção automática vs. manual.** No exemplo do requisito 12 — "selecionar
automaticamente produtos da Maria" — não se copiam os produtos para
`section_items`. Guarda-se o `partnerId` e, no `config`, a regra:
`{ "source": "partner", "limit": 8, "sort": "recent" }`. Assim, produto novo
da Maria entra na home sozinho. Curadoria manual usa `section_items` explícitos.
As duas formas convivem, decididas por tipo de seção.

### 3.3 `menus` e `menu_items`

```prisma
enum MenuItemTarget {
  CATEGORY
  COLLECTION
  PARTNER
  PAGE
  EXTERNAL
  HOME
  SHOP
}

model Menu {
  id    String @id @default(cuid())
  key   String @unique   // "principal", "rodape-loja", "rodape-institucional"
  name  String
  items MenuItem[]
  @@map("menus")
}

model MenuItem {
  id       String         @id @default(cuid())
  menuId   String         @map("menu_id")
  parentId String?        @map("parent_id")   // submenu
  label    String
  target   MenuItemTarget
  position Int

  categoryId   String? @map("category_id")
  collectionId String? @map("collection_id")
  partnerId    String? @map("partner_id")
  pageId       String? @map("page_id")
  /// Só quando target = EXTERNAL. Validado: apenas https, sem javascript:
  externalUrl  String? @map("external_url")

  isVisible Boolean @default(true) @map("is_visible")

  @@index([menuId, parentId, position])
  @@map("menu_items")
}
```

**URL externa é entrada de usuário com poder de virar link clicável.** Validação
obrigatória no backend: protocolo `https` apenas, `javascript:` e `data:`
recusados, host em formato válido. Requisito 17 pede isso explicitamente.

### 3.4 `banners`

```prisma
model Banner {
  id             String    @id @default(cuid())
  title          String?
  subtitle       String?
  desktopImageId String    @map("desktop_image_id")
  mobileImageId  String?   @map("mobile_image_id")
  ctaLabel       String?   @map("cta_label")
  ctaHref        String?   @map("cta_href")
  /// Restrito a valores do design system — não é CSS livre.
  alignment      String    @default("left")
  isActive       Boolean   @default(true) @map("is_active")
  startsAt       DateTime? @map("starts_at")
  endsAt         DateTime? @map("ends_at")
  position       Int       @default(0)

  @@index([isActive, startsAt, endsAt])
  @@map("banners")
}
```

`alignment` é enum de fato (`left | center | right`), não campo livre. Requisito
16 pede evitar personalização que destrua a identidade — a defesa começa no
tipo do dado.

### 3.5 `content_pages` → conteúdo rico

A tabela atual guarda texto simples. Passa a guardar **JSON do editor**
(formato do Tiptap), não HTML.

**Por quê:** HTML no banco significa sanitizar na leitura, para sempre, em todo
lugar. JSON estruturado só permite os nós que habilitamos — parágrafo, título,
lista, link, negrito. Injeção de `<script>` deixa de ser possível por
construção, não por filtro. O HTML é gerado na renderização, a partir de um
conjunto fechado de nós.

---

## 4. Permissões

```prisma
model Role {
  id          String @id @default(cuid())
  key         String @unique       // "admin", "editor"
  name        String
  description String?
  /// Papel de sistema não pode ser excluído nem ter permissão removida.
  isSystem    Boolean @default(false) @map("is_system")

  permissions RolePermission[]
  users       UserRole[]
  @@map("roles")
}

model Permission {
  id          String @id @default(cuid())
  /// Formato "recurso.acao": product.create, section.publish, order.cancel
  key         String @unique
  description String
  group       String            // "Catálogo", "Conteúdo", "Pedidos"
  roles       RolePermission[]
  @@map("permissions")
}

model RolePermission {
  roleId       String @map("role_id")
  permissionId String @map("permission_id")
  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  userId String @map("user_id")
  roleId String @map("role_id")
  @@id([userId, roleId])
  @@map("user_roles")
}
```

`users.role` (enum) some. Detalhes de uso em
[13-AUTH-RBAC-SEGURANCA](13-AUTH-RBAC-SEGURANCA.md).

---

## 5. Auditoria

`admin_audit_log` já existe. Ganha estrutura melhor:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?  @map("user_id")
  userEmail  String   @map("user_email")   // snapshot: o usuário pode sumir
  action     String                        // "product.update", "section.publish"
  entityType String   @map("entity_type")
  entityId   String?  @map("entity_id")
  entityLabel String? @map("entity_label") // "Prato Iemanjá" — legível depois

  /// Apenas os campos alterados: { "price": { "de": 15700, "para": 16900 } }
  /// NUNCA senha, token ou dado de cartão. Ver docs/06 (logs).
  changes    Json?
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([createdAt(sort: Desc)])
  @@index([entityType, entityId])
  @@index([userId, createdAt(sort: Desc)])
  @@map("audit_logs")
}
```

`entityLabel` existe porque log que só tem `entityId` é ilegível seis meses
depois, quando o produto já foi renomeado ou arquivado.

---

## 6. Resumo das mudanças

| Tabela | Situação |
|---|---|
| `categories` | 🔧 ganha `path`, `depth`, `imageId` |
| `product_categories` | ✅ nova — substitui `products.categoryId` |
| `collections`, `collection_products` | ✅ novas |
| `partners` | ✅ nova |
| `tags`, `product_tags` | ✅ novas |
| `media` | ✅ nova |
| `pages`, `page_revisions` | ✅ novas |
| `sections`, `section_items` | ✅ novas |
| `menus`, `menu_items` | ✅ novas |
| `banners` | ✅ nova |
| `roles`, `permissions`, `role_permissions`, `user_roles` | ✅ novas |
| `audit_logs` | 🔧 substitui `admin_audit_log` |
| `products` | 🔧 `partnerId`, `lowStockAlert`; sai `categoryId` |
| `product_images` | 🔧 passa a referenciar `media` |
| `content_pages` | 🔧 conteúdo vira JSON estruturado |
| `users` | 🔧 sai o enum `role` |
| `settings` | ✔️ mantida para configuração de loja |
| Pedidos, pagamentos, estoque, cupons, carrinho | ✔️ sem alteração |

Total: **~34 tabelas**, contra 23 hoje.
