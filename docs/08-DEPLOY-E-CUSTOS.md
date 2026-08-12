# 08 — Deploy, Ambientes e Custos

## Ambientes

| Ambiente | Uso | Banco | Gateway |
|---|---|---|---|
| Local | Desenvolvimento | Branch Neon de dev | Mercado Pago **sandbox** |
| Preview | Um por Pull Request | Branch Neon efêmera | Sandbox |
| Produção | Loja no ar | Neon produção | Credenciais **de produção** |

Credenciais nunca são compartilhadas entre ambientes. Sandbox jamais aponta para o banco de produção.

## Pipeline

```
push → GitHub
  ├─ CI: typecheck · lint · testes unitários · testes de integração · build
  ├─ Preview automático na Vercel (URL própria por PR)
  └─ merge na main → migrations → deploy de produção → smoke test
```

Migrations rodam **antes** do deploy da aplicação, e só migrations aditivas em produção (adicionar coluna, nunca dropar numa release). Remoção de coluna acontece numa release seguinte, depois que nenhum código a referencia — evita o downtime clássico de deploy com schema incompatível.

## Backup e recuperação

- Neon: point-in-time recovery (7 dias no plano pago; verificar limite do free tier).
- Dump semanal adicional para armazenamento independente do fornecedor — backup que só existe dentro do próprio provedor não é backup.
- **Restauração precisa ser testada de verdade antes do go-live.** Backup nunca testado é uma suposição, não uma garantia.

## Observabilidade

| O quê | Ferramenta | Alerta |
|---|---|---|
| Erros de aplicação | Sentry | E-mail imediato em erro de checkout ou webhook |
| Uptime | Better Stack / UptimeRobot | Ping em `/api/health` a cada 5 min |
| Webhooks falhados | Consulta em `payment_events` | Relatório diário de eventos não processados |
| Pedidos travados | Job de reconciliação | `PENDING_PAYMENT` há mais de 1h |
| Estoque baixo | Dashboard do admin | Destaque quando `stock <= 2` |
| Web Vitals | Vercel Analytics | — |

## Custos externos recorrentes

Estimativa para o volume inicial (dezenas de pedidos/mês). Valores de referência — **confirmar na contratação**.

| Item | Plano inicial | Custo estimado/mês |
|---|---|---|
| Vercel | Hobby (uso não comercial) → **Pro** | **US$ 0 → US$ 20** |
| Neon (Postgres) | Free → Launch | US$ 0 → US$ 19 |
| Cloudflare R2 | 10 GB grátis, **egress zero** | US$ 0 |
| Resend (e-mail) | 3.000/mês grátis | US$ 0 |
| Sentry | Developer | US$ 0 |
| Upstash Redis | Free tier | US$ 0 |
| Domínio `.com.br` | Registro.br | ~R$ 40 / ano |
| **Infraestrutura inicial** | | **~US$ 0–20/mês** |

> ⚠️ **Atenção ao plano Hobby da Vercel:** ele proíbe uso comercial. Uma loja que vende exige o plano **Pro (US$ 20/mês)**. Isso não é opcional — é termo de uso.

### Custo variável — taxas de pagamento

Não são custo de infraestrutura, mas entram na margem do cliente:

| Meio | Taxa aproximada (Mercado Pago) |
|---|---|
| PIX | ~0,99% |
| Cartão à vista (recebimento em 14 dias) | ~4,98% |
| Cartão parcelado | maior, varia por prazo |

Taxas mudam com frequência e por perfil de conta. **Confirmar as taxas vigentes direto com o Mercado Pago antes de definir preço de venda.** Melhor Envio cobra pelo frete efetivamente contratado.

### Alternativa VPS (se o custo em dólar incomodar)

Hetzner CX22 ou Contabo ~R$ 30–60/mês, com Docker + Postgres + Nginx + Caddy. Custo previsível em real, mas transfere para a VORTEXIS: atualização de sistema, certificado TLS, backup, monitoramento e resposta a incidente. A arquitetura proposta roda nos dois cenários sem alteração de código — é uma decisão de operação, não de software. Recomendação: começar serverless e migrar só se o volume justificar.

## Domínio e e-mail

> DECISÃO PENDENTE: domínio definitivo (`pinceleguia.com.br`?) e quem faz o registro.

Ao configurar o domínio, configurar também **SPF, DKIM e DMARC** para os e-mails transacionais. Sem isso, confirmação de pedido cai em spam — e o cliente conclui, com razão, que a loja não funciona.

## Go-live — checklist

- [ ] Domínio apontado, HTTPS ativo, `www` redirecionando
- [ ] Credenciais de produção do Mercado Pago configuradas e testadas com uma compra real de valor baixo
- [ ] Webhook de produção registrado e verificado
- [ ] SPF/DKIM/DMARC configurados e e-mail de teste chegando na caixa de entrada
- [ ] Backup automático ativo e restauração testada
- [ ] Sentry e monitoramento de uptime ativos
- [ ] Sitemap enviado ao Google Search Console
- [ ] Conteúdo jurídico real publicado (políticas e termos do cliente)
- [ ] Produtos reais cadastrados com fotos definitivas
- [ ] Fluxo completo testado em dispositivo móvel real, não só no emulador
- [ ] Treinamento do cliente no painel administrativo realizado
