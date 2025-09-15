import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-700"
          onClick={onClose}
          aria-label="Kapat"
        >
          ×
        </button>
        {title && <h2 className="text-lg font-bold mb-2">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  );
}
