// 发票数据类型
type InvoiceData = {
  invoiceNumber: string
  invoiceCode: string
  amount: number
  taxAmount: number
  totalAmount: number
  date: string
  seller: string
  buyer: string
}

// 识别发票 - 优先使用文本提取，失败后才用 OCR
export async function recognizeInvoice(
  imageUrl: string,
  fileName: string,
  pdfText?: string
): Promise<InvoiceData> {
  // 如果有PDF文本，优先从文本提取
  if (pdfText) {
    const result = parseInvoiceText(pdfText)
    if (result.invoiceNumber || result.totalAmount > 0) {
      return result
    }
  }

  // 调用 DeepSeek-OCR API
  const apiKey = import.meta.env.VITE_SILICONFLOW_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('⚠️ 未配置 API Key')
    return parseInvoiceText('')
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

    return parseInvoiceText(content)
  } catch (error) {
    console.error('OCR识别失败:', error)
    return parseInvoiceText('')
  }
}

// 解析文本提取发票信息
function parseInvoiceText(text: string): InvoiceData {
  // 发票号码
  const invoiceNumber =
    (text.match(/发票号码[：:\s]*(\d{8,20})/) || text.match(/号码[：:\s]*(\d{8,20})/))?.[1] || ''

  // 发票代码
  const invoiceCode = text.match(/发票代码[：:\s]*(\d{10,12})/)?.[1] || ''

  // 开票日期
  const dateMatch = text.match(/开票日期[：:\s]*(\d{4})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/)
  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    : ''

  // 销售方和购买方 - 处理紧挨着的两个名称
  let seller = '',
    buyer = ''
  const namesMatch = text.match(
    /名\s*称[：:\s]+名\s*称[：:\s]+([\u4e00-\u9fa5a-zA-Z0-9（）()]+)\s+([\u4e00-\u9fa5a-zA-Z0-9（）()]+)/
  )
  if (namesMatch) {
    buyer = namesMatch[1].trim()
    seller = namesMatch[2].trim()
  } else {
    seller =
      text.match(/销\s*售\s*方[\s\S]{0,100}?名\s*称[：:\s]*([^\s\n统一社会]{2,50})/)?.[1]?.trim() ||
      ''
    buyer =
      text.match(/购\s*买\s*方[\s\S]{0,100}?名\s*称[：:\s]*([^\s\n统一社会]{2,50})/)?.[1]?.trim() ||
      ''
  }

  // 价税合计
  const totalMatch =
    text.match(/[（(]小写[）)][：:\s\n]*[¥￥]?\s*([\d,]+\.?\d{0,2})/) ||
    text.match(/价税合计[\s\S]{0,30}?[¥￥]?\s*([\d,]+\.?\d{0,2})/)
  let totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0

  // 金额和税额
  const amountTaxMatch = text.match(
    /合\s*计\s+[¥￥]?\s*([\d,]+\.?\d{0,2})\s+[¥￥]?\s*([\d,]+\.?\d{0,2})/
  )
  const amount = amountTaxMatch ? parseFloat(amountTaxMatch[1].replace(/,/g, '')) : 0
  const taxAmount = amountTaxMatch ? parseFloat(amountTaxMatch[2].replace(/,/g, '')) : 0

  // 如果没有价税合计，用金额+税额计算
  if (!totalAmount && amount && taxAmount) {
    totalAmount = amount + taxAmount
  }

  return { invoiceNumber, invoiceCode, amount, taxAmount, totalAmount, date, seller, buyer }
}
