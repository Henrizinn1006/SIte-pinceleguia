import { Footer } from "@/components/loja/footer";
import { Header } from "@/components/loja/header";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
