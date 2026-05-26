'use client';

import { ReactNode } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';
  const accentColor = isDanger ? '#EF4444' : '#F59E0B';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center py-2">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {isDanger ? <Trash2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        <div className="text-sm text-text-secondary mb-6">{message}</div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-secondary
              hover:text-text-primary transition-all"
            style={{
              background: 'rgba(34, 34, 40, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
              disabled:opacity-50 active:scale-[0.97]"
            style={{
              background: isDanger
                ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                : 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: isDanger ? '#fff' : '#0A0A0B',
            }}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
