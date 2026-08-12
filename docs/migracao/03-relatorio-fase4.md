# Relatório — Migração para Hostinger, Fase 4

## Contexto

Última fase do escopo original do pedido de migração. Escopo:
operação de pedidos no painel (ver lista, ver detalhe, mudar status),
cupons, visão de clientes e auditoria — o recorte descrito como "Fase
4". Com isso, as quatro fases descritas no pedido original de migração
estão implementadas.

## O que foi entregue

- **Migrations** `0020_coupons.sql`, `0021_coupon_redemptions.sql`.
- **Backend PHP**: `App\Admin\OrderAdminRepository` (listar, detalhar,
  mudar status via `App\Orders\OrderStateMachine`, nota interna),
  `App\Admin\CouponAdminRepository` (CRUD), `App\Coupons\CouponRepository`
  (validação e aplicação de desconto — chamado pelo checkout, não só
  pelo painel), `App\Admin\CustomerAdminRepository` (visão agregada),
  `App\Admin\AuditLogAdminRepository` (leitura).
- **Endpoints**: `/api/admin/pedidos` (+ `/status`, `/nota-interna`),
  `/api/admin/cupons`, `/api/admin/clientes` (+ `/pedidos`),
  `/api/admin/auditoria`. `/api/checkout` passou a aceitar
  `couponCode`.
- **Frontend admin**: telas de Pedidos (lista + detalhe com mudança de
  status e histórico), Cupons (CRUD), Clientes (lista agregada +
  pedidos por e-mail), Auditoria (lista com filtro por ação).
- **Frontend storefront**: campo de cupom no checkout, linha de
  desconto na página de pedido.

## Decisão: "Clientes" sem tabela de clientes

O projeto não tem cadastro nem login de cliente (só checkout como
visitante, decisão mantida desde a Fase 3). "Clientes", nesta fase, é
uma **visão agregada em cima de `orders.customer_email`**
(`GROUP BY customer_email`), não uma tabela nova nem um CRM. Mostra
nome, quantidade de pedidos, total gasto (excluindo pedidos
cancelados) e data da última compra. Se no futuro o projeto ganhar
conta de cliente de verdade, essa tela muda de fonte de dados, não de
lugar na navegação.

## Decisão: mudança de status sempre pela mesma máquina de estados

O endpoint do painel (`PUT /api/admin/pedidos/{id}/status`) usa
exatamente `App\Orders\OrderStateMachine`, a mesma classe que o
webhook do Mercado Pago e o cron de reconciliação usam (Fase 3). Não
existe um caminho "o admin pode fazer qualquer transição" — se o admin
tentar cancelar um pedido já entregue, por exemplo, recebe o mesmo 409
que qualquer outro chamador receberia. Cancelar um pedido `PAID` ou
`PREPARING` pelo painel também devolve o estoque, reaproveitando a
mesma lógica de restock do cron de reconciliação (código duplicado
entre os dois lugares — candidato a extrair para um serviço
compartilhado numa próxima limpeza, não feito agora para não arriscar
alterar o comportamento já testado do cron).

## O que foi adiado dentro da própria Fase 4

- **Cupons por produto/categoria** (restringir um cupom a itens
  específicos) — o schema original não previa isso e esta fase também
  não; cupom é sempre sobre o pedido inteiro.
- **Extrair a lógica de restock para um serviço compartilhado** —
  `OrderAdminRepository::restock()` e a lógica equivalente em
  `backend/cron/reconciliar-pagamentos-pendentes.php` fazem a mesma
  coisa de forma duplicada. Funciona, foi testado nos dois casos, mas
  é uma limpeza pendente.
- **Filtros mais ricos na tela de auditoria** (por período, por
  usuário) — hoje só filtra por texto da ação e tipo de entidade via
  API (a tela só expõe o filtro de ação).
- **Exportar relatório de pedidos/clientes** (CSV) — não pedido
  explicitamente no escopo original desta fase, não implementado.

## Verificação executada — com testes reais

PHP e MariaDB já instalados localmente (mesmo ambiente das fases
anteriores). Testado contra um MariaDB real, com o backend rodando via
`php -S`:

- Migrations `0020`/`0021` aplicadas sem erro (21 tabelas no total).
- **Cupom aplicado no checkout**: cupom `DEMO10` (10%, pedido mínimo
  R$ 50) criado via API admin, aplicado num checkout de R$ 157,00 —
  desconto de R$ 15,70 calculado corretamente, total final R$ 166,30
  (subtotal + frete − desconto). Código do cupom testado em minúsculo
  (`demo10`) — funcionou (case-insensitive, conforme implementado).
- **Cupom abaixo do pedido mínimo**: rejeitado com `COUPON_INVALID`
  antes de criar qualquer pedido (a validação roda dentro da mesma
  transação do checkout — se o cupom falha, nada é criado, nenhum
  estoque é decrementado).
- **Cupom inexistente**: rejeitado com `COUPON_INVALID`.
- **Mudança de status válida** (`PENDING_PAYMENT → PAID`): aplicada
  com sucesso, registrada em `order_status_history` e `audit_logs`.
- **Mudança de status inválida** (`PAID → PENDING_PAYMENT`): bloqueada
  com `409 INVALID_ORDER_TRANSITION` — a máquina de estados barrou
  mesmo sendo o admin autenticado fazendo a chamada.
- **Cancelamento com devolução de estoque**: pedido `PAID` cancelado
  pelo painel — estoque da variante voltou ao valor anterior à compra
  (testado numericamente: 4 → 5 depois do cancelamento).
- **Clientes agregados**: endpoint retornou corretamente o e-mail, o
  total gasto e a contagem de pedidos do cliente de teste.
- **Auditoria**: login, criação de cupom e mudança de status do pedido
  apareceram na lista, todos com `user_email` correto.
- `php -l` em todos os arquivos novos — sem erro.
- `npm run build` em `frontend/storefront` e `frontend/admin` — sem
  erro nos dois.

## Não testado

- Interface das novas telas do painel num navegador de verdade (só a
  API foi testada via `curl`; o build do React não garante que a
  tela renderiza e funciona como esperado — mesma ressalva das fases
  anteriores).
- Volume de dados maior (a tela de clientes/auditoria não pagina
  ainda — `AuditLogAdminRepository` limita a 500 registros por
  chamada, mas não tem paginação de verdade; para uma loja pequena,
  não é um problema imediato).

## Estado geral do projeto após as 4 fases

Catálogo, painel administrativo, carrinho, checkout, pagamento PIX,
pedidos, cupons, clientes e auditoria estão implementados e testados
localmente contra PHP + MariaDB reais. **Nada disso foi testado contra
a Hostinger de verdade, nem contra o Mercado Pago ou SMTP reais** —
isso continua sendo o passo final antes de considerar o projeto pronto
para vender, listado nos relatórios de cada fase anterior. Cartão de
crédito/débito, boleto, cadastro de cliente com login, CMS/Section
Builder avançado e relatórios exportáveis não foram implementados —
não estavam no escopo das 4 fases pedidas.
