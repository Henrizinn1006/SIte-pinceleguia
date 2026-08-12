import { useEffect } from "react";

/**
 * Ajusta <title>/<meta name="description"> no cliente.
 *
 * Em produção o HTML inicial já vem com os valores certos (SSR-lite em
 * backend/public/index.php) — isto aqui só mantém o título correto
 * durante a navegação client-side entre rotas (a SPA não recarrega a
 * página), e serve de fallback em `npm run dev`, onde o Vite serve o
 * index.html direto, sem passar pelo PHP.
 */
export function useDocumentHead(title: string, description?: string): void {
  useEffect(() => {
    document.title = title;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
}
