import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { useDocumentHead } from "@/lib/head";

/** Porta de apps/storefront/src/app/not-found.tsx. */
export function NotFoundPage() {
  useDocumentHead("Página não encontrada | Pincel & Guia");

  return (
    <Container className="py-24 text-center">
      <h1 className="text-h1 font-serif">Página não encontrada</h1>
      <p className="mx-auto mt-4 max-w-prose text-ink-muted">
        O endereço que você tentou acessar não existe ou foi movido. Volte para a loja e continue explorando.
      </p>
      <ButtonLink to="/loja" className="mt-8">
        Ver a loja
      </ButtonLink>
      <p className="mt-6 text-sm text-ink-muted">
        <Link to="/" className="underline underline-offset-4 hover:text-ink">
          Voltar ao início
        </Link>
      </p>
    </Container>
  );
}
