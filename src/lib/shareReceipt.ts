import type { SaleDetail } from '../types/sales'

const COMPANY = 'SAYYIF PREMIUM FLOUR MASTERS LTD'

export async function captureReceiptFile(sale: SaleDetail): Promise<File | null> {
  const found =
    document.querySelector('.receipt-print-area') ?? document.getElementById('receipt-view')
  if (!found) return null
  const node = found as HTMLElement

  const prev = {
    display: node.style.display,
    position: node.style.position,
    left: node.style.left,
    top: node.style.top,
    width: node.style.width,
    visibility: node.style.visibility,
  }
  const wasHidden = node.style.display === 'none' || getComputedStyle(node).display === 'none'
  if (wasHidden) {
    node.style.display = 'block'
    node.style.position = 'fixed'
    node.style.left = '0'
    node.style.top = '0'
    node.style.width = '210mm'
    node.style.visibility = 'visible'
  }

  try {
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(node, {
      pixelRatio: 300 / 96,
      cacheBust: true,
      backgroundColor: '#ffffff',
    })
    const blob = await (await fetch(dataUrl)).blob()
    return new File([blob], `receipt-${sale.receipt_number}.png`, { type: 'image/png' })
  } catch {
    return null
  } finally {
    if (wasHidden) {
      node.style.display = prev.display
      node.style.position = prev.position
      node.style.left = prev.left
      node.style.top = prev.top
      node.style.width = prev.width
      node.style.visibility = prev.visibility
    }
  }
}

export async function shareReceiptImageFile(
  sale: SaleDetail,
  shopName?: string | null,
): Promise<boolean> {
  const title = `${shopName ?? COMPANY} — Receipt ${sale.receipt_number}`
  const file = await captureReceiptFile(sale)

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: unknown) => Promise<void>
  }

  if (file && nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title })
    return true
  }
  return false
}
