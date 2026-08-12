"use client";

import { useEffect, useState } from "react";
import { Icone } from "./icones";

/**
 * Registro do service worker e aviso de nova versão.
 *
 * A atualização é sempre VOLUNTÁRIA. `skipWaiting` automático troca o
 * código enquanto a pessoa preenche um formulário — e ela perde o que
 * estava fazendo. Ver docs/15-PWA-CACHE.md §1.5
 */
export function RegistroDoServiceWorker() {
  const [aguardando, setAguardando] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelado = false;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registro) => {
        if (cancelado) return;

        if (registro.waiting) setAguardando(registro.waiting);

        registro.addEventListener("updatefound", () => {
          const novo = registro.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            // Só avisa se JÁ havia um SW ativo — na primeira instalação
            // não existe "nova versão", existe a versão.
            if (novo.state === "installed" && navigator.serviceWorker.controller) {
              setAguardando(novo);
            }
          });
        });
      })
      .catch((erro) => console.error("[pwa] falha ao registrar", erro));

    let recarregando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    });

    return () => {
      cancelado = true;
    };
  }, []);

  if (!aguardando) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-50 flex items-center gap-3 rounded-md border border-beige-dark bg-warm-white px-4 py-3 shadow-medium lg:inset-x-auto lg:right-4 lg:bottom-4 lg:max-w-sm"
    >
      <p className="flex-1 text-sm">Uma nova versão do painel está disponível.</p>
      <button
        type="button"
        onClick={() => aguardando.postMessage({ tipo: "ATUALIZAR_AGORA" })}
        className="min-h-10 shrink-0 rounded-sm bg-caramel-deep px-4 text-sm font-medium text-warm-white"
      >
        Atualizar
      </button>
    </div>
  );
}

/**
 * Aviso de conexão perdida.
 *
 * Não fingimos que funciona offline: o painel avisa e bloqueia, em vez
 * de aceitar uma alteração que talvez nunca chegue ao servidor.
 */
export function AvisoDeConexao() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-sm text-warning"
    >
      <Icone nome="wifiOff" className="size-4 shrink-0" />
      Sem conexão — alterações não serão salvas até a internet voltar.
    </div>
  );
}
