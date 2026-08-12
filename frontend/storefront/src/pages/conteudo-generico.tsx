import { useParams } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { getContentPage } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useDocumentHead } from "@/lib/head";
import { NotFoundPage } from "./not-found";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Páginas institucionais (Sobre, Contato, Políticas...) — porta de
 * apps/storefront/src/app/(loja)/[slug]/page.tsx. Conteúdo vem de
 * content_pages; enquanto o cliente não enviar os textos oficiais, a
 * página mostra o aviso de "conteúdo provisório" (mesmo texto do
 * original — nada de texto jurídico inventado aqui).
 */
export function ConteudoGenericoPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const page = useAsync(() => getContentPage(slug), [slug]);

  useDocumentHead(
    page.data ? `${page.data.metaTitle ?? page.data.title} | Pincel & Guia` : "Página | Pincel & Guia",
    page.data?.metaDescription ?? undefined,
  );

  if (!page.loading && page.data === null) {
    return <NotFoundPage />;
  }

  if (!page.data) return null;

  return (
    <Container size="narrow" className="py-14">
      <article>
        <h1 className="text-h1 font-serif">{page.data.title}</h1>

        {page.data.isPlaceholder && (
          <div role="note" className="mt-6 rounded-md border border-warning/40 bg-warning/8 px-5 py-4 text-sm text-ink">
            <p className="font-medium text-warning">Conteúdo provisório</p>
            <p className="mt-1 text-ink-muted">Este texto é um espaço reservado e não tem validade jurídica. Aguarda o conteúdo oficial do cliente.</p>
          </div>
        )}

        <div className="mt-8 space-y-4 leading-relaxed text-ink-muted">
          {page.data.content.split("\n\n").map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>

        <p className="mt-12 text-xs text-ink-muted">Última atualização: {dateFormatter.format(new Date(page.data.updatedAt))}</p>
      </article>
    </Container>
  );
}
