import type { PdfTextItem } from './pdfExtract'

// 发票数据类型
export type InvoiceData = {
  invoiceNumber: string
  invoiceCode: string
  amount: number
  taxAmount: number
  totalAmount: number
  date: string
  seller: string
  buyer: string
}

// PDF解析数据
export interface PdfParseData {
  fullText: string // 不带换行的完整文本
  text: string // 带换行的文本
  items: PdfTextItem[] // 原始文本项
}

// 识别发票 - 优先使用文本提取，失败后才用 OCR
export async function recognizeInvoice(
  imageUrl: string,
  fileName: string,
  pdfData?: PdfParseData
): Promise<InvoiceData> {
  // 如果有PDF文本，优先从文本提取
  if (pdfData && pdfData.fullText) {
    const result = parseInvoiceFromPdf(pdfData)
    if (result.invoiceNumber || result.totalAmount > 0) {
      console.log(`📄 PDF文本识别成功: ${fileName}`)
      return result
    }
  }

  // 调用 DeepSeek-OCR API
  const apiKey = import.meta.env.VITE_SILICONFLOW_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('⚠️ 未配置 API Key')
    return createEmptyInvoice()
  }

  try {
    const response = await fetch(
      import.meta.env.VITE_SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-OCR',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                {
                  type: 'text',
                  text: '识别发票，返回JSON: {invoiceNumber,invoiceCode,date,seller,buyer,amount,taxAmount,totalAmount}'
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      }
    )

    if (!response.ok) throw new Error(`API错误: ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 尝试解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0])
      return {
        invoiceNumber: json.invoiceNumber || '',
        invoiceCode: json.invoiceCode || '',
        amount: parseFloat(json.amount) || 0,
        taxAmount: parseFloat(json.taxAmount) || 0,
        totalAmount: parseFloat(json.totalAmount) || 0,
        date: json.date || '',
        seller: json.seller || '',
        buyer: json.buyer || ''
      }
    }

    return createEmptyInvoice()
  } catch (error) {
    console.error('OCR识别失败:', error)
    return createEmptyInvoice()
  }
}

// 创建空发票数据
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

// 从PDF数据解析发票信息（参考示例代码的逻辑）
function parseInvoiceFromPdf(pdfData: PdfParseData): InvoiceData {
  const { fullText, items } = pdfData

  // === 发票号码 ===
  // 支持20位全电发票号码和8-12位传统发票号码
  const invoiceNumMatch = fullText.match(/(?:发票号码|号码)[:：]?\s*(\d{20}|\d{8,12})/)
  const invoiceNumber = invoiceNumMatch ? invoiceNumMatch[1] : ''

  // === 发票代码 ===
  // 全电发票（20位号码）不需要代码
  let invoiceCode = ''
  if (!invoiceNumber || invoiceNumber.length !== 20) {
    const codeMatch = fullText.match(/发票代码[:：]?\s*(\d{10,12})/)
    invoiceCode = codeMatch ? codeMatch[1] : ''
  }

  // === 开票日期 ===
  let date = ''
  const dateMatch = fullText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
  }

  // === 价税合计（金额）===
  let totalAmount = 0

  // 方法1: 价税合计...小写...¥金额
  const totalAmountReg = /价税合计[\s\S]*?小写.*?[¥￥:：]\s*([0-9,]+\.\d{2})/
  const totalMatch = fullText.match(totalAmountReg)
  if (totalMatch) {
    totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''))
  }

  // 方法2: (小写): ¥金额
  if (!totalAmount) {
    const lowerCaseMatch = fullText.match(/\(小写\)[:：]?\s*[¥￥]?\s*([0-9,]+\.\d{2})/)
    if (lowerCaseMatch) {
      totalAmount = parseFloat(lowerCaseMatch[1].replace(/,/g, ''))
    }
  }

  // 方法3: 查找最大金额（兜底）
  if (!totalAmount) {
    const moneyPattern = /[0-9,]+\.\d{2}/g
    let maxVal = 0
    let match
    while ((match = moneyPattern.exec(fullText)) !== null) {
      const val = parseFloat(match[0].replace(/,/g, ''))
      if (val > maxVal && val < 1000000000) {
        maxVal = val
      }
    }
    totalAmount = maxVal
  }

  // === 金额和税额 ===
  let amount = 0
  let taxAmount = 0
  const amountTaxMatch = fullText.match(
    /合\s*计\s+[¥￥]?\s*([\d,]+\.?\d{0,2})\s+[¥￥]?\s*([\d,]+\.?\d{0,2})/
  )
  if (amountTaxMatch) {
    amount = parseFloat(amountTaxMatch[1].replace(/,/g, ''))
    taxAmount = parseFloat(amountTaxMatch[2].replace(/,/g, ''))
  }

  // === 购买方和销售方（使用分栏策略）===
  let buyer = ''
  let seller = ''

  if (items && items.length > 0) {
    // 计算页面中点
    let maxX = 0
    items.forEach(item => {
      if (item.x > maxX) maxX = item.x
    })
    const midX = maxX / 2 || 300

    // 分左右两栏
    const leftItems = items.filter(item => item.x < midX)
    const rightItems = items.filter(item => item.x >= midX)

    // 在指定栏中查找标签后的值
    const findValueInColumn = (
      columnItems: PdfTextItem[],
      labelRegex: RegExp
    ): string | null => {
      for (let i = 0; i < columnItems.length; i++) {
        const item = columnItems[i]
        if (labelRegex.test(item.str)) {
          let value = ''
          const match = item.str.match(labelRegex)
          if (match) {
            const selfContent = item.str.replace(match[0], '').trim()
            if (selfContent.length > 1) value = selfContent
          }

          // 查找同一行的后续文本
          for (let j = i + 1; j < columnItems.length; j++) {
            const nextItem = columnItems[j]
            if (Math.abs(nextItem.y - item.y) > 4) break
            value += nextItem.str
          }
          if (value.trim()) return value.trim()
        }
      }
      return null
    }

    // 购买方在左栏，销售方在右栏
    buyer =
      findValueInColumn(leftItems, /名称[:：]/) ||
      findValueInColumn(leftItems, /购\s*买\s*方/) ||
      ''
    seller =
      findValueInColumn(rightItems, /名称[:：]/) ||
      findValueInColumn(rightItems, /销\s*售\s*方/) ||
      ''
  }

  // 如果分栏策略失败，使用正则兜底
  if (!buyer) {
    const buyerMatch = fullText.match(/购\s*买\s*方[\s\S]{0,50}?名\s*称[:：]?\s*([^\s\n统一社会]{2,50})/)
    buyer = buyerMatch ? buyerMatch[1].trim() : ''
  }
  if (!seller) {
    const sellerMatch = fullText.match(/销\s*售\s*方[\s\S]{0,50}?名\s*称[:：]?\s*([^\s\n统一社会]{2,50})/)
    seller = sellerMatch ? sellerMatch[1].trim() : ''
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
