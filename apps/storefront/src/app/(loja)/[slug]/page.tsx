import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@vortexis/ui";
import { formatDate } from "@/lib/utils";
import { getAllContentPageSlugs, getContentPage } from "@/modules/content";

/**
 * Páginas institucionais (Sobre, Contato, Políticas...).
 *
 * O conteúdo vem de `content_pages`, editável pelo admin. Enquanto o
 * cliente não enviar os textos oficiais, as páginas exibem um aviso
 * explícito de placeholder — nada de texto jurídico inventado.
 * Ver docs/10-DECISOES-PENDENTES.md
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const pages = await getAllContentPageSlugs();
    return pages.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getContentPage(slug);

  if (!page) return { title: "Página não encontrada" };

  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    alternates: { canonical: `/${page.slug}` },
    // Placeholder não deve ser indexado — evita ranquear texto provisório.
    robots: page.isPlaceholder ? { index: false, follow: true } : undefined,
  };
}

export default async function PaginaInstitucional({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getContentPage(slug);

  if (!page) notFound();

  return (
    <Container size="narrow" className="py-14">
      <article>
        <h1 className="text-h1 font-serif">{page.title}</h1>

        {page.isPlaceholder && (
          <div
            role="note"
            className="mt-6 rounded-md border border-warning/40 bg-warning/8 px-5 py-4 text-sm text-ink"
          >
            <p className="font-medium text-warning">Conteúdo provisório</p>
            <p className="mt-1 text-ink-muted">
              Este texto é um espaço reservado e não tem validade jurídica. Aguarda
              o conteúdo oficial do cliente.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-4 leading-relaxed text-ink-muted">
          {page.content.split("\n\n").map((paragraph: string, index: number) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>

        <p className="mt-12 text-xs text-ink-muted">
          Última atualização: {formatDate(page.updatedAt)}
        </p>
      </article>
    </Container>
  );
}
