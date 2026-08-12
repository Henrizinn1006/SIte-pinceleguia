import { Route, Routes } from "react-router-dom";
import { Header } from "@/components/loja/header";
import { Footer } from "@/components/loja/footer";
import { HomePage } from "@/pages/home";
import { LojaPage } from "@/pages/loja";
import { CategoriaPage } from "@/pages/categoria";
import { ProdutoPage } from "@/pages/produto";
import { BuscaPage } from "@/pages/busca";
import { CarrinhoPage } from "@/pages/carrinho";
import { CheckoutPage } from "@/pages/checkout";
import { PedidoPage } from "@/pages/pedido";
import { ConteudoGenericoPage } from "@/pages/conteudo-generico";
import { NotFoundPage } from "@/pages/not-found";

/**
 * Mesmo mapeamento de rotas do storefront Next.js original
 * (apps/storefront/src/app/(loja)/*), mais carrinho/checkout/pedido
 * (Fase 3) — só a mecânica de roteamento mudou (React Router em vez
 * do App Router).
 */
export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="conteudo" className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/loja" element={<LojaPage />} />
          <Route path="/categoria/:slug" element={<CategoriaPage />} />
          <Route path="/produto/:slug" element={<ProdutoPage />} />
          <Route path="/busca" element={<BuscaPage />} />
          <Route path="/carrinho" element={<CarrinhoPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedido/:token" element={<PedidoPage />} />
          {/* Catch-all: páginas institucionais vindas de content_pages.
              Precisa vir por último — mesma ordem de prioridade do
              catch-all [slug] do Next.js original. */}
          <Route path="/:slug" element={<ConteudoGenericoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
