import Link from "next/link";
import { Container } from "@vortexis/ui";
import { CartIcon, SearchIcon, UserIcon } from "@vortexis/ui";
import { mainNav } from "@/lib/site";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

/**
 * Header do site.
 *
 * Server Component: só o menu mobile e o realce do link ativo precisam
 * de JavaScript, e estão isolados em componentes client próprios.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-beige-dark bg-warm-white/95 shadow-soft backdrop-blur-md">
      <a
        href="#conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-sm bg-ink px-4 py-2 text-warm-white"
      >
        Pular para o conteúdo
      </a>

      <Container>
        <div className="flex h-20 items-center gap-4">
          <MobileMenu />

          <div className="flex flex-1 justify-center lg:flex-none lg:justify-start">
            <Logo />
          </div>

          <nav
            className="hidden flex-1 justify-center lg:flex"
            aria-label="Navegação principal"
          >
            <ul className="flex items-center gap-7">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <Link
              href="/busca"
              className="flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-beige/60"
              aria-label="Buscar peças"
            >
              <SearchIcon className="size-5" />
            </Link>

            <Link
              href="/entrar"
              className="hidden size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-beige/60 sm:flex"
              aria-label="Minha conta"
            >
              <UserIcon className="size-5" />
            </Link>

            {/* O contador do carrinho entra na FASE 3, junto do carrinho real. */}
            <Link
              href="/carrinho"
              className="relative flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-beige/60"
              aria-label="Carrinho de compras"
            >
              <CartIcon className="size-5" />
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
