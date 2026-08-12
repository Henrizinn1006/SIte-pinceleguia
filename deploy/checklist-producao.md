# Checklist de publicação — Fases 1 a 4

Itens que fazem sentido para o que as Fases 1 a 4 entregam: catálogo
público, painel administrativo, carrinho/checkout/PIX/e-mail, operação
de pedidos, cupons, clientes e auditoria. Cartão/boleto e cadastro de
cliente com login ficam fora — ainda não existem em código.

## Infraestrutura

- [ ] Nenhum processo Node é necessário em produção (o site abre com
      Node desligado na sua máquina de teste).
- [ ] Nenhuma conexão PostgreSQL é necessária (o `.env` de produção não
      tem `DATABASE_URL` do Postgres).
- [ ] `docker-compose.yml` desligado não afeta a versão publicada.
- [ ] O site abre direto pela URL da Hostinger, sem VPN/whitelist.

## Roteamento

- [ ] Atualizar a página numa rota interna (`/loja`, `/produto/algum-slug`,
      `/categoria/orixas`) não causa 404 — testar dando F5 direto nessas
      URLs, não só navegando por link.
- [ ] `sitemap.xml` responde com XML válido e lista produtos/categorias
      reais do banco.
- [ ] `robots.txt` responde e bloqueia `/admin`, `/api/`, `/carrinho`,
      `/checkout`, `/minha-conta`, `/busca`, `/entrar`, `/cadastro`,
      `/recuperar-senha` (rotas reservadas para fases futuras).

## Dados

- [ ] Catálogo (categorias, produtos, imagens, variações) vem do
      MariaDB — não há dado hardcoded no frontend.
- [ ] Preço exibido bate entre a API (`GET /api/produtos/{slug}`) e o
      que a página React renderiza (mesma regra de
      `backend/src/Catalog/Pricing.php`, testada em
      `backend/tests/PricingTest.php`).
- [ ] Produto com `salePriceInCents` fora da janela `saleStartsAt`/
      `saleEndsAt` mostra o preço cheio, não o promocional.
- [ ] Produto com estoque zerado (soma de todas as variantes) mostra
      "Esgotado" e não permite indicar disponibilidade falsa.

## Segurança

- [ ] `.env` não está acessível por URL.
- [ ] `backend/storage/logs/` e `backend/storage/uploads/` não
      executam PHP (testar enviando uma URL apontando para um arquivo
      `.php` dentro dessas pastas — deve dar 403).
- [ ] Respostas de erro da API seguem o formato
      `{"error": {"code", "message"}}` — nunca stack trace, nunca SQL,
      nunca caminho de arquivo do servidor (testar com
      `APP_DEBUG=false` no `.env` de produção).
- [ ] Headers de segurança presentes (`X-Content-Type-Options`,
      `X-Frame-Options`, `Referrer-Policy`) — conferir na aba Network
      do navegador.
- [ ] HTTPS ativo e forçado (acessar via `http://` redireciona para
      `https://`).

## Painel administrativo

- [ ] Login funciona com credenciais corretas e é recusado com
      mensagem genérica ("e-mail ou senha inválidos") tanto para
      e-mail inexistente quanto para senha errada — nunca revelar qual
      dos dois está errado.
- [ ] Cookie de sessão (`pg_admin_session`) tem `HttpOnly`, `Secure` e
      `SameSite=Lax` (conferir na aba Application/Cookies do
      DevTools) — só aparece com `Secure` se o acesso já for HTTPS.
- [ ] Logout invalida a sessão no banco (tentar reusar o cookie salvo
      antes do logout deve dar 401 na próxima chamada a `/api/admin/eu`).
- [ ] Mutação (criar/editar/excluir categoria ou produto) sem o header
      `X-CSRF-Token`, ou com um token errado, é rejeitada com 403.
- [ ] Acessar qualquer `/api/admin/*` sem sessão válida retorna 401;
      chamar com `Origin`/`Referer` de outro domínio (quando
      `PUBLIC_SITE_URL` está configurado) retorna 403.
- [ ] 6 tentativas de login seguidas com senha errada (mesmo e-mail ou
      mesmo IP) bloqueiam a 6ª com 429 — testar e depois confirmar que
      o bloqueio expira depois de ~15 minutos (ver
      `backend/src/Auth/RateLimiter.php`).
- [ ] Toda ação administrativa (login, login falho, criar/editar/
      excluir categoria/produto, alterar estoque, mudar configuração)
      aparece em `audit_logs` com o `user_email` correto.
- [ ] Upload de imagem: um arquivo `.php` renomeado para `.jpg` é
      rejeitado (assinatura real do arquivo não bate com imagem);
      arquivo maior que 5 MB é rejeitado; a URL final da imagem salva
      NUNCA executa PHP mesmo se você tentar acessar
      `/uploads/produtos/<algo>.php` diretamente.
- [ ] Excluir uma categoria com produtos ativos é bloqueado com
      mensagem clara, não com erro genérico de banco.
- [ ] `/admin` e `/admin/*` respondem com `X-Robots-Tag: noindex,
      nofollow` e um `Content-Security-Policy` presente.

## Carrinho, checkout e pagamento

- [ ] Preço mostrado no carrinho/checkout bate com o que a API calcula
      em `App\Checkout\CheckoutService` — nunca aceitar preço vindo do
      navegador (testado nesta sessão: `GET /api/carrinho` sempre
      resolve o preço via `Pricing`, o carrinho no banco só guarda
      quantidade).
