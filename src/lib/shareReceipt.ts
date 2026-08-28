import type { SaleDetail } from '../types/sales'
import { PAYMENT_METHOD_LABELS } from '../types/sales'
import { formatCurrency } from './utils'

const COMPANY = 'SAYYIF PREMIUM FLOUR MASTERS LTD'

export function buildReceiptText(sale: SaleDetail, shopName?: string | null): string {
  const lines: string[] = []
  lines.push(shopName ?? COMPANY)
  lines.push('Sales Receipt')
  lines.push(`Receipt No: ${sale.receipt_number}`)
  lines.push(`Date: ${new Date(sale.created_at).toLocaleString()}`)
  lines.push(`Customer: ${sale.customer_name ?? 'Walk-in / Guest'}`)
  lines.push(`Payment: ${PAYMENT_METHOD_LABELS[sale.payment_method]}`)
  lines.push('—'.repeat(18))
  for (const item of sale.items) {
    lines.push(`${item.product_name} x${item.quantity}  ${formatCurrency(item.total_price)}`)
  }
  lines.push('—'.repeat(18))
  lines.push(`Subtotal: ${formatCurrency(sale.subtotal)}`)
  lines.push(`Total: ${formatCurrency(sale.total)}`)
  lines.push(`Amount Paid: ${formatCurrency(sale.amount_paid)}`)
  if (sale.remaining_credit > 0) {
    lines.push(`Remaining Credit: ${formatCurrency(sale.remaining_credit)}`)
  }
  return lines.join('\n')
}

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
      pixelRatio: 2,
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
  const text = buildReceiptText(sale, shopName)
  const title = `${shopName ?? COMPANY} — Receipt ${sale.receipt_number}`
  const file = await captureReceiptFile(sale)

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: unknown) => Promise<void>
  }

  if (file && nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title, text })
    return true
  }
  if (file && nav.share) {
    await nav.share({ title, text })
    return true
  }
  return false
}
