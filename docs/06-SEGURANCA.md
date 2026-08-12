# 06 — Segurança

Este é o documento mais importante do conjunto. Vamos lidar com dados pessoais, endereços, pedidos e pagamentos de clientes reais.

## Autenticação

- **Better Auth** com sessões persistidas em banco (revogáveis), não JWT stateless.
- Cookie de sessão: `httpOnly`, `secure`, `sameSite: lax`, `path: /`.
- Hash de senha: **Argon2id** (ou scrypt), com salt por usuário. Nunca MD5, SHA-1 ou SHA-256 puro.
- Política mínima: 8 caracteres, com bloqueio das senhas mais comuns. Sem exigência de símbolo obrigatório (regras barrocas produzem senhas piores e anotadas no papel).
- Sessão de cliente: 30 dias com rolagem. **Sessão de admin: 8 horas**, sem rolagem indefinida.
- Recuperação de senha: token de uso único, 32 bytes aleatórios, hash guardado no banco, expira em 1 hora, invalidado após uso. A resposta é idêntica para e-mail existente ou não — **não vazamos quais e-mails têm conta**.
- Trocar a senha invalida todas as outras sessões do usuário.

## Autorização

Duas roles: `CUSTOMER` e `ADMIN`. Verificação em **três camadas independentes**:

1. **Middleware** — bloqueia `/admin/*` e `/minha-conta/*` sem sessão válida. É conveniência de UX, não é a defesa.
2. **Server Action / Route Handler** — `requireAdmin()` no início de toda action administrativa. **Esta é a defesa real.**
3. **Camada de dados** — consultas de cliente sempre filtram por `userId` da sessão. Um cliente pedindo `/minha-conta/pedidos/PG-2026-000999` recebe 404 se o pedido não for dele — nunca 403, que confirmaria a existência.

```ts
// padrão obrigatório em toda action de admin
export async function updateProduct(input: unknown) {
  const session = await requireAdmin();           // 1. autorização
  const data = updateProductSchema.parse(input);  // 2. validação
  return productService.update(data, session.user.id); // 3. execução auditada
}
```

**Nunca confiar no frontend para autorização.** Esconder um botão no React não protege nada; o que protege é a verificação no servidor.

## Validação e sanitização

- **Todo** dado que cruza a fronteira do sistema passa por Zod: formulários, query strings, params de rota, corpos de webhook, variáveis de ambiente.
- Validação no cliente existe só para UX. A do servidor é a que vale, e roda sempre.
- **SQL Injection**: Prisma parametriza tudo. Nos poucos `$executeRaw` (baixa de estoque) usamos template tags parametrizadas, nunca concatenação de string.
- **XSS**: React escapa por padrão. `dangerouslySetInnerHTML` só é usado para o conteúdo das páginas institucionais, e passa por **DOMPurify** no servidor antes de salvar e antes de renderizar.
- **Upload de imagem**: tipo MIME e magic bytes verificados, extensão em allowlist (`jpg`, `png`, `webp`), limite de 5 MB, nome de arquivo gerado por nós (nunca o nome enviado pelo usuário), armazenamento em domínio separado do da aplicação.
- **Mass assignment**: schemas Zod usam allowlist explícita de campos. Nada de `prisma.update({ data: req.body })`.

## CSRF

Server Actions do Next.js já validam origem por padrão. Reforços:

- `sameSite: lax` nos cookies de sessão.
- Verificação de header `Origin` nos Route Handlers que mutam estado.
- Webhooks são exceção justificada: não usam cookie e são autenticados por assinatura HMAC.

## Rate limiting

Por IP e, quando aplicável, por conta:

| Endpoint | Limite |
|---|---|
| Login | 5 tentativas / 15 min por IP + por e-mail |
| Cadastro | 3 / hora por IP |
| Recuperação de senha | 3 / hora por e-mail |
| Criação de pedido | 10 / hora por sessão |
| Aplicação de cupom | 10 / hora por sessão |
| Busca / autocomplete | 60 / min por IP |
| Consulta de CEP | 30 / min por IP |

Implementação: Upstash Redis (free tier) ou tabela no Postgres com janela deslizante para o volume inicial.

## Headers de segurança

Configurados em `next.config.ts` / middleware:

```
Content-Security-Policy       (default-src 'self'; permitindo apenas os domínios
                               do Mercado Pago e do CDN de imagens)
Strict-Transport-Security     max-age=63072000; includeSubDomains; preload
X-Content-Type-Options        nosniff
X-Frame-Options               DENY
Referrer-Policy               strict-origin-when-cross-origin
Permissions-Policy            camera=(), microphone=(), geolocation=()
```

CSP com `nonce` para os scripts inline necessários. Sem `unsafe-eval`.

## Segredos

- **Nada** de credencial no repositório. `.env` no `.gitignore` desde o primeiro commit.
- `.env.example` com todas as chaves e valores vazios, documentado.
- Validação em boot: `lib/env.ts` faz parse com Zod e **derruba a aplicação** se faltar variável obrigatória. Melhor falhar no deploy do que na primeira compra.
- Apenas variáveis `NEXT_PUBLIC_*` chegam ao navegador — e nenhuma delas é secreta. A public key do Mercado Pago é, por design, pública; o access token **nunca** sai do servidor.
- Ambientes com credenciais separadas (sandbox em dev/preview, produção só em produção).
- Rotação de segredos documentada no README, com data da última rotação.

## Logs

- Log estruturado em JSON, com `requestId` para correlação.
- **Redação obrigatória** de: senha, token, cookie, header `authorization`, número de cartão, CVV, CPF completo, `access_token` do gateway.
- E-mail e telefone aparecem mascarados em log de aplicação (`jo***@gmail.com`).
- Payload de webhook é gravado com dados sensíveis removidos.
- Sentry configurado com `beforeSend` que filtra PII.
- `admin_audit_log` registra toda ação sensível: quem mudou preço, quem cancelou pedido, quem ajustou estoque, de qual IP.

## LGPD

- Consentimento explícito de cookies não essenciais (banner só se houver analytics/marketing).
- Direito de acesso: exportação dos dados pessoais na área do cliente.
- Direito de exclusão: anonimização do usuário, **preservando o snapshot fiscal do pedido** (obrigação legal de guarda que se sobrepõe ao direito de eliminação).
- Política de privacidade real precisa vir do cliente — ver [10-DECISOES-PENDENTES](10-DECISOES-PENDENTES.md).

## Checklist antes de ir para produção

- [ ] `.env` nunca versionado; histórico do Git verificado com `git-secrets`
- [ ] Credenciais de produção diferentes das de sandbox
- [ ] Assinatura de webhook verificada e testada com payload forjado
- [ ] Rate limiting ativo em login, cadastro e recuperação de senha
- [ ] Headers de segurança verificados em securityheaders.com
- [ ] HTTPS obrigatório, HSTS ativo
- [ ] `npm audit` sem vulnerabilidade alta ou crítica
- [ ] Nenhum `console.log` com dado pessoal
- [ ] Backup automático do banco com restauração testada de verdade
- [ ] Primeiro admin criado por seed protegido, não por rota pública
- [ ] Teste de autorização: cliente A não consegue ver pedido do cliente B
- [ ] Teste de manipulação: alterar preço no DevTools não altera o total cobrado
