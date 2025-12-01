// 简化版识别 - 从文件名和图片元数据提取信息
export async function recognizeInvoice(imageUrl: string, fileName: string): Promise<{
  invoiceNumber: string
  invoiceCode: string
  amount: number
  taxAmount: number
  totalAmount: number
  date: string
  seller: string
  buyer: string
}> {
  // 模拟识别延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 尝试从文件名提取信息
  const result = {
    invoiceNumber: extractInvoiceNumber(fileName),
    invoiceCode: extractInvoiceCode(fileName),
    amount: 0,
    taxAmount: 0,
    totalAmount: extractAmount(fileName),
    date: extractDate(fileName),
    seller: '',
    buyer: ''
  }
  
  return result
}

// 从文件名提取发票号码 (8位数字)
function extractInvoiceNumber(text: string): string {
  const match = text.match(/\b(\d{8})\b/)
  return match ? match[1] : ''
}

// 从文件名提取发票代码 (10-12位数字)
function extractInvoiceCode(text: string): string {
  const match = text.match(/\b(\d{10,12})\b/)
  return match ? match[1] : ''
}

// 从文件名提取金额
function extractAmount(text: string): number {
  // 匹配金额格式: 123.45, 1234, 1,234.56
  const match = text.match(/[\d,]+\.?\d{0,2}/)
  if (match) {
    const amount = parseFloat(match[0].replace(/,/g, ''))
    if (!isNaN(amount) && amount > 0 && amount < 1000000) {
      return amount
    }
  }
  return 0
}

// 从文件名提取日期
function extractDate(text: string): string {
  // 匹配日期格式: 2023-11-19, 20231119, 2023.11.19
  const match = text.match(/(\d{4})[-./]?(\d{2})[-./]?(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return new Date().toISOString().split('T')[0]
}

// 解析OCR识别的文本,提取发票信息
function parseInvoiceText(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  
  let invoiceNumber = ''
  let invoiceCode = ''
  let amount = 0
  let taxAmount = 0
  let totalAmount = 0
  let date = ''
  let seller = ''
  let buyer = ''
  
  // 发票号码: 通常是8位数字
  const invoiceNumberMatch = text.match(/No[.:]?\s*(\d{8})/i) || 
                             text.match(/号码[：:]\s*(\d{8})/) ||
                             text.match(/(\d{8})/)
  if (invoiceNumberMatch) {
    invoiceNumber = invoiceNumberMatch[1]
  }
  
  // 发票代码: 通常是10-12位数字
  const invoiceCodeMatch = text.match(/代码[：:]\s*(\d{10,12})/) ||
                          text.match(/(\d{10,12})/)
  if (invoiceCodeMatch) {
    invoiceCode = invoiceCodeMatch[1]
  }
  
  // 金额: 匹配 ¥ 或 金额 后面的数字
  const amountMatch = text.match(/[¥￥]\s*([\d,]+\.?\d*)/) ||
                     text.match(/金额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)/) ||
                     text.match(/小写[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)/)
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''))
  }
  
  // 税额
  const taxMatch = text.match(/税额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)/)
  if (taxMatch) {
    taxAmount = parseFloat(taxMatch[1].replace(/,/g, ''))
  }
  
  // 价税合计
  const totalMatch = text.match(/价税合计[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)/) ||
                    text.match(/合计[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)/)
  if (totalMatch) {
    totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''))
  } else if (amount > 0 && taxAmount > 0) {
    totalAmount = amount + taxAmount
  }
  
  // 日期: YYYY年MM月DD日 或 YYYY-MM-DD
  const dateMatch = text.match(/(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})/) ||
                   text.match(/开票日期[：:]\s*(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})/)
  if (dateMatch) {
    const year = dateMatch[1]
    const month = dateMatch[2].padStart(2, '0')
    const day = dateMatch[3].padStart(2, '0')
    date = `${year}-${month}-${day}`
  }
  
  // 销售方名称
  const sellerMatch = text.match(/销售方[名称]*[：:]\s*([^\n]+)/) ||
                     text.match(/名\s*称[：:]\s*([^\n]+)/)
  if (sellerMatch) {
    seller = sellerMatch[1].trim()
  }
  
  // 购买方名称
  const buyerMatch = text.match(/购买方[名称]*[：:]\s*([^\n]+)/)
  if (buyerMatch) {
    buyer = buyerMatch[1].trim()
  }
  
  return {
    invoiceNumber,
    invoiceCode,
    amount,
    taxAmount,
    totalAmount,
    date,
    seller,
    buyer
  }
}
