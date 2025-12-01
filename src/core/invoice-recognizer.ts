// 发票识别器 - 整合多种识别策略
import {
  parseInvoiceFromPdf,
  parseMultipleInvoices,
  type InvoiceData,
  type PdfParseData
} from './invoice-parser'
import { parseInvoiceByLLM, recognizeImageByOCR, type ApiConfig } from './siliconflow-api'

// 识别发票（支持一页多张）
export async function recognizeInvoice(
  imageUrl: string,
  _fileName: string,
  pdfData?: PdfParseData,
  apiConfig?: ApiConfig
): Promise<InvoiceData> {
  // 优先从 PDF 文本提取
  if (pdfData && pdfData.fullText) {
    const result = parseInvoiceFromPdf(pdfData)
    if (result.invoiceNumber) {
      console.log('📄 正则提取成功:', result.invoiceNumber)
      return result
    }

    // 正则未识别到发票号码，尝试 LLM
    if (apiConfig) {
      console.log('⚠️ 正则未识别到发票号码，尝试 LLM 解析...')
      const llmResult = await parseInvoiceByLLM(pdfData.fullText, apiConfig)
      if (llmResult && llmResult.invoiceNumber) {
        return llmResult
      }
    }

    // LLM 也失败，返回部分结果
    if (result.totalAmount > 0) {
      console.log('⚠️ LLM 解析失败，返回部分结果（金额: ¥' + result.totalAmount + '）')
      return result
    }
  }

  // 无 PDF 文本，调用 OCR
  if (apiConfig) {
    console.log('📷 无 PDF 文本，调用 OCR 图片识别...')
    const ocrResult = await recognizeImageByOCR(imageUrl, apiConfig)
    if (ocrResult) {
      return ocrResult
    }
  }

  // 返回空结果
  return createEmptyInvoice()
}

// 识别多张发票
export function recognizeMultipleInvoices(pdfData: PdfParseData): InvoiceData[] {
  return parseMultipleInvoices(pdfData)
}

// 创建空发票
function createEmptyInvoice(): InvoiceData {
  return {
    invoiceNumber: '',
    invoiceCode: '',
    amount: 0,
    taxAmount: 0,
    totalAmount: 0,
    date: '',
    seller: '',
    buyer: ''
  }
}
