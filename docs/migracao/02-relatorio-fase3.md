# Relatório — Migração para Hostinger, Fase 3

## Contexto

Continuação das Fases 1 e 2. Escopo: carrinho, checkout como
visitante, frete por taxa fixa, pagamento via PIX (Mercado Pago),
criação/rastreamento de pedidos e e-mails essenciais — o mesmo
recorte descrito como "Fase 3" no pedido original. Operação de
pedidos no painel administrativo (mudar status, ver lista de pedidos),
cupons e clientes continuam fora do escopo (Fase 4).

## O que foi entregue

- **Migrations** `0012_carts.sql` a `0019_email_queue.sql` (8 tabelas:
  `carts`, `cart_items`, `orders`, `order_items`,
  `order_status_history`, `payments`, `payment_events`, mais
  `email_queue` — que não existe no `schema.prisma` original, criada
  para a fila de e-mail pedida no escopo).
- **Backend PHP**: `App\Cart` (carrinho de visitante via cookie),
  `App\Checkout` (recalcula preço/frete e cria o pedido com baixa de
  estoque transacional), `App\Orders` (máquina de estados, snapshot do
  pedido, rastreamento por token), `App\Payments` (cliente HTTP do
  Mercado Pago, verificação de assinatura do webhook, idempotência),
  `App\Email` (fila + cliente SMTP via socket puro).
- **Endpoints**: `/api/carrinho` (+ `/itens`), `/api/checkout`,
  `/api/pedidos/{token}`, `/api/webhooks/mercadopago`.
- **Cron Jobs**: `limpar-sessoes-expiradas.php`,
  `processar-fila-email.php`, `reconciliar-pagamentos-pendentes.php` —
  todos com lock de arquivo (`flock`).
- **Frontend storefront**: carrinho, checkout (formulário próprio
  endereço/dados), página de pedido com QR code PIX e rastreamento,
  contador de itens no header, botão "adicionar ao carrinho" do
  produto (antes desabilitado, agora funcional).

## Decisão central: como evitar vender estoque negativo

O schema original (`schema.prisma`) previa um modelo
`StockReservation`: reservar estoque quando o item entra no carrinho,
liberar a reserva se expirar sem finalizar a compra. Essa fase **não
implementa isso** — a decisão tomada foi mais simples:

- O carrinho nunca toca no estoque. Ele só guarda `variant_id` +
  `quantity`.
- O estoque só é conferido e decrementado **no momento do checkout**,
  dentro de uma transação que faz `SELECT ... FOR UPDATE` nas
  variantes do carrinho antes de decidir se há estoque suficiente.

Isso significa que duas pessoas podem ter a mesma peça no carrinho ao
mesmo tempo sem nenhum conflito — o conflito só existe no instante do
checkout, e é resolvido por lock de linha do próprio banco, não por um
sistema de reserva com expiração. **Testado nesta sessão sob
concorrência real** (ver seção de verificação) — funciona, e é
significativamente mais simples de implementar e operar do que
reservas com cron de expiração. O trade-off: se duas pessoas
adicionarem a última unidade ao carrinho, a segunda só descobre que
não tem mais estoque ao tentar finalizar a compra, não antes. Avaliado
como aceitável para o volume de uma loja pequena.

A tabela `stock_reservations` do schema original continua **não
criada** — fica classificada como "só planejada", não "necessária
depois", a menos que o volume de vendas no futuro justifique reservar
estoque mais cedo (ex.: por causa de checkout abandonado com frequência).

## Decisão: escopo de pagamento restrito a PIX

O Mercado Pago suporta PIX, cartão e boleto. Esta fase implementa
**só PIX**: é a única forma que não exige tokenização de cartão no
navegador (Mercado Pago Bricks/Checkout Pro, um SDK JS adicional,
telas de formulário de cartão, tratamento de 3DS) — PIX é uma única
chamada de API que já devolve QR code pronto. Cartão/boleto ficam
como próximo passo explícito, não como algo "quase pronto".

## Decisão: sem reset de senha nem CSRF no carrinho/checkout

- **Carrinho/checkout não exigem CSRF token** (diferente do painel
  administrativo, que exige em toda mutação). Justificativa: o pior
  cenário de CSRF aqui é um item indesejado no carrinho de um
  visitante anônimo — sem conta, sem dado sensível, sem movimentação
  financeira que não dependa da própria vítima completar o pagamento.
  O cookie do carrinho é `SameSite=Lax`, o que já bloqueia a maioria
  dos cenários de POST cross-site com cookie em navegadores modernos.
  É um trade-off diferente do painel, onde uma ação administrativa
  indevida tem consequência real.

## O que foi adiado dentro da própria Fase 3

