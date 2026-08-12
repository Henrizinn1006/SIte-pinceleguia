import Link from "next/link";
import { Container } from "@vortexis/ui";
import { footerNav, site } from "@/lib/site";
import { getStoreContact } from "@/modules/content";
import { Logo } from "./logo";

const COLUMNS = [
  { title: "Loja", links: footerNav.loja },
  { title: "Atendimento", links: footerNav.atendimento },
  { title: "Institucional", links: footerNav.institucional },
] as const;

export async function Footer() {
  const contact = await getStoreContact();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-caramel/35 bg-beige">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-muted">
              {site.description}
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-serif text-base tracking-[0.12em] text-ink uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Contato só aparece quando o cliente fornecer os dados reais.
            Nada é inventado aqui. Ver docs/10, item 9. */}
        {(contact.email || contact.whatsapp || contact.instagram) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-caramel/20 py-6 text-sm text-ink-muted">
            {contact.email && <span>{contact.email}</span>}
            {contact.whatsapp && <span>{contact.whatsapp}</span>}
            {contact.instagram && (
              <a
                href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                className="transition-colors hover:text-ink"
                rel="noopener noreferrer"
                target="_blank"
              >
                {contact.instagram}
              </a>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-caramel/20 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}
            {contact.legalName ? ` — ${contact.legalName}` : ""}
            {contact.document ? ` · ${contact.document}` : ""}
          </p>
          <p>
            Desenvolvido por{" "}
            <span className="tracking-[0.15em] text-ink">{site.developer}</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
