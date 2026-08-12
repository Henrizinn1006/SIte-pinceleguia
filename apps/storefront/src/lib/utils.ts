/**
 * Utilitários específicos deste app.
 * `cn` mudou para @vortexis/ui na FASE 3.
 */

/** "Prato — Nanã Buruquê" -> "prato-nana-buruque" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(date: Date): string {
  return DATE_FMT.format(date);
}

/** Mascara e-mail para log: "joao@gmail.com" -> "jo***@gmail.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}
