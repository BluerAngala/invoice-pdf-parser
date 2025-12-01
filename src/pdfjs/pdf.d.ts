// PDF.js 类型声明
declare module '*.mjs' {
  export const GlobalWorkerOptions: {
    workerSrc: string
  }

  export interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
    destroy(): void
  }

  export interface PDFPageProxy {
    getViewport(params: { scale: number }): PDFPageViewport
    getTextContent(): Promise<TextContent>
    render(params: RenderParameters): RenderTask
    cleanup(): void
  }

  export interface PDFPageViewport {
    width: number
    height: number
  }

  export interface TextContent {
    items: TextItem[]
  }

  export interface TextItem {
    str: string
    transform: number[]
  }

  export interface RenderParameters {
    canvasContext: CanvasRenderingContext2D
    viewport: PDFPageViewport
  }

  export interface RenderTask {
    promise: Promise<void>
  }

  export interface DocumentInitParameters {
    data: ArrayBuffer
    cMapUrl?: string
    cMapPacked?: boolean
    standardFontDataUrl?: string
    useSystemFonts?: boolean // 是否使用系统字体
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>
  }

  export function getDocument(params: DocumentInitParameters): PDFDocumentLoadingTask
}
