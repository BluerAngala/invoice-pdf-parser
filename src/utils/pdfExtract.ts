import * as pdfjsLib from '../pdfjs/pdf.mjs'

// 设置 worker 路径（使用本地文件）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../pdfjs/pdf.worker.mjs', import.meta.url).href

// PDF页面数据
export interface PdfPageData {
  pageNumber: number
  text: string
  fullText: string // 不带换行的完整文本，用于正则匹配
  items: PdfTextItem[] // 原始文本项，用于分栏识别
  imageUrl: string // 渲染的图片URL
}

// PDF文本项
export interface PdfTextItem {
  str: string
  x: number
  y: number
}

// 提取PDF文本并渲染为图片
export async function extractPdfText(file: File): Promise<PdfPageData[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
    useSystemFonts: false // 禁用系统字体，避免字体警告
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

      // 转换为简化的文本项格式
      const items: PdfTextItem[] = rawItems.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
      }))

      // 按Y坐标（从上到下）和X坐标（从左到右）排序
      const sortedItems = [...items].sort((a, b) => {
        // Y坐标差异大于5认为是不同行
        if (Math.abs(a.y - b.y) > 5) return b.y - a.y
        return a.x - b.x
      })

      // 生成完整文本（不带换行，用于正则匹配）
      const fullText = sortedItems.map(item => item.str).join('')

      // 按行分组生成带换行的文本
      const lines = new Map<number, { x: number; str: string }[]>()
      sortedItems.forEach(item => {
        // 将Y坐标四舍五入到最近的5的倍数，合并相近的行
        const y = Math.round(item.y / 5) * 5
        if (!lines.has(y)) {
          lines.set(y, [])
        }
        lines.get(y)!.push({ x: item.x, str: item.str })
      })

      // 每行内按X坐标排序后拼接
      const sortedLines = Array.from(lines.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, lineItems]) => {
          return lineItems
            .sort((a, b) => a.x - b.x)
            .map(item => item.str)
            .join(' ')
        })
      const text = sortedLines.join('\n')

      // 渲染为图片（降低 scale 减少内存占用）
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { alpha: false })

      if (!context) {
        console.warn(`⚠️ 无法创建 canvas context: ${file.name} 第${pageNum}页`)
        continue
      }

      canvas.width = viewport.width
      canvas.height = viewport.height
      context.fillStyle = 'white'
      context.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({ canvasContext: context, viewport }).promise

      const imageUrl = canvas.toDataURL('image/jpeg', 0.8)

      // 清理资源
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

  // 清理 PDF 文档资源
  pdf.destroy()

  return pages
}

// 检查是否为PDF文件
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
