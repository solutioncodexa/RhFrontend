import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "./ui";

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const { tr } = useI18n();
  if (!open) return null;
  return createPortal(
    <div className="overlay-in fixed inset-0 z-[80] flex items-end justify-center bg-indigo-950/50 p-0 sm:items-center sm:p-4">
      <button className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div className={`modal-in relative z-10 flex max-h-[min(92vh,820px)] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="flex items-center justify-between border-b border-indigo-50 px-5 py-4">
          <h2 className="text-lg font-semibold text-indigo-950">{tr(title)}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-indigo-400 hover:bg-indigo-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-indigo-50 px-5 py-3">{footer}</div>
        ) : (
          <div className="flex justify-end gap-2 border-t border-indigo-50 px-5 py-3">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
  danger,
  pending,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
  danger?: boolean;
  pending?: boolean;
}) {
  const { tr } = useI18n();
  return (
    <Modal
      open={open}
      title={title}
      onClose={pending ? () => undefined : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={pending} disabled={pending} onClick={() => onConfirm()}>
            Confirmer
          </Button>
        </>
      }
    >
      <p className="text-sm text-indigo-900/80">{tr(message)}</p>
    </Modal>
  );
}
