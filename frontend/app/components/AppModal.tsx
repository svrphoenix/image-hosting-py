'use client';

import { DialogOptions } from '../types';

interface AppModalProps {
  dialog: DialogOptions | null;
  onClose: () => void;
}

export default function AppModal({ dialog, onClose }: AppModalProps) {
  if (!dialog) return null;

  const variant = dialog.variant || 'primary';
  const icon = variant === 'danger'
    ? '!'
    : variant === 'warning'
      ? '!'
      : 'i';

  const confirm = () => {
    dialog.resolve?.(true);
    onClose();
  };

  const cancel = () => {
    dialog.resolve?.(false);
    onClose();
  };

  return (
    <div className="app-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && cancel()}>
      <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
        <button className="app-modal-close" type="button" aria-label="Close dialog" onClick={cancel}>
          x
        </button>
        <div className={`app-modal-icon ${variant}`}>{icon}</div>
        <h2 className="app-modal-title" id="app-modal-title">{dialog.title}</h2>
        <p className="app-modal-message">{dialog.message}</p>
        <div className="app-modal-actions">
          {dialog.showCancel !== false && (
            <button className="app-modal-btn secondary" type="button" onClick={cancel}>
              {dialog.cancelText || 'Cancel'}
            </button>
          )}
          <button className={`app-modal-btn ${variant}`} type="button" onClick={confirm}>
            {dialog.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
