import { Filesystem, Directory } from '@capacitor/filesystem'
import { isNative } from './capacitor'

export async function downloadReceiptImage(receiptNumber: string): Promise<void> {
  const node =
    document.querySelector('.ims-receipt') ?? document.getElementById('receipt-view')
  if (!node) {
    throw new Error('Receipt not rendered yet.')
  }
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(node as HTMLElement, {
    pixelRatio: 300 / 96,
    backgroundColor: '#ffffff',
    cacheBust: true,
  })

  if (isNative()) {
    const base64 = dataUrl.split(',')[1]
    const fileName = `receipt-${receiptNumber}.png`
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.External,
    })
  } else {
    const link = document.createElement('a')
    link.download = `receipt-${receiptNumber}.png`
    link.href = dataUrl
    link.click()
  }
}
