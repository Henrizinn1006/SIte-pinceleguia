/**
 * Seed de DEMONSTRAÇÃO — Pincel & Guia
 *
 * Fica FORA de packages/ de propósito: estes dados são identidade do
 * cliente, não schema. O pacote @vortexis/db é genérico e reutilizável;
 * a checagem de fronteira falha se termo específico aparecer lá.
 * Ver docs/16-VORTEXIS-CORE.md
 *
 * ⚠️  TODOS os dados abaixo são FICTÍCIOS e servem apenas para desenvolvimento.
 *     Nenhum preço, prazo, texto jurídico ou dado de contato aqui é real.
 *     Serão substituídos pelo conteúdo oficial do cliente na FASE 7.
 *     Ver docs/10-DECISOES-PENDENTES.md
 *
 * Uso:  npm run db:seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();

const DEMO = "[DEMONSTRAÇÃO]";

// ---------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------
const categories = [
  {
    slug: "orixas",
    name: "Orixás",
    description:
      "Pratos em porcelana com representações autorais dos Orixás, pintados à mão.",
    imageUrl: "/demo/oxossi.svg",
    imageAlt: "Prato de porcelana com representação de Oxóssi",
    showOnHome: true,
    position: 1,
  },
  {
    slug: "guias-e-entidades",
    name: "Guias & Entidades",
    description:
      "Peças dedicadas às entidades da Umbanda — Exus, Pombagiras, Pretos-Velhos e Caboclos.",
    imageUrl: "/demo/exu-tranca-ruas.svg",
    imageAlt: "Prato de porcelana com representação de Exu Tranca-Ruas",
    showOnHome: true,
    position: 2,
  },
  {
    slug: "guias-de-protecao",
    name: "Guias de proteção",
    description: "Guias e acessórios montados peça a peça.",
    imageUrl: "/demo/guia-protecao.svg",
    imageAlt: "Guia de proteção com contas claras e medalha dourada",
    showOnHome: true,
    position: 3,
  },
  {
    slug: "colecoes",
    name: "Coleções",
    description: "Conjuntos e séries especiais.",
    imageUrl: "/demo/oxum.svg",
    imageAlt: "Prato de porcelana da coleção especial",
    showOnHome: false,
    position: 4,
  },
];

// ---------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------
type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  image: string;
  priceInCents: number;
  salePriceInCents?: number;
  stock: number;
  featured: boolean;
  short: string;
  description: string;
};

const products: SeedProduct[] = [
  {
    slug: "prato-porcelana-nana-buruque",
    name: "Prato em porcelana — Nanã Buruquê",
    category: "orixas",
    image: "/demo/nana-buruque.svg",
    priceInCents: 15700,
    stock: 3,
    featured: true,
    short: "Pintura autoral em porcelana, com acabamento em ouro.",
    description:
      "Prato decorativo em porcelana branca, com pintura autoral feita à mão representando Nanã Buruquê. Filete em ouro aplicado manualmente na borda. Por ser uma peça artesanal, pequenas variações de traço e tonalidade fazem parte da sua natureza — não há duas iguais.",
  },
  {
    slug: "prato-porcelana-iemanja",
    name: "Prato em porcelana — Iemanjá",
    category: "orixas",
    image: "/demo/iemanja.svg",
    priceInCents: 15700,
    stock: 5,
    featured: true,
    short: "Tons de azul e prata sobre porcelana branca.",
    description:
      "Prato decorativo em porcelana branca com pintura autoral de Iemanjá, em tons de azul. Acabamento com filete dourado na borda. Peça artesanal — cada exemplar tem pequenas variações próprias.",
  },
  {
    slug: "prato-porcelana-oxossi",
    name: "Prato em porcelana — Oxóssi",
    category: "orixas",
    image: "/demo/oxossi.svg",
    priceInCents: 15700,
    salePriceInCents: 13900,
    stock: 2,
    featured: true,
    short: "Pintura em tons de verde e ouro.",
    description:
      "Prato decorativo em porcelana branca com representação autoral de Oxóssi, o caçador. Pintura à mão em tons terrosos e dourados, com filete em ouro na borda.",
  },
  {
    slug: "prato-porcelana-pombagira",
    name: "Prato em porcelana — Pombagira",
    category: "guias-e-entidades",
    image: "/demo/pombagira.svg",
    priceInCents: 15700,
    stock: 4,
    featured: true,
    short: "Vermelho e preto sobre porcelana, com detalhes em ouro.",
    description:
      "Prato decorativo em porcelana branca com pintura autoral de Pombagira. Composição em vermelho e preto, com filete dourado aplicado à mão na borda.",
  },
  {
    slug: "prato-porcelana-exu-tranca-ruas",
    name: "Prato em porcelana — Exu Tranca-Ruas",
    category: "guias-e-entidades",
    image: "/demo/exu-tranca-ruas.svg",
    priceInCents: 15700,
    stock: 1,
    featured: true,
    short: "Peça de traço marcante, com acabamento em ouro.",
    description:
      "Prato decorativo em porcelana branca com representação autoral de Exu Tranca-Ruas. Pintura feita à mão, com filete em ouro na borda.",
  },
  {
    slug: "guia-de-protecao-cristal",
    name: "Guia de proteção — cristal e dourado",
    category: "guias-de-protecao",
    image: "/demo/guia-protecao.svg",
    priceInCents: 15700,
    stock: 8,
    featured: true,
    short: "Contas de cristal montadas peça a peça, com medalha dourada.",
    description:
      "Guia de proteção montada à mão, com contas de cristal e medalha em acabamento dourado. Cada guia é montada individualmente.",
  },
  {
    slug: "prato-porcelana-oxum",
    name: "Prato em porcelana — Oxum",
    category: "orixas",
    image: "/demo/oxum.svg",
    priceInCents: 16900,
    stock: 3,
    featured: false,
    short: "Dourado e âmbar sobre porcelana branca.",
    description:
      "Prato decorativo em porcelana branca com pintura autoral de Oxum, em tons dourados e âmbar. Filete em ouro na borda, aplicado à mão.",
  },
  {
    slug: "prato-porcelana-ogum",
    name: "Prato em porcelana — Ogum",
    category: "orixas",
    image: "/demo/ogum.svg",
    priceInCents: 16900,
    stock: 0, // esgotado — para testar o estado visual
    featured: false,
    short: "Verde profundo e detalhes metálicos.",
    description:
      "Prato decorativo em porcelana branca com representação autoral de Ogum. Pintura à mão em verde profundo, com detalhes metálicos e filete dourado.",
  },
];

// ---------------------------------------------------------------------
// Páginas institucionais — PLACEHOLDERS
// ---------------------------------------------------------------------
const placeholderNotice = `> ⚠️ **Conteúdo de demonstração.** Este texto é um espaço reservado e **não tem validade jurídica**. Precisa ser substituído pelo conteúdo oficial fornecido pelo cliente antes do lançamento.\n\n`;

const contentPages = [
  {
    slug: "sobre",
    title: "Sobre",
    isPlaceholder: true,
    content:
      placeholderNotice +
      "Espaço reservado para a história da marca, o processo de criação das peças e a apresentação da artista.\n\nInformações necessárias: trajetória, técnica utilizada, o que torna cada peça única.",
  },
  {
    slug: "contato",
    title: "Contato",
    isPlaceholder: true,
    content:
      placeholderNotice +
      "Espaço reservado para os canais de atendimento.\n\nInformações pendentes: e-mail, WhatsApp, Instagram e horário de atendimento.",
  },
  {
    slug: "politica-de-privacidade",
    title: "Política de Privacidade",
    isPlaceholder: true,
    content:
      placeholderNotice +
      "Documento obrigatório pela LGPD. Deve descrever quais dados são coletados, com qual finalidade, por quanto tempo são guardados, com quem são compartilhados e como o titular exerce seus direitos.\n\nRecomendação: redigir com apoio jurídico.",
  },
  {
    slug: "termos",
    title: "Termos de Uso",
    isPlaceholder: true,
    content:
      placeholderNotice +
      "Documento que estabelece as condições de uso do site e de compra.\n\nRecomendação: redigir com apoio jurídico.",
  },
  {
    slug: "trocas-e-devolucoes",
    title: "Trocas e Devoluções",
    isPlaceholder: true,
    content:
      placeholderNotice +
      "Deve contemplar o direito de arrependimento de 7 dias previsto no Código de Defesa do Consumidor para compras online, além das condições específicas para peças artesanais.\n\nInformações pendentes: prazo, condições, quem paga o frete de devolução.",
  },
  {
    slug: "entrega",
    title: "Entrega",
    isPlaceholder: true,
    content:
      placeholderNotice +
      "Informações pendentes: prazo de produção, prazo de envio, transportadoras utilizadas, regiões atendidas e política de frete grátis (se houver).",
  },
  {
    slug: "atendimento",
    title: "Atendimento",
    isPlaceholder: true,
    content:
      placeholderNotice + "Informações pendentes: canais, horários e prazo de resposta.",
  },
];

// ---------------------------------------------------------------------
// Configurações editáveis pelo admin
// ---------------------------------------------------------------------
const settings: { key: string; group: string; value: Prisma.InputJsonValue }[] = [
  {
    key: "home.hero",
    group: "home",
    value: {
      title: "Pincel & Guia",
      subtitle: "Porcelana autoral feita à mão",
      tagline: "Arte, fé e ancestralidade em cada peça",
      ctaLabel: "Conheça a coleção",
      ctaHref: "/loja",
      imageUrl: "/demo/hero.svg",
      imageAlt:
        "Composição de demonstração com três pratos de porcelana pintados à mão",
    },
  },
  {
    key: "home.featuredTitle",
    group: "home",
    value: { title: "Peças em destaque", linkLabel: "Ver todas" },
  },
  {
    key: "shipping.flatRate",
    group: "frete",
    value: {
      // DEMONSTRAÇÃO — valores reais dependem de decisão do cliente (docs/10, itens 4 e 5)
      priceInCents: 2500,
      estimatedDays: 7,
      label: "Envio padrão",
      freeShippingThresholdInCents: null,
    },
  },
  {
    key: "store.contact",
    group: "loja",
    value: {
      // ⚠️ PLACEHOLDERS — dados reais pendentes (docs/10, item 9)
      email: null,
      whatsapp: null,
      instagram: null,
      legalName: null,
      document: null,
    },
  },
];

// ---------------------------------------------------------------------

function slugToSku(slug: string): string {
  return slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 40);
}

async function main() {
  console.log("🌱 Populando banco com dados de DEMONSTRAÇÃO...\n");

  // --- Configurações ---
  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, group: s.group },
      create: s,
    });
  }
  console.log(`✓ ${settings.length} configurações`);

  // --- Páginas institucionais ---
  for (const p of contentPages) {
    await db.contentPage.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, isPublished: true },
    });
  }
  console.log(`✓ ${contentPages.length} páginas institucionais (placeholders)`);

  // --- Categorias ---
  const categoryIdBySlug = new Map<string, string>();
  for (const c of categories) {
    const created = await db.category.upsert({
      where: { slug: c.slug },
      update: { ...c },
      create: {
        ...c,
        metaTitle: `${c.name} | Pincel & Guia`,
        metaDescription: c.description,
      },
    });
    categoryIdBySlug.set(c.slug, created.id);
  }
  console.log(`✓ ${categories.length} categorias`);

  // --- Produtos ---
  for (const [index, p] of products.entries()) {
    const categoryId = categoryIdBySlug.get(p.category);
    if (!categoryId) throw new Error(`Categoria não encontrada: ${p.category}`);

    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        shortDescription: p.short,
        categoryId,
        basePriceInCents: p.priceInCents,
        salePriceInCents: p.salePriceInCents ?? null,
        isActive: true,
        isFeatured: p.featured,
        position: index,
        weightInGrams: 900,
        widthMm: 280,
        heightMm: 60,
        lengthMm: 280,
        metaTitle: `${p.name} | Pincel & Guia`,
        metaDescription: p.short,
      },
    });

    const hasImage = await db.productImage.findFirst({
      where: { productId: product.id },
    });
    if (!hasImage) {
      await db.productImage.create({
        data: {
          productId: product.id,
          url: p.image,
          alt: `${DEMO} ${p.name}`,
          width: 800,
          height: 800,
          position: 0,
          isPrimary: true,
        },
      });
    }

    // Todo produto tem ao menos uma variante "Padrão" — ver docs/03.
    await db.productVariant.upsert({
      where: { sku: slugToSku(p.slug) },
      update: { stock: p.stock },
      create: {
        productId: product.id,
        sku: slugToSku(p.slug),
        name: "Padrão",
        stock: p.stock,
        isActive: true,
        position: 0,
      },
    });
  }
  console.log(`✓ ${products.length} produtos (com variante padrão e imagem)`);

  // --- Cupom de exemplo ---
  await db.coupon.upsert({
    where: { code: "DEMO10" },
    update: {},
    create: {
      code: "DEMO10",
      description: `${DEMO} 10% de desconto — cupom de teste`,
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderInCents: 10000,
      maxDiscountInCents: 5000,
      isActive: true,
    },
  });
  console.log("✓ 1 cupom de teste (DEMO10)");

  console.log("\n✅ Concluído. Lembre-se: todos os dados são fictícios.\n");
}

main()
  .catch((e) => {
    console.error("❌ Falha no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
