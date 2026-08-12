import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { HeroContent } from "@/lib/types";

/**
 * Porta de apps/storefront/src/components/loja/hero.tsx.
 * Conteúdo vem de /api/configuracoes/publicas (tabela settings) —
 * editável sem deploy quando o painel ganhar essa tela (Fase 2).
 */
export function Hero({ content }: { content: HeroContent }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-cream-dark/70 to-cream" aria-labelledby="hero-titulo">
      <Container>
        <div className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:gap-12 lg:py-20">
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-[4/3] w-full">
              <img
                src={content.imageUrl}
                alt={content.imageAlt}
                width={800}
                height={600}
                className="size-full object-contain"
                loading="eager"
              />
            </div>
          </div>

          <div className="order-2 animate-fade-up lg:order-1">
            <h1 id="hero-titulo" className="text-display font-serif tracking-[0.06em] text-ink uppercase">
              {content.title}
            </h1>

            <p className="mt-4 text-lg text-caramel-text sm:text-xl">{content.subtitle}</p>

            <div className="ornament my-6 max-w-sm" aria-hidden>
              <span className="text-sm">✦</span>
            </div>

            <p className="max-w-md font-serif text-xl italic text-ink-muted sm:text-2xl">{content.tagline}</p>

            <ButtonLink to={content.ctaHref} size="lg" className="mt-8">
              {content.ctaLabel}
              <ArrowRightIcon className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
