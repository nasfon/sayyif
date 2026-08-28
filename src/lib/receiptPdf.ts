import type { SaleDetail } from '../types/sales'

const A4_W = 210
const A4_H = 297
const DPI = 300
const CSS_DPI = 96
const PIXEL_RATIO = DPI / CSS_DPI

export async function downloadReceiptPdf(sale: SaleDetail): Promise<void> {
  const node =
    (document.querySelector('.receipt-print-area') as HTMLElement | null) ??
    (document.getElementById('receipt-view') as HTMLElement | null)

  if (!node) {
    throw new Error('Receipt not rendered yet.')
  }

  const wasHidden = node.style.display === 'none' || getComputedStyle(node).display === 'none'
  const prevDisplay = node.style.display
  const prevPosition = node.style.position
  const prevLeft = node.style.left
  const prevTop = node.style.top
  const prevVisibility = node.style.visibility

  if (wasHidden) {
    node.style.display = 'block'
    node.style.position = 'fixed'
    node.style.left = '-100000px'
    node.style.top = '0'
    node.style.visibility = 'visible'
  }

  try {
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(node, {
      pixelRatio: PIXEL_RATIO,
      cacheBust: true,
      backgroundColor: '#ffffff',
    })

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to process receipt image.'))
      img.src = dataUrl
    })

    const width = A4_W
    const height = (img.height / img.width) * width

    if (height <= A4_H) {
      doc.addImage(dataUrl, 'PNG', 0, 0, width, height)
    } else {
      doc.addImage(dataUrl, 'PNG', 0, 0, width, A4_H)
    }

    doc.save(`receipt-${sale.receipt_number}.pdf`)
  } finally {
    if (wasHidden) {
      node.style.display = prevDisplay
      node.style.position = prevPosition
      node.style.left = prevLeft
      node.style.top = prevTop
      node.style.visibility = prevVisibility
    }
  }
}
