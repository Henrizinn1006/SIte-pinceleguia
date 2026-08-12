import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/protected-route";
import { LoginPage } from "@/pages/login";
import { HomePage } from "@/pages/home";
import { CategoriasPage } from "@/pages/categorias";
import { ProdutosPage } from "@/pages/produtos";
import { ProdutoDetalhePage } from "@/pages/produto-detalhe";
import { PedidosPage } from "@/pages/pedidos";
import { PedidoDetalhePage } from "@/pages/pedido-detalhe";
import { CuponsPage } from "@/pages/cupons";
import { ClientesPage } from "@/pages/clientes";
import { AuditoriaPage } from "@/pages/auditoria";
import { ConfiguracoesPage } from "@/pages/configuracoes";

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/categorias" element={<ProtectedRoute><CategoriasPage /></ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute><ProdutosPage /></ProtectedRoute>} />
      <Route path="/produtos/novo" element={<ProtectedRoute><ProdutoDetalhePage isNew /></ProtectedRoute>} />
      <Route path="/produtos/:id" element={<ProtectedRoute><ProdutoDetalhePage /></ProtectedRoute>} />
      <Route path="/pedidos" element={<ProtectedRoute><PedidosPage /></ProtectedRoute>} />
      <Route path="/pedidos/:id" element={<ProtectedRoute><PedidoDetalhePage /></ProtectedRoute>} />
      <Route path="/cupons" element={<ProtectedRoute><CuponsPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
      <Route path="/auditoria" element={<ProtectedRoute><AuditoriaPage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><ConfiguracoesPage /></ProtectedRoute>} />
    </Routes>
  );
}
