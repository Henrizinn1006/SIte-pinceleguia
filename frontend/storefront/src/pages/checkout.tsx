import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ApiError, checkout } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import { useDocumentHead } from "@/lib/head";

interface FormState {
  name: string;
  email: string;
  phone: string;
  document: string;
  note: string;
  couponCode: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

const EMPTY: FormState = {
  name: "", email: "", phone: "", document: "", note: "", couponCode: "",
  zipCode: "", street: "", number: "", complement: "", district: "", city: "", state: "",
};

/**
 * Checkout como visitante — sem conta, sem login. Todo preço mostrado
 * aqui é só uma prévia; o valor de verdade (incluindo frete) é
 * recalculado no servidor em App\Checkout\CheckoutService, e é o que
 * volta na resposta e vira o pedido.
 */
export function CheckoutPage() {
  useDocumentHead("Checkout | Pincel & Guia");
  const { cart, loading } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && (!cart || cart.items.length === 0)) {
    return <Navigate to="/carrinho" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await checkout({
        name: form.name,
        email: form.email,
        phone: form.phone,
        document: form.document || undefined,
        note: form.note || undefined,
        couponCode: form.couponCode || undefined,
        shipping: {
          zipCode: form.zipCode,
          street: form.street,
          number: form.number,
          complement: form.complement || undefined,
          district: form.district,
          city: form.city,
          state: form.state,
        },
      });
      navigate(`/pedido/${result.order.trackingToken}`, { state: { justCreated: true, payment: result.payment } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível finalizar o pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container className="py-12">
      <h1 className="text-h1 font-serif">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && <p className="rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <fieldset className="flex flex-col gap-3">
            <legend className="font-serif text-lg text-ink">Seus dados</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              <Field label="Telefone/WhatsApp" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
              <Field label="CPF (opcional, agiliza o PIX)" value={form.document} onChange={(v) => setForm({ ...form, document: v })} />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="font-serif text-lg text-ink">Endereço de entrega</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="CEP" value={form.zipCode} onChange={(v) => setForm({ ...form, zipCode: v })} required />
              <Field label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required className="sm:col-span-2" />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Rua" value={form.street} onChange={(v) => setForm({ ...form, street: v })} required />
              <Field label="Número" value={form.number} onChange={(v) => setForm({ ...form, number: v })} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Complemento (opcional)" value={form.complement} onChange={(v) => setForm({ ...form, complement: v })} />
              <Field label="Bairro" value={form.district} onChange={(v) => setForm({ ...form, district: v })} required />
            </div>
            <Field label="Estado (UF)" value={form.state} onChange={(v) => setForm({ ...form, state: v.toUpperCase().slice(0, 2) })} required className="max-w-[8rem]" />
          </fieldset>

          <Field label="Cupom de desconto (opcional)" value={form.couponCode} onChange={(v) => setForm({ ...form, couponCode: v.toUpperCase() })} className="max-w-xs" />

          <label className="text-sm text-ink">
            Observações (opcional)
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="mt-1 w-full rounded-sm border border-beige-dark bg-transparent px-3 py-2" />
          </label>

          <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Gerando pagamento…" : "Gerar PIX e finalizar pedido"}
          </Button>
          <p className="text-xs text-ink-muted">Pagamento por PIX. Cartão e boleto ainda não estão disponíveis.</p>
        </form>

        <aside className="h-fit rounded-md bg-beige/40 p-6">
          <h2 className="font-serif text-lg text-ink">Resumo</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-muted">
            {cart?.items.map((item) => (
              <li key={item.itemId} className="flex justify-between gap-2">
                <span>
                  {item.productName} ×{item.quantity}
                </span>
                <span>{formatMoney(item.lineTotalInCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-beige pt-4 font-medium text-ink">
            <span>Subtotal</span>
            <span>{formatMoney(cart?.subtotalInCents ?? 0)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">Frete e cupom (se houver) calculados ao confirmar o pedido.</p>
        </aside>
      </div>
    </Container>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`text-sm text-ink ${className ?? ""}`}>
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-10 w-full rounded-sm border border-beige-dark bg-transparent px-3"
      />
    </label>
  );
}
