import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  className?: string;
  label: string;
  onClose?: () => void;
};

export function Modal({ children, className = "", label, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstControl = dialog?.querySelector<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex='0']",
    );
    firstControl?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex='0']",
        ),
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && onClose) onClose();
      }}
    >
      <div
        aria-label={label}
        aria-modal="true"
        className={`modal-panel ${className}`.trim()}
        ref={dialogRef}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
