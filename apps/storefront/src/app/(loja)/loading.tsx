import { Container } from "@vortexis/ui";

/** Skeleton exibido durante a navegação. Evita tela em branco. */
export default function Loading() {
  return (
    <Container className="py-12">
      <div className="h-9 w-56 animate-pulse rounded-sm bg-beige/70" />
      <div className="mt-3 h-5 w-80 animate-pulse rounded-sm bg-beige/50" />

      <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <li key={index}>
            <div className="aspect-square animate-pulse rounded-md bg-beige/60" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded-sm bg-beige/50" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded-sm bg-beige/40" />
          </li>
        ))}
      </ul>
    </Container>
  );
}
