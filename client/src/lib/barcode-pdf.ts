// lib/barcode-pdf.ts

const BARCODE_CONFIG = {
    format: "EAN13" as const,
    width: 2,
    height: 80,
    displayValue: true,
    fontSize: 13,
    margin: 10,
    background: "#ffffff",
    lineColor: "#000000",
} as const

type BarcodeEntry = {
    barcode: string
    productName: string
}

function sanitizeFilename(name: string): string {
    return name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase()
}

async function renderBarcodeDataUrl(
    canvas: HTMLCanvasElement,
    value: string
): Promise<string> {
    const JsBarcode = (await import("jsbarcode")).default
    JsBarcode(canvas, value, BARCODE_CONFIG)
    return canvas.toDataURL("image/png")
}

async function generatePDFBytes(entry: BarcodeEntry): Promise<Uint8Array> {
    const { jsPDF } = await import("jspdf")
    const canvas = document.createElement("canvas")

    const dataUrl = await renderBarcodeDataUrl(canvas, entry.barcode)

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

    // Header
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(
        `${entry.productName}  ·  ${new Date().toLocaleDateString()}`,
        15,
        10
    )

    // Barcode image
    doc.addImage(dataUrl, "PNG", 15, 20, 80, 34)

    // Code text
    doc.setFontSize(8)
    doc.setTextColor(130, 130, 130)
    doc.text(entry.barcode, 55, 58, { align: "center" })

    return doc.output("arraybuffer") as unknown as Uint8Array
}

export async function downloadBarcodesAsZip(
    entries: BarcodeEntry[]
): Promise<void> {
    if (entries.length === 0) throw new Error("No barcodes provided")

    const JSZip = (await import("jszip")).default
    const zip = new JSZip()

    for (const entry of entries) {
        if (!entry.barcode?.trim()) continue
        try {
            const pdfBytes = await generatePDFBytes(entry)
            const filename = `${sanitizeFilename(entry.productName)}.pdf`
            zip.file(filename, pdfBytes)
        } catch (err) {
            console.error(`Failed to generate PDF for "${entry.productName}":`, err)
        }
    }

    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `barcodes-${new Date().toISOString().split("T")[0]}.zip`
    a.click()

    URL.revokeObjectURL(url)
}