// PDF 处理器 - 整合 PDF 提取和转换功能
import * as pdfjsLib from '../pdfjs/pdf.mjs'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../pdfjs/pdf.worker.mjs', import.meta.url).href

export interface PdfPageData {
  pageNumber: number
  text: string
  fullText: string
  items: PdfTextItem[]
  imageUrl: string
}

export interface PdfTextItem {
  str: string
  x: number
  y: number
}

// 提取 PDF 文本（延迟渲染图片）
export async function extractPdfText(file: File): Promise<PdfPageData[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
    useSystemFonts: false
  }).promise
  const pages: PdfPageData[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum)

      // 提取文本
      const textContent = await page.getTextContent()
      const rawItems = textContent.items as Array<{
        str: string
        transform: number[]
      }>

      const items: PdfTextItem[] = rawItems.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
      }))

      // 排序
      const sortedItems = [...items].sort((a, b) => {
        if (Math.abs(a.y - b.y) > 5) return b.y - a.y
        return a.x - b.x
      })

      // 生成完整文本（不带换行）
      const fullText = sortedItems.map(item => item.str).join('')

      // 按行分组生成带换行的文本
      const lines = new Map<number, { x: number; str: string }[]>()
      sortedItems.forEach(item => {
        const y = Math.round(item.y / 5) * 5
        if (!lines.has(y)) {
          lines.set(y, [])
        }
        lines.get(y)!.push({ x: item.x, str: item.str })
      })

      const sortedLines = Array.from(lines.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, lineItems]) => {
          return lineItems
            .sort((a, b) => a.x - b.x)
            .map(item => item.str)
            .join(' ')
        })
      const text = sortedLines.join('\n')

      // 延迟渲染：先用占位符，按需渲染
      const imageUrl = await renderPageToImage(page, file.name, pageNum)

      page.cleanup()

      pages.push({
        pageNumber: pageNum,
        text,
        fullText,
        items,
        imageUrl
      })
    } catch (pageError) {
      console.error(`❌ PDF 第${pageNum}页处理失败:`, pageError)
    }
  }

  pdf.destroy()

  return pages
}

// 渲染单页为图片
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPageToImage(page: any, fileName: string, pageNum: number): Promise<string> {
  // scale 1.2 平衡清晰度和速度
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { alpha: false })

  if (!context) {
    console.warn(`⚠️ 无法创建 canvas context: ${fileName} 第${pageNum}页`)
    return ''
  }

  canvas.width = viewport.width
  canvas.height = viewport.height
  context.fillStyle = 'white'
  context.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: context, viewport }).promise

  // JPEG 质量 0.75
  return canvas.toDataURL('image/jpeg', 0.9)
}

// 检查是否为 PDF 文件
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