- **Cartão de crédito/débito e boleto** — só PIX, como já explicado.
- **`inventory_movements`** (tabela do schema original para
  auditoria fina de cada entrada/saída de estoque) — o checkout
  decrementa o estoque diretamente, sem gravar uma linha de
  movimento; o histórico de "quem comprou o quê" já existe via
  `order_items`, então isso é redundância de auditoria, não uma
  lacuna funcional. Fica para quando/se um relatório de estoque
  detalhado for pedido.
- **CEP → endereço automático** (busca de CEP via API dos Correios ou
  similar) — o formulário de checkout pede o endereço completo
  digitado à mão. Autocompletar por CEP é uma melhoria de UX natural,
  não implementada agora.
- **Emails além da confirmação de pedido** (pagamento aprovado,
  pedido enviado) — só o e-mail de "pedido recebido" é enfileirado
  hoje. O gancho para os outros existe (`EmailQueue::enqueue()`), só
  não foi chamado nos outros pontos do fluxo ainda.

## Verificação executada — com testes reais de concorrência

PHP e MariaDB já estavam instalados localmente desde a Fase 1
(via `winget`). Desta vez, além de aplicar as migrations e rodar
`php -l`, foram feitos testes end-to-end que dependiam de
funcionalidade nova:

- **Migrations 0012–0019** aplicadas sem erro (19 tabelas no total).
- **Carrinho**: adicionar item resolve preço no servidor
  corretamente (testado via `curl`, comparando com o preço do
  catálogo).
- **Checkout completo**: pedido criado com frete somado (R$ 25,00 do
  seed) ao subtotal, total correto, snapshot dos itens gravado,
  estoque decrementado (5 → 3 unidades testado), e-mail de confirmação
  enfileirado em `email_queue`.
- **Concorrência de estoque — o teste mais importante desta fase**:
  dois carrinhos distintos (dois cookies diferentes) com a **última
  unidade** de um produto cada, dois checkouts disparados **ao mesmo
  tempo** (`curl` em paralelo, `wait` do bash). Resultado: um pedido
  criado com sucesso, o outro recebeu `409 INSUFFICIENT_STOCK`, o
  estoque final ficou em exatamente `0` (nunca negativo), e só *um*
  `order_items` foi criado para aquela variante. O `SELECT ... FOR
  UPDATE` dentro da transação funcionou como esperado sob concorrência
  real, não só em teoria.
- **Webhook do Mercado Pago**: testado sem credenciais reais (não
  disponíveis), mas a lógica de validação e idempotência foi
  verificada — notificação sem `data.id` rejeitada (422); duas
  chamadas com o mesmo `X-Request-Id` geram só **uma** linha em
  `payment_events` (idempotência confirmada); sem `MP_ACCESS_TOKEN`
  configurado, o evento é registrado com o erro explicado em vez de
  quebrar. **O que não foi e não pôde ser testado**: a verificação de
  assinatura contra um webhook real do Mercado Pago, e a consulta de
  pagamento de verdade na API deles — precisa de credenciais sandbox.
- **Cron Jobs**: os três scripts rodam sem erro com SMTP/Mercado Pago
  não configurados (saem cedo, com mensagem clara, sem crashar); o
  lock por `flock` foi revisado no código (funciona por construção —
  os scripts desta fase rodam rápido demais para demonstrar a
  contenção de forma visível num teste manual).
- `npm run build` em `frontend/storefront` (rebuild com carrinho/
  checkout) e `frontend/admin` — TypeScript e build do Vite sem erro
  nos dois.
- `php -l` em todos os arquivos novos — sem erro.

## Não testado — precisa de credenciais reais antes de produção

- Mercado Pago de verdade (criar PIX, pagar com conta sandbox,
  confirmar via webhook real, verificar assinatura real).
- SMTP real da Hostinger (o cliente SMTP via socket foi escrito
  conforme RFC, mas nunca conectou num servidor SMTP de verdade).
- Comportamento sob Apache/LiteSpeed real (só o servidor embutido do
  PHP foi usado).

## Próximos passos antes de considerar a Fase 3 pronta para produção

1. Criar uma aplicação de teste no Mercado Pago (sandbox), configurar
   `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET`, e repetir o fluxo de
   checkout completo: gerar PIX, pagar com um usuário de teste,
   confirmar que o webhook marca o pedido como pago.
2. Configurar uma conta de e-mail real na Hostinger e confirmar que
   `backend/cron/processar-fila-email.php` envia de verdade.
3. Repetir o teste de concorrência de estoque já validado aqui, mas
   contra o ambiente real da Hostinger (garantir que o nível de
   isolamento de transação do MariaDB gerenciado pela Hostinger se
   comporta igual ao MariaDB local usado neste teste — o padrão do
   MariaDB, `REPEATABLE READ` com locking do InnoDB, deveria ser o
   mesmo, mas vale confirmar).
4. Seguir `deploy/checklist-producao.md` (seções novas: "Carrinho,
   checkout e pagamento" e "Cron Jobs").
