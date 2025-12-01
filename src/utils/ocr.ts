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

// 识别发票 - 支持一页多张发票
export async function recognizeInvoice(
  imageUrl: string,
  fileName: string,
  pdfData?: PdfParseData
): Promise<InvoiceData> {
  // 如果有PDF文本，优先从文本提取
  if (pdfData && pdfData.fullText) {
    const result = parseInvoiceFromPdf(pdfData)
    if (result.invoiceNumber || result.totalAmount > 0) {
      // console.log(`📄 PDF文本识别成功: ${fileName}`)
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

// 检测并识别多张发票（一页多张的情况）
export function recognizeMultipleInvoices(pdfData: PdfParseData): InvoiceData[] {
  const { fullText, items } = pdfData
  const results: InvoiceData[] = []

  // 查找所有发票号码及其对应的金额
  // 使用更精确的模式：查找发票号码和紧随其后的小写金额
  const invoiceBlocks = findInvoiceBlocks(fullText)

  // 如果只有一张或没有发票号码，使用普通识别
  if (invoiceBlocks.length <= 1) {
    const result = parseInvoiceFromPdf(pdfData)
    if (result.invoiceNumber || result.totalAmount > 0) {
      results.push(result)
    }
    return results
  }

  console.log(`📄 检测到 ${invoiceBlocks.length} 张发票`)

  // 直接使用提取到的发票块信息
  for (const block of invoiceBlocks) {
    const result: InvoiceData = {
      invoiceNumber: block.invoiceNumber,
      invoiceCode: block.invoiceCode,
      amount: 0,
      taxAmount: 0,
      totalAmount: block.totalAmount,
      date: block.date,
      seller: '',
      buyer: ''
    }

    // 尝试从分割的文本中提取更多信息
    if (block.text && items && items.length > 0) {
      const blockData: PdfParseData = {
        fullText: block.text,
        text: block.text,
        items: []
      }
      const parsed = parseInvoiceFromPdf(blockData)
      if (parsed.seller) result.seller = parsed.seller
      if (parsed.buyer) result.buyer = parsed.buyer
      if (parsed.amount) result.amount = parsed.amount
      if (parsed.taxAmount) result.taxAmount = parsed.taxAmount
    }

    results.push(result)
  }

  return results
}

// 查找发票块（发票号码 + 金额的组合）
interface InvoiceBlock {
  invoiceNumber: string
  invoiceCode: string
  totalAmount: number
  date: string
  text: string
  startIndex: number
  endIndex: number
}

function findInvoiceBlocks(fullText: string): InvoiceBlock[] {
  const blocks: InvoiceBlock[] = []

  // 查找所有发票号码（多种格式）
  const numMatches: { number: string; index: number }[] = []

  // 模式1: 发票号码/号码 + 数字
  const pattern1 = /(?:发票号码|号码)[:：]?\s*(\d{8,20})/g
  let match
  while ((match = pattern1.exec(fullText)) !== null) {
    numMatches.push({ number: match[1], index: match.index })
  }

  // 模式2: 直接查找20位数字（全电发票）
  if (numMatches.length === 0) {
    const pattern2 = /(\d{20})/g
    while ((match = pattern2.exec(fullText)) !== null) {
      // 排除可能是其他数字的情况（如税号）
      const before = fullText.substring(Math.max(0, match.index - 20), match.index)
      if (!before.includes('纳税人识别号') && !before.includes('统一社会信用代码')) {
        numMatches.push({ number: match[1], index: match.index })
      }
    }
  }

  // 模式3: 查找8位数字发票号码（传统发票）
  if (numMatches.length === 0) {
    const pattern3 = /(?:No|NO|no)[.:]?\s*(\d{8})/g
    while ((match = pattern3.exec(fullText)) !== null) {
      numMatches.push({ number: match[1], index: match.index })
    }
  }

  // 模式4: 通过"价税合计"或"小写"来分割多张发票
  if (numMatches.length <= 1) {
    const amountSplitPattern = /[（(]小写[）)]/g
    const amountPositions: number[] = []
    while ((match = amountSplitPattern.exec(fullText)) !== null) {
      amountPositions.push(match.index)
    }

    // 如果找到多个小写金额，说明有多张发票
    if (amountPositions.length > 1 && numMatches.length <= 1) {
      console.log(`📄 通过金额位置检测到 ${amountPositions.length} 张发票`)
      // 为每个金额位置创建一个虚拟的发票块
      return findInvoiceBlocksByAmount(fullText, amountPositions)
    }
  }

  if (numMatches.length === 0) return blocks

  // 查找所有小写金额（价税合计）
  const amountPattern = /[（(]?小写[）)]?[:：]?\s*[¥￥]?\s*([0-9,]+\.?\d{0,2})/g
  const amountMatches: { amount: number; index: number }[] = []
  while ((match = amountPattern.exec(fullText)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''))
    if (amount > 0) {
      amountMatches.push({ amount, index: match.index })
    }
  }

  // 查找所有日期
  const datePattern = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g
  const dateMatches: { date: string; index: number }[] = []
  while ((match = datePattern.exec(fullText)) !== null) {
    const date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    dateMatches.push({ date, index: match.index })
  }

  // 为每个发票号码匹配最近的金额和日期
  for (let i = 0; i < numMatches.length; i++) {
    const numMatch = numMatches[i]
    const nextNumIndex = i < numMatches.length - 1 ? numMatches[i + 1].index : fullText.length

    // 在当前发票号码和下一个发票号码之间查找金额
    let totalAmount = 0
    for (const am of amountMatches) {
      if (am.index > numMatch.index && am.index < nextNumIndex) {
        totalAmount = am.amount
        break // 取第一个匹配的金额
      }
    }

    // 如果没找到小写金额，尝试查找 ¥ 金额
    if (!totalAmount) {
      const segmentText = fullText.substring(numMatch.index, nextNumIndex)
      const yenMatch = segmentText.match(/[¥￥]\s*([0-9,]+\.\d{2})/)
      if (yenMatch) {
        totalAmount = parseFloat(yenMatch[1].replace(/,/g, ''))
      }
    }

    // 查找日期
    let date = ''
    for (const dm of dateMatches) {
      if (dm.index > numMatch.index - 200 && dm.index < nextNumIndex) {
        date = dm.date
        break
      }
    }

    // 查找发票代码（在发票号码之前）
    let invoiceCode = ''
    const codeSearchStart = Math.max(0, numMatch.index - 100)
    const codeSegment = fullText.substring(codeSearchStart, numMatch.index)
    const codeMatch = codeSegment.match(/发票代码[:：]?\s*(\d{10,12})/)
    if (codeMatch) {
      invoiceCode = codeMatch[1]
    }

    blocks.push({
      invoiceNumber: numMatch.number,
      invoiceCode,
      totalAmount,
      date,
      text: fullText.substring(numMatch.index, nextNumIndex),
      startIndex: numMatch.index,
      endIndex: nextNumIndex
    })
  }

  return blocks
}

// 通过金额位置分割发票（当发票号码检测失败时的备用方案）
function findInvoiceBlocksByAmount(fullText: string, amountPositions: number[]): InvoiceBlock[] {
  const blocks: InvoiceBlock[] = []

  for (let i = 0; i < amountPositions.length; i++) {
    const amountPos = amountPositions[i]
    // 向前查找该发票的起始位置（上一个金额位置或文本开头）
    const startIndex = i > 0 ? amountPositions[i - 1] + 50 : 0
    const endIndex = amountPos + 100 // 金额后面一点

    const segmentText = fullText.substring(startIndex, endIndex)

    // 提取金额
    let totalAmount = 0
    const amountMatch = segmentText.match(/[（(]小写[）)][:：]?\s*[¥￥]?\s*([0-9,]+\.?\d{0,2})/)
    if (amountMatch) {
      totalAmount = parseFloat(amountMatch[1].replace(/,/g, ''))
    }

    // 提取发票号码
    let invoiceNumber = ''
    const numMatch = segmentText.match(/(?:发票号码|号码)[:：]?\s*(\d{8,20})/)
    if (numMatch) {
      invoiceNumber = numMatch[1]
    } else {
      // 尝试查找20位数字
      const num20Match = segmentText.match(/(\d{20})/)
      if (num20Match) {
        invoiceNumber = num20Match[1]
      }
    }

    // 提取发票代码
    let invoiceCode = ''
    const codeMatch = segmentText.match(/发票代码[:：]?\s*(\d{10,12})/)
    if (codeMatch) {
      invoiceCode = codeMatch[1]
    }

    // 提取日期
    let date = ''
    const dateMatch = segmentText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
    if (dateMatch) {
      date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
    }

    if (totalAmount > 0 || invoiceNumber) {
      blocks.push({
        invoiceNumber,
        invoiceCode,
        totalAmount,
        date,
        text: segmentText,
        startIndex,
        endIndex
      })
    }
  }

  return blocks
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
  let invoiceNumber = ''
  const invoiceNumPatterns = [
    /发票号码[:：]?\s*(\d{20})/, // 全电发票20位
    /发票号码[:：]?\s*(\d{8,12})/, // 传统发票8-12位
    /号码[:：]?\s*(\d{20})/, // 简写
    /号码[:：]?\s*(\d{8})/, // 简写8位
    /No[:：.]?\s*(\d{8,20})/i // 英文格式
  ]
  for (const pattern of invoiceNumPatterns) {
    const match = fullText.match(pattern)
    if (match) {
      invoiceNumber = match[1]
      break
    }
  }

  // === 发票代码 ===
  // 全电发票（20位号码）不需要代码
  let invoiceCode = ''
  if (!invoiceNumber || invoiceNumber.length !== 20) {
    const codePatterns = [
      /发票代码[:：]?\s*(\d{10,12})/, // 标准格式
      /代码[:：]?\s*(\d{10,12})/, // 简写
      /发票代码\s*(\d{10,12})/, // 无冒号
      /(\d{10,12})\s*发票代码/, // 代码在前
    ]
    for (const pattern of codePatterns) {
      const match = fullText.match(pattern)
      if (match) {
        invoiceCode = match[1]
        break
      }
    }
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
  const totalAmountReg = /价税合计[\s\S]*?小写.*?[¥￥:：]\s*([0-9,]+\.?\d{0,2})/
  const totalMatch = fullText.match(totalAmountReg)
  if (totalMatch) {
    totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''))
  }

  // 方法2: (小写): ¥金额 或 （小写）¥金额
  if (!totalAmount) {
    const lowerCaseMatch = fullText.match(/[（(]小写[）)][:：]?\s*[¥￥]?\s*([0-9,]+\.?\d{0,2})/)
    if (lowerCaseMatch) {
      totalAmount = parseFloat(lowerCaseMatch[1].replace(/,/g, ''))
    }
  }

  // 方法3: 小写¥金额（无括号）
  if (!totalAmount) {
    const simpleMatch = fullText.match(/小写[：:\s]*[¥￥]\s*([0-9,]+\.?\d{0,2})/)
    if (simpleMatch) {
      totalAmount = parseFloat(simpleMatch[1].replace(/,/g, ''))
    }
  }

  // 方法4: 价税合计后直接跟金额
  if (!totalAmount) {
    const directMatch = fullText.match(/价税合计[（(]大写[）)][^0-9]*[¥￥]?\s*([0-9,]+\.?\d{0,2})/)
    if (directMatch) {
      totalAmount = parseFloat(directMatch[1].replace(/,/g, ''))
    }
  }

  // 方法5: 查找 ¥ 后面的金额（常见格式）
  if (!totalAmount) {
    const yenMatch = fullText.match(/[¥￥]\s*([0-9,]+\.\d{2})/)
    if (yenMatch) {
      totalAmount = parseFloat(yenMatch[1].replace(/,/g, ''))
    }
  }

  // 方法6: 查找最大金额（兜底）
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
    const findValueInColumn = (columnItems: PdfTextItem[], labelRegex: RegExp): string | null => {
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
    const buyerPatterns = [
      /购\s*买\s*方[\s\S]{0,50}?名\s*称[:：]?\s*([^\s\n统一社会]{2,50})/,
      /购买方名称[:：]?\s*(.+?)(?:\s|$|统一社会)/,
      /购\s*方[:：]?\s*(.+?)(?:\s|$|统一)/,
    ]
    for (const pattern of buyerPatterns) {
      const match = fullText.match(pattern)
      if (match && match[1].trim().length > 1) {
        buyer = match[1].trim()
        break
      }
    }
  }

  if (!seller) {
    const sellerPatterns = [
      /销\s*售\s*方[\s\S]{0,50}?名\s*称[:：]?\s*([^\s\n统一社会]{2,50})/,
      /销售方名称[:：]?\s*(.+?)(?:\s|$|统一社会)/,
      /销\s*方[:：]?\s*(.+?)(?:\s|$|统一)/,
      /销售方[:：]?\s*(.+?)(?:\s|$|统一)/,
      // 全电发票格式：销售方信息在特定位置
      /销售方\s*名称[:：]?\s*([^统一\s]{2,50})/,
      // 查找"有限公司"结尾的公司名
      /名称[:：]?\s*([^统一\s]*?有限公司[^统一\s]*)/,
    ]
    for (const pattern of sellerPatterns) {
      const match = fullText.match(pattern)
      if (match && match[1].trim().length > 1) {
        seller = match[1].trim()
        break
      }
    }
  }

  // 清理销售方名称中的多余字符
  if (seller) {
    seller = seller.replace(/[:：\s（(].*/g, '').trim()
    // 移除末尾的 "(章)" 等
    seller = seller.replace(/[（(]章[）)]?$/g, '').trim()
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