- [ ] **Duas compras concorrentes da última unidade**: só uma consegue
      finalizar; a outra recebe 409 `INSUFFICIENT_STOCK`; o estoque
      final nunca fica negativo (testado nesta sessão com 2
      requisições simultâneas reais contra um MariaDB — passou).
- [ ] Checkout sem `MP_ACCESS_TOKEN` configurado ainda cria o pedido
      (não trava a venda), só sem PIX disponível — testar que a
      página de pedido mostra o aviso "pagamento ainda não disponível"
      em vez de travar ou mostrar erro genérico.
- [ ] **Com Mercado Pago configurado** (fazer antes de aceitar
      pagamento real, com conta sandbox): checkout gera QR code PIX
      de verdade; pagar com uma conta de teste confirma o pedido via
      webhook; webhook reenviado (simular reenvio manual) não duplica
      a confirmação nem gera um segundo e-mail.
- [ ] Assinatura do webhook rejeitada (header `x-signature` ausente ou
      errado, com `MP_WEBHOOK_SECRET` configurado) retorna 403.
- [ ] Pedido criado aparece em `order_status_history` com a transição
      inicial (`null → PENDING_PAYMENT`); confirmar pagamento gera uma
      segunda linha (`PENDING_PAYMENT → PAID`).
- [ ] Tentar transicionar um pedido para um status inválido (ex.
      `DELIVERED → PENDING_PAYMENT`) é bloqueado por
      `App\Orders\OrderStateMachine` — não existe endpoint público
      para isso ainda, mas vale confirmar ao construir a Fase 4.
- [ ] Rastreamento de pedido (`/pedido/{token}`) funciona sem login;
      token inválido retorna página 404, não vaza detalhe de outro
      pedido.
- [ ] E-mail de confirmação é enfileirado em `email_queue` no
      checkout (testado nesta sessão — confirmar apenas que o cron de
      envio de fato manda o e-mail, não testado contra SMTP real).

## Cron Jobs

- [ ] `limpar-sessoes-expiradas.php`, `processar-fila-email.php` e
      `reconciliar-pagamentos-pendentes.php` rodando conforme a
      frequência do README-HOSTINGER.md.
- [ ] Dois disparos simultâneos do mesmo cron: o segundo sai
      imediatamente ("já em execução"), não roda em paralelo com o
      primeiro (lock por `flock`).
- [ ] PIX expirado sem pagamento: `reconciliar-pagamentos-pendentes.php`
      cancela o pedido **e devolve o estoque** — testar criando um
      pedido, simulando expiração, e conferindo que o estoque da
      variante volta ao valor anterior.

## Pedidos, cupons, clientes e auditoria (painel)

- [ ] Mudança de status segue a máquina de estados
      (`App\Orders\OrderStateMachine`) — transição inválida (ex.
      `DELIVERED → PENDING_PAYMENT`) é bloqueada com 409 (testado
      nesta sessão: `PAID → PENDING_PAYMENT` corretamente rejeitado).
- [ ] Cancelar um pedido `PAID`/`PREPARING` pelo painel **devolve o
      estoque** das variantes (testado nesta sessão: estoque voltou ao
      valor original após cancelamento).
- [ ] Toda mudança de status, criação/edição/exclusão de cupom e
      alteração de nota interna aparece em `audit_logs`.
- [ ] Cupom com pedido abaixo do `min_order_in_cents` é rejeitado com
      `COUPON_INVALID` (testado nesta sessão).
- [ ] Cupom expirado ou com `usage_limit` atingido é rejeitado com
      `COUPON_EXPIRED`.
- [ ] Cupom aplicado no checkout: `discountInCents` do pedido bate com
      o cálculo (percentual arredondado para baixo, ou valor fixo,
      nunca descontando mais que o subtotal) — testado nesta sessão
      com cupom de 10%.
- [ ] Cupom código é case-insensitive (`demo10` e `DEMO10` funcionam
      igual) — testado nesta sessão.
- [ ] Tela de clientes soma corretamente o total gasto por e-mail,
      excluindo pedidos cancelados do total.

## Frontend

- [ ] Responsividade e acessibilidade do design atual foram
      preservadas (menu mobile com foco preso e Esc funcionando, alvo
      de toque mínimo de 44px, contraste da paleta — mesmos critérios
      de `docs/07-DESIGN-SYSTEM.md` do projeto original).
- [ ] Lighthouse executado (Chrome DevTools → Lighthouse) contra a URL
      publicada — registrar os 4 scores (Performance, Acessibilidade,
      Boas práticas, SEO) neste checklist antes de considerar a fase
      concluída.
- [ ] Estados de carregamento, vazio e erro aparecem corretamente
      (testar uma busca sem resultado, uma categoria sem produtos, e
      a API fora do ar — desligar o banco momentaneamente numa cópia
      de teste).

## Backup

- [ ] Backup do banco exportado e restaurado com sucesso num banco de
      teste separado (ver README-HOSTINGER.md, item 15).

## Rollback

Se algo quebrar após a publicação: o domínio pode voltar a apontar
para o Next.js atual (se ele já estava publicado em algum lugar) sem
qualquer alteração de dados, já que este é um banco/deploy
**paralelo** — nenhuma migration desta fase altera o Postgres/Prisma
existente. Documentar aqui, antes de publicar, qual era o estado
anterior (DNS, versão publicada) para poder reverter rapidamente.
