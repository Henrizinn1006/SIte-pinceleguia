import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { CartIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { mainNav } from "@/lib/site";
import { useCart } from "@/lib/cart-context";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

/** Porta de apps/storefront/src/components/loja/header.tsx. */
export function Header() {
  const { cart } = useCart();
  const itemCount = cart?.totalItems ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-beige-dark bg-warm-white/95 shadow-soft backdrop-blur-md">
      <a href="#conteudo" className="sr-only-focusable absolute left-4 top-4 z-50 rounded-sm bg-ink px-4 py-2 text-warm-white">
        Pular para o conteúdo
      </a>

      <Container>
        <div className="flex h-20 items-center gap-4">
          <MobileMenu />

          <div className="flex flex-1 justify-center lg:flex-none lg:justify-start">
            <Logo />
          </div>

          <nav className="hidden flex-1 justify-center lg:flex" aria-label="Navegação principal">
            <ul className="flex items-center gap-7">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <Link to="/busca" className="flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-beige/60" aria-label="Buscar peças">
              <SearchIcon className="size-5" />
            </Link>

            <Link to="/entrar" className="hidden size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-beige/60 sm:flex" aria-label="Minha conta">
              <UserIcon className="size-5" />
            </Link>

            <Link to="/carrinho" className="relative flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-beige/60" aria-label={`Carrinho de compras${itemCount > 0 ? `, ${itemCount} ${itemCount === 1 ? "item" : "itens"}` : ""}`}>
              <CartIcon className="size-5" />
              {itemCount > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-caramel-deep px-1 text-[10px] font-medium leading-none text-warm-white"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
