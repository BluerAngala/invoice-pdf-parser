import * as pdfjsLib from '../pdfjs/pdf.mjs'

// 设置 worker 路径（使用本地文件）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../pdfjs/pdf.worker.mjs', import.meta.url).href

// PDF页面数据
export interface PdfPageData {
  imageUrl: string
  text: string
}

// 将PDF转换为图片和文本
export async function convertPdfToImagesAndText(file: File): Promise<PdfPageData[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/'
  }).promise
  const pages: PdfPageData[] = []

  // 转换每一页
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)

    // 提取文本 - 保留换行结构
    const textContent = await page.getTextContent()
    const textItems = textContent.items as Array<{
      str: string
      transform: number[]
    }>

    // 按Y坐标分组，保留行结构
    const lines: { y: number; text: string }[] = []
    textItems.forEach(item => {
      const y = Math.round(item.transform[5])
      const existing = lines.find(line => Math.abs(line.y - y) < 5)
      if (existing) {
        existing.text += ' ' + item.str
      } else {
        lines.push({ y, text: item.str })
      }
    })

    // 按Y坐标排序，生成文本
    lines.sort((a, b) => b.y - a.y)
    const text = lines.map(line => line.text).join('\n')

    console.log(`📄 PDF第${pageNum}页提取的文本（完整）:`)
    console.log(text)

    // 渲染图片 - 使用更高的缩放比例提升清晰度
    const viewport = page.getViewport({ scale: 3.0 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: false })

    if (context) {
      canvas.width = viewport.width
      canvas.height = viewport.height

      // 白色背景
      context.fillStyle = 'white'
      context.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise

      pages.push({
        imageUrl: canvas.toDataURL('image/jpeg', 0.95),
        text
      })
    }
  }

  return pages
}

// 检查是否为PDF文件
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
