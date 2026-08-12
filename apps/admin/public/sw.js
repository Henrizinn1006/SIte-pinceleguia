/**
 * Service worker do Pincel & Guia Admin.
 *
 * ⚠️ REGRA CENTRAL: o cache guarda a CASCA, nunca o CONTEÚDO.
 *
 * Layout, CSS e JavaScript podem vir do disco. Preço, estoque e pedido
 * vêm do servidor ou não vêm. Um painel que mostra estoque em cache faz
 * a proprietária decidir com base em dado velho — e vender peça que já
 * não existe. Ver docs/15-PWA-CACHE.md
 *
 * Escrito à mão, sem Workbox: são ~80 linhas e cada uma é auditável.
 * Uma dependência a menos numa superfície que pode servir código antigo.
 */

const VERSAO = "v1";
const CACHE_ESTATICO = `pg-admin-estatico-${VERSAO}`;

/** Só o que é imutável ou puramente visual. */
const PRE_CACHE = ["/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_ESTATICO).then((cache) => cache.addAll(PRE_CACHE)),
  );
  // NÃO chamamos skipWaiting aqui: trocar o código sob os pés de quem
  // está no meio de um formulário é o jeito mais rápido de perder
  // trabalho. A troca é voluntária — ver AtualizadorDeVersao.
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((c) => c.startsWith("pg-admin-") && c !== CACHE_ESTATICO)
            .map((c) => caches.delete(c)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Mensagem vinda da página quando a pessoa clica em "Atualizar". */
self.addEventListener("message", (evento) => {
  if (evento.data?.tipo === "ATUALIZAR_AGORA") self.skipWaiting();
});

function ehAssetEstatico(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  const url = new URL(requisicao.url);

  // Nunca tocar em outra origem, nem em nada que não seja GET.
  // POST é mutação — jamais vai para fila offline.
  if (url.origin !== self.location.origin) return;
  if (requisicao.method !== "GET") return;

  // Assets versionados por hash: cache primeiro, é imutável.
  if (ehAssetEstatico(url)) {
    evento.respondWith(
      caches.match(requisicao).then(
        (emCache) =>
          emCache ??
          fetch(requisicao).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE_ESTATICO).then((c) => c.put(requisicao, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  // TODO O RESTO — páginas, dados, ações — é rede, sempre.
  // Sem conexão, mostramos a página de offline em vez de inventar
  // uma resposta com dado antigo.
  evento.respondWith(
    fetch(requisicao).catch(() => {
      if (requisicao.mode === "navigate") return caches.match("/offline");
      return new Response("", { status: 503, statusText: "Sem conexão" });
    }),
  );
});
