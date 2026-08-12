# 13 — Autenticação, permissões e segurança do admin

Complementa [06-SEGURANCA](06-SEGURANCA.md), que continua valendo integralmente
para a loja. Aqui trata-se do painel, que tem outro perfil de risco: quem entra
pode mudar preço, cancelar pedido e publicar conteúdo.

---

## 1. Duas autenticações, propositalmente separadas

| | Cliente da loja | Administração |
|---|---|---|
| Domínio | `pinceleguia.com.br` | `admin.pinceleguia.com.br` |
| Cookie | escopo do domínio da loja | escopo do subdomínio |
| Duração | 30 dias, rolante | **8 horas, sem renovação automática** |
| Cadastro | aberto | **fechado — só por convite** |
| 2FA | não | preparado (ver §5) |

**Cookies não são compartilhados entre os dois.** Cookie sem `Domain` explícito
fica restrito ao host que o emitiu — um XSS na loja não alcança a sessão do
painel. Por isso `Domain=.pinceleguia.com.br` está proibido no admin.

Sessão de 8 horas sem renovação é incômodo deliberado: o painel costuma ficar
aberto no celular, e celular se perde.

**Não existe rota pública de cadastro no admin.** O primeiro administrador
nasce de um seed protegido; os demais, de convite com token de uso único e
validade de 48h. Formulário de registro exposto num painel administrativo é
convite para força bruta.

---

## 2. RBAC: permissão é dado, não código

Papéis iniciais:

| Papel | Pode |
|---|---|
| **ADMIN** | Tudo |
| **EDITOR** | Criar e editar catálogo e conteúdo. **Não publica, não mexe em pedido, não mexe em preço.** |

A distinção que importa: EDITOR **prepara**, ADMIN **publica**. É o que torna
o fluxo de rascunho útil de verdade — alguém compõe, outro alguém aprova.

### 2.1 Catálogo de permissões

Formato `recurso.acao`:

```
Catálogo    product.view · product.create · product.update ·
            product.archive · product.delete · product.price.update
            category.* · collection.* · partner.* · inventory.adjust

Conteúdo    page.view · page.update · section.view · section.update ·
            section.publish · menu.update · banner.update · media.upload ·
            media.delete

Comércio    order.view · order.update_status · order.cancel ·
            coupon.* · customer.view

Sistema     settings.update · user.invite · user.update · audit.view
```

`product.price.update` é separado de `product.update` de propósito. Alterar
descrição e alterar preço têm consequências muito diferentes.

### 2.2 Onde a autorização acontece de verdade

Três camadas, e só a segunda é defesa real:

```
1. UI            esconde o que o usuário não pode fazer   → conveniência
2. Server Action requirePermission("section.publish")     → A DEFESA
3. Use-case      recebe o ator e registra na auditoria    → rastreabilidade
```

```ts
// packages/auth — assinatura obrigatória de toda action administrativa
export async function requirePermission(key: PermissionKey): Promise<Actor> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("sem sessão");

  const actor = await loadActorWithPermissions(session.userId);
  if (!actor.can(key)) {
    await audit.denied(actor, key);   // tentativa negada também é log
    throw new ForbiddenError(key);
  }
  return actor;
}
```

**Botão escondido não é autorização.** Se a checagem não estiver no servidor,
ela não existe — qualquer pessoa capaz de abrir o DevTools chama a action
direto. Isso já está em [06-SEGURANCA](06-SEGURANCA.md) e vale em dobro aqui.

Permissões são carregadas junto da sessão e cacheadas por request, não por
usuário — revogar acesso precisa valer no próximo clique, não no próximo login.

---

## 3. Upload: a porta mais frágil de qualquer CMS

Fluxo: o navegador pede uma URL pré-assinada, envia o arquivo direto para o R2,
e só então registra o `media` no banco. O arquivo não passa pelo nosso servidor.

**Validações, todas no servidor:**

| Camada | O quê |
|---|---|
| Permissão | `media.upload` antes de gerar a URL |
| Extensão | allowlist: `jpg`, `jpeg`, `png`, `webp`, `avif` |
| MIME declarado | precisa bater com a extensão |
| **Magic bytes** | assinatura real do arquivo, lida do conteúdo |
| Tamanho | 10 MB (foto de celular moderno passa dos 5 MB) |
| Dimensões | mínimo 400px no lado maior; máximo 8000px |
| Nome | **gerado por nós** — o nome enviado é descartado |
| Domínio | servido do R2, origem separada da aplicação |

**Magic bytes é o que importa.** Extensão e MIME são declarados pelo cliente,
logo são mentira em potencial. Ler os primeiros bytes e confirmar que aquilo é
mesmo um JPEG é a única verificação que o atacante não controla.

