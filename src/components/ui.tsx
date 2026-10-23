'use client';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { FiAlertCircle, FiArrowRight, FiCheck, FiInfo, FiMinus, FiPlus, FiX } from 'react-icons/fi';
import { OrderStatus, statusLabels } from '@/lib/domain/types';
import { money } from '@/lib/domain/pricing';
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function AnimatedPrice({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const counter = { value: Math.max(0, value * 0.85) };
    const animation = gsap.to(counter, {
      value,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = money(Math.round(counter.value));
      },
    });
    return () => {
      animation.kill();
    };
  }, [value]);
  return <span ref={ref}>{money(value)}</span>;
}
export function Badge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning';
}) {
  return (
    <div className={`notice ${tone}`}>
      {tone === 'success' ? <FiCheck /> : tone === 'warning' ? <FiAlertCircle /> : <FiInfo />}
      <div>{children}</div>
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="form-error">
      <FiAlertCircle />
      {message}
    </div>
  ) : null;
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">↗</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
            <FiX />
          </button>
        </div>
        {children}
      </motion.div>
    </dialog>
  );
}
export function Quantity({
  value,
  onChange,
  label = 'Cantidad',
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`Reducir ${label}`}
        disabled={value <= 0}
      >
        <FiMinus />
      </button>
      <input
        aria-label={label}
        type="number"
        min="0"
        max="10000"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(10000, Math.trunc(Number(e.target.value)))))}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(10000, value + 1))}
        aria-label={`Aumentar ${label}`}
        disabled={value >= 10000}
      >
        <FiPlus />
      </button>
    </div>
  );
}
export function useTask() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setPending(false);
    }
  };
  return { pending, error, run, setError };
}
export function Arrow() {
  return <FiArrowRight aria-hidden="true" />;
}
