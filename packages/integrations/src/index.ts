/**
 * Integrações com serviços externos.
 *
 * Cada uma existe atrás de uma interface: trocar de fornecedor é
 * escrever um adapter, não reescrever o sistema. Ver docs/02 §3.
 *
 * Hoje: armazenamento.
 * Previstos: pagamento (FASE 8), frete (FASE 8), e-mail (FASE 8).
 */
export * from "./storage/index";
