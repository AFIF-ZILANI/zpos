import type { Sale } from "@/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteConfirmationModalProps {
  sale: Sale | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmationModal({
  sale,
  isOpen,
  isLoading,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
      toast("Sale deleted", {
        description: `Invoice ${sale?.invoiceNumber} has been deleted.`,
      });
    } catch {
      toast.error("Failed to delete sale. Please try again.");
    }
  };

  if (!sale) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Sale</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Invoice #{sale.invoiceNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {sale.customerName}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                <span className="font-semibold">Warning:</span> This action
                marks the sale as deleted and cannot be undone from the
                application. The record will still exist in the database.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to proceed?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2 justify-end">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
