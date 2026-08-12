import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@vortexis/ui";
import { ArrowRightIcon } from "@vortexis/ui";
import { dynamicHref } from "@/lib/routes";
import type { Hero as HeroContent } from "@/modules/content";

/**
 * Hero da home.
 *
 * Todo o conteúdo vem da tabela `settings` — o cliente pode trocar
 * texto, CTA e imagem pelo painel, sem deploy. Ver docs/03.
 *
 * No mobile a imagem vem ANTES do texto: a peça é o argumento de
 * venda, o texto vem depois. Ver docs/07.
 */
export function Hero({ content }: { content: HeroContent }) {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-cream-dark/70 to-cream"
      aria-labelledby="hero-titulo"
    >
      <Container>
        <div className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:gap-12 lg:py-20">
          {/* Imagem — primeira no mobile, segunda no desktop */}
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={content.imageUrl}
                alt={content.imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain"
              />
            </div>
          </div>

          <div className="order-2 animate-fade-up lg:order-1">
            <h1
              id="hero-titulo"
              className="text-display font-serif tracking-[0.06em] text-ink uppercase"
            >
              {content.title}
            </h1>

            <p className="mt-4 text-lg text-caramel-text sm:text-xl">{content.subtitle}</p>

            <div className="ornament my-6 max-w-sm" aria-hidden>
              <span className="text-sm">✦</span>
            </div>

            <p className="max-w-md font-serif text-xl italic text-ink-muted sm:text-2xl">
              {content.tagline}
            </p>

            <ButtonLink href={dynamicHref(content.ctaHref)} size="lg" className="mt-8">
              {content.ctaLabel}
              <ArrowRightIcon className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
