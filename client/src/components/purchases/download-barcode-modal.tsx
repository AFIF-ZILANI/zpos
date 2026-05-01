import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Archive, Loader2 } from "lucide-react";
import { downloadBarcodesAsZip } from "@/lib/barcode-pdf";
import type { BarcodePrintData } from "@/types";

export function DownloadBarcodePDFModal({
  data,
  open,
  onClose,
}: {
  data: BarcodePrintData[];
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadBarcodesAsZip(
        data.map((e) => ({ barcode: e.barcode, productName: e.productName })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Download Barcodes
          </DialogTitle>
          <DialogDescription>
            {data.length} {data.length === 1 ? "barcode" : "barcodes"} will
            download as individual PDF files inside a ZIP.
          </DialogDescription>
        </DialogHeader>

        <Button onClick={handleDownload} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Archive className="w-4 h-4 mr-2" />
          )}
          {loading
            ? "Generating ZIP..."
            : `Download ZIP (${data.length} files)`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
