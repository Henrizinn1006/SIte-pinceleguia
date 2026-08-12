import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { trackOrder } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useAsync } from "@/lib/use-async";
import { useDocumentHead } from "@/lib/head";
import type { PixPayment } from "@/lib/types";
import { NotFoundPage } from "./not-found";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento confirmado",
  PREPARING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const STATUS_TONE: Record<string, "neutral" | "gold" | "success" | "danger" | "warning"> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  PREPARING: "gold",
  SHIPPED: "gold",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "danger",
};

/**
 * Acompanhamento de pedido por visitante (sem login), via
 * `trackingToken` — mesmo mecanismo do schema original
 * (`Order.trackingToken`). Se veio direto do checkout
 * (`location.state.payment`), mostra o QR code do PIX; se a pessoa só
 * abriu o link depois, mostra apenas o status (o QR/código de cópia e
 * cola não é reexibido — evita mostrar um código que pode já ter
 * expirado sem consultar o gateway de novo, o que só o cron de
 * reconciliação faz).
 */
export function PedidoPage() {
  const { token = "" } = useParams<{ token: string }>();
  const location = useLocation();
  const payment = (location.state as { payment?: PixPayment } | null)?.payment ?? null;

  const order = useAsync(() => trackOrder(token), [token]);
  const [copied, setCopied] = useState(false);

  useDocumentHead(order.data ? `Pedido ${order.data.orderNumber} | Pincel & Guia` : "Pedido | Pincel & Guia");

  if (!order.loading && order.error) {
    return <NotFoundPage />;
  }

  if (!order.data) {
    return (
      <Container className="py-12">
        <p className="text-ink-muted">Carregando…</p>
      </Container>
    );
  }

  const o = order.data;

  return (
    <Container size="narrow" className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 font-serif">Pedido {o.orderNumber}</h1>
        <Badge tone={STATUS_TONE[o.status] ?? "neutral"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
      </div>

      {payment?.qrCode && o.status === "PENDING_PAYMENT" && (
        <section className="mt-8 rounded-md bg-beige/40 p-6 text-center">
          <h2 className="font-serif text-lg text-ink">Pague com PIX para confirmar o pedido</h2>
          {payment.qrCodeBase64 && (
            <img
              src={`data:image/png;base64,${payment.qrCodeBase64}`}
              alt="QR code do PIX"
              width={220}
              height={220}
              className="mx-auto mt-4 rounded-sm bg-white p-2"
            />
          )}
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(payment.qrCode ?? "");
              setCopied(true);
            }}
            className="mx-auto mt-4 block max-w-full truncate rounded-sm border border-beige-dark bg-warm-white px-4 py-2 text-xs text-ink-muted"
            title="Clique para copiar"
          >
            {copied ? "Código copiado!" : payment.qrCode}
          </button>
          <p className="mt-3 text-xs text-ink-muted">
            Assim que o pagamento for aprovado, esta página atualiza automaticamente ao ser recarregada.
          </p>
        </section>
      )}

      {o.status === "PENDING_PAYMENT" && !payment?.qrCode && (
        <section className="mt-8 rounded-md border border-warning/40 bg-warning/8 px-5 py-4 text-sm text-ink">
          <p className="font-medium text-warning">Pagamento ainda não disponível</p>
          <p className="mt-1 text-ink-muted">
            O pagamento por PIX não pôde ser gerado agora (configuração pendente). Guarde o link desta página — entraremos em
            contato pelo e-mail informado.
          </p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-lg text-ink">Itens</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {o.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-3 border-b border-beige pb-3 text-sm">
              <span>
                {item.productName} ×{item.quantity}
              </span>
              <span className="text-ink-muted">{formatMoney(item.subtotalInCents)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span>{formatMoney(o.subtotalInCents)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Frete</span>
            <span>{formatMoney(o.shippingInCents)}</span>
          </div>
          {o.discountInCents > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>Desconto</span>
              <span>-{formatMoney(o.discountInCents)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium text-ink">
            <span>Total</span>
            <span>{formatMoney(o.totalInCents)}</span>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg text-ink">Entrega</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {o.shippingAddress.street}, {o.shippingAddress.number}
          {o.shippingAddress.complement ? ` — ${o.shippingAddress.complement}` : ""}
          <br />
          {o.shippingAddress.district}, {o.shippingAddress.city}/{o.shippingAddress.state} — {o.shippingAddress.zipCode}
        </p>
      </section>

      <p className="mt-10 text-xs text-ink-muted">
        Guarde o link desta página para acompanhar o pedido — enviado também para {o.customerEmail}.
      </p>
    </Container>
  );
}
