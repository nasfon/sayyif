const A4_W = 210
const A4_H = 297
const DPI = 300
const CSS_DPI = 96
const PIXEL_RATIO = DPI / CSS_DPI

export async function downloadReportPdf(node: HTMLElement, filename: string): Promise<void> {
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
    img.onerror = () => reject(new Error('Failed to process report image.'))
    img.src = dataUrl
  })

  const width = A4_W
  const height = (img.height / img.width) * width

  if (height <= A4_H) {
    doc.addImage(dataUrl, 'PNG', 0, 0, width, height)
  } else {
    doc.addImage(dataUrl, 'PNG', 0, 0, width, A4_H)
  }

  doc.save(filename)
}
