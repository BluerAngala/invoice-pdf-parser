// SiliconFlow API 客户端
export interface ApiConfig {
  apiKey: string
  apiUrl: string
}

// LLM 解析发票文本
export async function parseInvoiceByLLM(text: string, config: ApiConfig) {
  if (!config.apiKey || config.apiKey === 'your_api_key_here') {
    console.warn('⚠️ 未配置 API Key，跳过 LLM 解析')
    return null
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          {
            role: 'system',
            content:
              '你是发票信息提取助手。从用户提供的发票文本中提取关键信息，只返回JSON格式，不要其他内容。'
          },
          {
            role: 'user',
            content: `从以下发票文本中提取信息，返回JSON格式：
{
  "invoiceNumber": "发票号码(8-20位数字)",
  "invoiceCode": "发票代码(10-12位数字，全电发票可为空)",
  "date": "开票日期(YYYY-MM-DD格式)",
  "seller": "销售方名称",
  "buyer": "购买方名称", 
  "amount": 金额(数字),
  "taxAmount": 税额(数字),
  "totalAmount": 价税合计(数字)
}

发票文本：
${text.substring(0, 3000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      console.error(`LLM API错误: ${response.status}`)
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0])
      console.log('🤖 LLM 解析成功:', json.invoiceNumber)
      return {
        invoiceNumber: String(json.invoiceNumber || ''),
        invoiceCode: String(json.invoiceCode || ''),
        amount: parseFloat(json.amount) || 0,
        taxAmount: parseFloat(json.taxAmount) || 0,
        totalAmount: parseFloat(json.totalAmount) || 0,
        date: String(json.date || ''),
        seller: String(json.seller || ''),
        buyer: String(json.buyer || '')
      }
    }

    console.error('❌ LLM 返回内容无法解析')
    return null
  } catch (error) {
    console.error('LLM解析失败:', error)
    return null
  }
}

// OCR 识别图片
export async function recognizeImageByOCR(imageUrl: string, config: ApiConfig) {
  if (!config.apiKey || config.apiKey === 'your_api_key_here') {
    console.warn('⚠️ 未配置 API Key')
    return null
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
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
    })

    if (!response.ok) throw new Error(`API错误: ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0])
      console.log('📷 OCR 识别成功:', json.invoiceNumber)
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

    console.error('❌ OCR 返回内容无法解析')
    return null
  } catch (error) {
    console.error('OCR识别失败:', error)
    return null
  }
}
