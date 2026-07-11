import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { captureAppFocus, restoreCapturedFocus } from "../utils/restoreAppFocus";

interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  className?: string;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
  "aria-label"?: string;
}

export default function ModalOverlay({
  open,
  onClose,
  children,
  zIndex = 50,
  className = "flex items-center justify-center px-4",
  backdropClassName = "bg-slate-900/40",
  closeOnBackdrop = true,
  "aria-label": ariaLabel,
}: ModalOverlayProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      captureAppFocus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreCapturedFocus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`fixed inset-0 ${className} ${backdropClassName}`}
      style={{ zIndex }}
      onClick={closeOnBackdrop ? () => onCloseRef.current() : undefined}
    >
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>,
    document.body
  );
}
