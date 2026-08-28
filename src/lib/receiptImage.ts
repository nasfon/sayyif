export async function downloadReceiptImage(receiptNumber: string): Promise<void> {
  const node = document.getElementById('receipt-view')
  if (!node) {
    throw new Error('Receipt not rendered yet.')
  }
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(node as HTMLElement, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
  })
  const link = document.createElement('a')
  link.download = `receipt-${receiptNumber}.png`
  link.href = dataUrl
  link.click()
}