// 发票信息类型定义
export interface Invoice {
  id: string
  fileName: string
  sourceFile: string // 原始文件名（用于分组）
  imageUrl: string
  invoiceNumber: string // 发票号码
  invoiceCode: string // 发票代码
  amount: number // 金额
  taxAmount: number // 税额
  totalAmount: number // 价税合计
  date: string // 开票日期
  seller: string // 销售方
  buyer: string // 购买方
  isDuplicate: boolean // 是否重复
  recognitionStatus: 'pending' | 'processing' | 'success' | 'error'
  errorMessage?: string
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
