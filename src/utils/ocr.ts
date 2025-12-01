// 识别发票 - 优先使用文本提取，失败后才用 OCR
export async function recognizeInvoice(imageUrl: string, fileName: string, pdfText?: string): Promise<{
  invoiceNumber: string
  invoiceCode: string
  amount: number
  taxAmount: number
  totalAmount: number
  date: string
  seller: string
  buyer: string
}> {
  console.log('🔍 开始识别发票:', fileName)
  
  // 方案1: 如果有PDF文本，优先从文本提取
  if (pdfText) {
    console.log('📄 使用PDF文本提取...')
    console.log('📝 PDF文本内容（前500字符）:', pdfText.substring(0, 500))
    console.log('📝 PDF文本内容（后500字符）:', pdfText.substring(Math.max(0, pdfText.length - 500)))
    const result = parseInvoiceText(pdfText)
    console.log('🔍 解析结果:', result)
    
    // 检查是否提取到关键信息
    if (result.invoiceNumber || result.totalAmount > 0) {
      console.log('✅ 文本提取成功:', result)
      return result
    }
    console.log('⚠️ 文本提取失败，尝试OCR识别...')
  }
  
  // 方案2: 调用 DeepSeek-OCR API
  const apiKey = import.meta.env.VITE_SILICONFLOW_API_KEY
  const apiUrl = import.meta.env.VITE_SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1/chat/completions'
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('⚠️ 未配置 SiliconFlow API Key')
    return getEmptyInvoice()
  }

  try {
    console.log('📤 调用 DeepSeek-OCR API...')
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-OCR',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: '请识别这张发票图片,提取以下信息并以JSON格式返回:\n1. 发票号码(invoiceNumber,8位数字)\n2. 发票代码(invoiceCode,10-12位数字)\n3. 开票日期(date,格式YYYY-MM-DD)\n4. 销售方名称(seller)\n5. 购买方名称(buyer)\n6. 金额(amount,数字)\n7. 税额(taxAmount,数字)\n8. 价税合计(totalAmount,数字)\n\n只返回JSON,不要其他说明文字。'
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const result = parseOCRResponse(content)
    console.log('✅ OCR识别成功:', result)
    return result
  } catch (error) {
    console.error('❌ OCR识别失败:', error)
    return getEmptyInvoice()
  }
}

// 解析 OCR API 返回的内容
function parseOCRResponse(content: string): {
  invoiceNumber: string
  invoiceCode: string
  amount: number
  taxAmount: number
  totalAmount: number
  date: string
  seller: string
  buyer: string
} {
  try {
    // 尝试提取 JSON
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
  } catch (error) {
    console.error('解析 OCR 结果失败:', error)
  }

  // 如果解析失败,尝试用正则提取
  return parseInvoiceText(content)
}

// 返回空发票信息
function getEmptyInvoice() {
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

// 解析文本提取发票信息（核心方法）
function parseInvoiceText(text: string) {
  let invoiceNumber = ''
  let invoiceCode = ''
  let amount = 0
  let taxAmount = 0
  let totalAmount = 0
  let date = ''
  let seller = ''
  let buyer = ''
  
  // 发票号码: 8-20位数字（电子发票可能更长）
  const invoiceNumberMatch = text.match(/发票号码[：:\s]*(\d{8,20})/) ||
                             text.match(/No[.：:\s]*(\d{8,20})/i) ||
                             text.match(/号码[：:\s]*(\d{8,20})/)
  if (invoiceNumberMatch) {
    invoiceNumber = invoiceNumberMatch[1]
  }
  
  // 发票代码: 10-12位数字
  const invoiceCodeMatch = text.match(/发票代码[：:\s]*(\d{10,12})/) ||
                          text.match(/代码[：:\s]*(\d{10,12})/)
  if (invoiceCodeMatch) {
    invoiceCode = invoiceCodeMatch[1]
  }
  
  // 开票日期（优先处理，避免被金额匹配干扰）
  const dateMatch = text.match(/开票日期[：:\s]*(\d{4})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/)
  if (dateMatch) {
    const year = dateMatch[1]
    const month = dateMatch[2].padStart(2, '0')
    const day = dateMatch[3].padStart(2, '0')
    date = `${year}-${month}-${day}`
  }
  
  // 销售方和购买方名称 - 特殊处理紧挨着的两个名称
  // 格式: "购 销买 售 名称：   名称：  广东岭南律师事务所   广州优行科技有限公司方 方信"
  const namesMatch = text.match(/名\s*称[：:\s]+名\s*称[：:\s]+([\u4e00-\u9fa5a-zA-Z0-9（）()]+)\s+([\u4e00-\u9fa5a-zA-Z0-9（）()]+)/)
  if (namesMatch) {
    // 第一个是购买方，第二个是销售方
    buyer = namesMatch[1].trim()
    seller = namesMatch[2].trim()
  } else {
    // 备用方案：分别匹配
    const sellerMatch = text.match(/销\s*售\s*方[\s\S]{0,100}?名\s*称[：:\s]*([^\s\n统一社会]{2,50})/)
    if (sellerMatch) {
      seller = sellerMatch[1].trim()
    }
    
    const buyerMatch = text.match(/购\s*买\s*方[\s\S]{0,100}?名\s*称[：:\s]*([^\s\n统一社会]{2,50})/)
    if (buyerMatch) {
      buyer = buyerMatch[1].trim()
    }
  }
  
  // 价税合计（最重要，优先匹配）
  // 匹配 "（小写）" 或 "价税合计" 后面的金额
  const totalMatch = text.match(/[（(]小写[）)][：:\s\n]*[¥￥]?\s*([\d,]+\.?\d{0,2})/) ||
                    text.match(/价税合计[\s\S]{0,30}?[¥￥]?\s*([\d,]+\.?\d{0,2})/)
  if (totalMatch) {
    totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''))
  }
  
  // 金额和税额 - 从"合计"行提取，支持带货币符号的格式
  // 格式1: "合   计 ¥21.94   ¥0.66"
  // 格式2: "合计 21.94 0.66"
  const amountTaxMatch = text.match(/合\s*计\s+[¥￥]?\s*([\d,]+\.?\d{0,2})\s+[¥￥]?\s*([\d,]+\.?\d{0,2})/)
  if (amountTaxMatch) {
    amount = parseFloat(amountTaxMatch[1].replace(/,/g, ''))
    taxAmount = parseFloat(amountTaxMatch[2].replace(/,/g, ''))
  }
  
  // 如果没有提取到合计，尝试通过金额+税额计算
  if (totalAmount === 0 && amount > 0 && taxAmount > 0) {
    totalAmount = amount + taxAmount
  }
  
  return {
    invoiceNumber,
    invoiceCode,
    amount: isNaN(amount) ? 0 : amount,
    taxAmount: isNaN(taxAmount) ? 0 : taxAmount,
    totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
    date,
    seller,
    buyer
  }
}