**SVG está fora da allowlist.** SVG é XML, aceita `<script>`, e sanitizar SVG
com segurança é notoriamente difícil. Ícone é trabalho da VORTEXIS, não upload
do painel.

**Compressão no celular, antes de enviar.** Foto de 12MP tem ~5 MB; recomprimida
para 2000px de largura fica em ~400 KB. Sem isso, cadastrar 8 produtos no 4G
vira suplício — e o requisito 32 pede que esse fluxo seja simples.

---

## 4. XSS no conteúdo administrável

O CMS existe para deixar alguém escrever conteúdo que outros vão ler. Esse é
o cenário clássico de XSS armazenado.

**Defesa por construção, não por filtro:**

1. Editor Tiptap grava **JSON estruturado**, não HTML.
2. Só os nós que habilitamos existem: parágrafo, título, lista, link, negrito,
   itálico, citação. Não há nó `script`, `iframe` ou `style`.
3. A renderização percorre a árvore e emite React — **sem
   `dangerouslySetInnerHTML`**.
4. Link passa por validação de protocolo: `https` e mailto apenas.

O único `dangerouslySetInnerHTML` do projeto continua sendo o JSON-LD da página
de produto, que é gerado por nós a partir do banco, não de entrada de usuário.

---

## 5. Demais controles

**Rate limiting** — login do admin: 5 tentativas / 15 min por IP *e* por
e-mail. Convite: 10/hora. Upload: 100/hora por usuário. Publicação: 30/hora.

**CSP do admin** mais restritiva que a da loja: sem `unsafe-inline`, sem
`unsafe-eval`, `frame-ancestors 'none'`, imagens só do R2.

**Painel fora dos buscadores:** `X-Robots-Tag: noindex, nofollow` no subdomínio
inteiro, mais `robots.txt` bloqueando tudo.

**2FA (TOTP)** — preparado, não implementado agora. Better Auth tem plugin;
o schema já comporta. Ativar quando houver mais de um usuário administrativo,
ou antes disso se o cliente quiser.
> DECISÃO PENDENTE: entra na v1 ou fica para depois do go-live?

**Preview protegido** — a URL de pré-visualização carrega conteúdo não
publicado. Acesso por cookie assinado, emitido apenas para sessão autenticada,
válido por 30 minutos, e a resposta é sempre `noindex` e `no-store`.
Sem isso, um link de preview vazado expõe campanha não lançada.

---

## 6. Auditoria

Registrar **toda** operação que altere estado do negócio ou do conteúdo:

```
[14/03 09:12] Andreia (ADMIN)   product.price.update
              "Prato Iemanjá"   R$ 157,00 → R$ 169,00

[14/03 09:20] Andreia (ADMIN)   section.publish
              Home, revisão #12 "adicionei seção Guias artesanais"

[14/03 11:05] Maria (EDITOR)    section.publish  ❌ NEGADO
```

Tentativa negada também vira log — é o primeiro sinal de credencial
comprometida ou de permissão mal atribuída.

**Nunca registrar:** senha, hash, token de sessão, segredo de gateway, número
de cartão, CPF completo. O `changes` grava apenas os campos que mudaram, e uma
allowlist define quais campos podem aparecer.

Retenção: 12 meses no banco. Antes disso, exportação para arquivo frio se
houver exigência contábil.
> DECISÃO PENDENTE: há exigência de retenção mais longa? (pergunta ao contador
> do cliente, não a nós)

---

## 7. Ações destrutivas

Requisito 29. Ordem de preferência:

```
desativar  →  arquivar  →  soft delete  →  exclusão física
```

Exclusão física fica reservada a rascunho nunca publicado e mídia sem uso.
Nada que já apareceu para um cliente, ou que esteja referenciado por pedido,
é apagável — o histórico do pedido depende disso.

Confirmação proporcional ao dano:

| Ação | Confirmação |
|---|---|
| Desativar produto | Botão com desfazer |
| Remover seção do rascunho | Diálogo simples |
| Arquivar categoria com produtos | Diálogo listando o que será afetado |
| Cancelar pedido pago | Digitar o número do pedido |
| Excluir mídia em uso | **Bloqueado**, com a lista de onde é usada |

---

## 8. Autosave e o que "salvo" significa

Requisito 30. A distinção precisa estar visível o tempo todo, porque é a
diferença entre o cliente ver e não ver:

```
● Rascunho salvo às 14:32        ← automático, a cada 5s de inatividade
○ Publicado em 12/03 às 09:15    ← manual, explícito, irreversível-ish
```

Autosave grava **apenas na revisão DRAFT**. Nenhum caminho de código publica
sozinho. Se a conexão cair no meio, o rascunho local é preservado e
reconciliado na volta — sem sobrescrever alteração mais nova feita de outro
dispositivo (comparação por `updatedAt`).
