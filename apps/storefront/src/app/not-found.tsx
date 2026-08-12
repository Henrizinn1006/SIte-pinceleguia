import { ButtonLink } from "@/components/ui/button";
import { Container } from "@vortexis/ui";

export default function NotFound() {
  return (
    <Container size="narrow" className="flex min-h-dvh flex-col items-center justify-center py-20 text-center">
      <p className="font-serif text-6xl text-gold">404</p>

      <h1 className="mt-5 text-h2 font-serif">Não encontramos esta página</h1>

      <p className="mt-3 max-w-md text-ink-muted">
        O endereço pode ter mudado, ou a peça que você procurava não está mais
        disponível.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Voltar ao início</ButtonLink>
        <ButtonLink href="/loja" variant="outline">
          Ver a loja
        </ButtonLink>
      </div>
    </Container>
  );
}
