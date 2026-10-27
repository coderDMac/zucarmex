'use client';
import { PaymentMethod, paymentDescriptions, paymentLabels } from '@/lib/domain/types';
export function PaymentOptions({
  value,
  onChange,
  disabled = false,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="payment-options" disabled={disabled}>
      <legend>Método de pago</legend>
      {Object.entries(paymentLabels).map(([method, label]) => (
        <label key={method} className={`radio-card ${value === method ? 'selected' : ''}`}>
          <input
            type="radio"
            name="payment_method"
            value={method}
            checked={value === method}
            onChange={() => onChange(method as PaymentMethod)}
            required
          />
          <div>
            <strong>{label}</strong>
            <p>{paymentDescriptions[method as PaymentMethod]}</p>
          </div>
        </label>
      ))}
      <p className="subtle">
        Seleccionar un método no realiza un cobro. El registro de pago es simulado y se habilita al
        confirmar el pedido.
      </p>
    </fieldset>
  );
}
