// 发票信息类型定义
export interface Invoice {
  id: string // 唯一标识
  fileName: string // 显示名称
  sourceFile: string // 原始文件名（用于分组）
  uploadTime: string // 上传时间
  imageUrl: string // 图片数据（base64 或 URL）
  pdfData?: ArrayBuffer // 原始 PDF 数据（用于导出）
  pageNumber?: number // PDF 页码（多页 PDF 时使用）

  // 发票核心信息
  invoiceNumber: string // 发票号码
  invoiceCode: string // 发票代码
  date: string // 开票日期
  amount: number // 金额
  taxAmount: number // 税额
  totalAmount: number // 价税合计
  seller: string // 销售方
  buyer: string // 购买方

  // 扩展信息
  category?: string // 分类（可选）

  // 状态信息
  status: 'valid' | 'duplicate' | 'invalid' // 发票状态
  recognitionStatus: 'pending' | 'processing' | 'success' | 'error' // 识别状态
  recognitionMethod?: 'regex' | 'llm' | 'ocr' // 识别方式
  errorMessage?: string // 错误信息

  // 兼容旧字段
  isDuplicate: boolean // 是否重复（映射到 status）
}

// 按文件分组的发票
export interface InvoiceGroup {
  sourceFile: string
  invoices: Invoice[]
  expanded: boolean
}

export interface RecognitionProgress {
  current: number
  total: number
  status: string
}

// PDF 文本项
export interface PdfTextItem {
  str: string
  x: number
  y: number
}
