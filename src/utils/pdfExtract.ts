import * as pdfjsLib from 'pdfjs-dist'

// 设置 worker 路径
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// PDF页面数据
export interface PdfPageData {
  pageNumber: number
  text: string
  imageUrl: string // 渲染的图片URL
}

// 提取PDF文本并渲染为图片
export async function extractPdfText(file: File): Promise<PdfPageData[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: PdfPageData[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)

    // 提取文本 - 按Y坐标分组保留行结构
    const textContent = await page.getTextContent()
    const lines = new Map<number, string>()

    const items = textContent.items as Array<{
      str: string
      transform: number[]
    }>
    items.forEach(item => {
      const y = Math.round(item.transform[5])
      const existing = lines.get(y) || ''
      lines.set(y, existing + ' ' + item.str)
    })

    // 按Y坐标排序并拼接文本
    const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0])
    const text = sortedLines.map(entry => entry[1]).join('\n')

    // 渲染为图片
    const viewport = page.getViewport({ scale: 2.5 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: false })

    if (!context) continue

    canvas.width = viewport.width
    canvas.height = viewport.height
    context.fillStyle = 'white'
    context.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvasContext: context, viewport }).promise

    pages.push({
      pageNumber: pageNum,
      text,
      imageUrl: canvas.toDataURL('image/jpeg', 0.92)
    })
  }

  return pages
}

// 检查是否为PDF文件
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
