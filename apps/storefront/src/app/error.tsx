"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@vortexis/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção isto vai para o Sentry. O usuário NUNCA vê o detalhe
    // técnico — ver docs/06-SEGURANCA.md (logs).
    console.error(error);
  }, [error]);

  return (
    <Container
      size="narrow"
      className="flex min-h-dvh flex-col items-center justify-center py-20 text-center"
    >
      <h1 className="text-h2 font-serif">Algo deu errado</h1>

      <p className="mt-3 max-w-md text-ink-muted">
        Tivemos um problema ao carregar esta página. Tente novamente em instantes.
      </p>

      <Button onClick={reset} className="mt-9">
        Tentar novamente
      </Button>
    </Container>
  );
}
