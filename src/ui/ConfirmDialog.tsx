import { Button } from "./Button";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmDialog({
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal className="confirm-dialog" label={title} onClose={onCancel}>
      <span className="modal-kicker">Confirmation biologique</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="modal-actions">
        <Button data-audio="back" onClick={onCancel}>Annuler</Button>
        <Button className="button-danger" onClick={onConfirm} variant="primary">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
