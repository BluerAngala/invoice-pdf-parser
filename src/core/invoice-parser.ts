// 发票解析器 - 使用正则从文本中提取发票信息
import type { PdfTextItem } from '../types/invoice'

export interface InvoiceData {
  invoiceNumber: string
  invoiceCode: string
  amount: number
  taxAmount: number
  totalAmount: number
  date: string
  seller: string
  buyer: string
}

export interface PdfParseData {
  fullText: string
  text: string
  items: PdfTextItem[]
}

// 从 PDF 数据解析发票信息
export function parseInvoiceFromPdf(pdfData: PdfParseData): InvoiceData {
  const { fullText, items } = pdfData

  // 发票号码
  let invoiceNumber = ''
  const invoiceNumPatterns = [
    /发票号码[:：]?\s*(\d{20})/,
    /发票号码[:：]?\s*(\d{8,12})/,
    /号码[:：]?\s*(\d{20})/,
    /号码[:：]?\s*(\d{8})/,
    /No[:：.]?\s*(\d{8,20})/i
  ]
  for (const pattern of invoiceNumPatterns) {
    const match = fullText.match(pattern)
    if (match) {
      invoiceNumber = match[1]
      break
    }
  }

  // 发票代码（全电发票不需要）
  let invoiceCode = ''
  if (!invoiceNumber || invoiceNumber.length !== 20) {
    const codePatterns = [
      /发票代码[:：]?\s*(\d{10,12})/,
      /代码[:：]?\s*(\d{10,12})/,
      /发票代码\s*(\d{10,12})/,
      /(\d{10,12})\s*发票代码/
    ]
    for (const pattern of codePatterns) {
      const match = fullText.match(pattern)
      if (match) {
        invoiceCode = match[1]
        break
      }
    }
  }

  // 开票日期
  let date = ''
  const dateMatch = fullText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
  }

  // 价税合计
  let totalAmount = 0
  const totalPatterns = [
    /价税合计[\s\S]*?小写.*?[¥￥:：]\s*([0-9,]+\.?\d{0,2})/,
    /[（(]小写[）)][:：]?\s*[¥￥]?\s*([0-9,]+\.?\d{0,2})/,
    /小写[：:\s]*[¥￥]\s*([0-9,]+\.?\d{0,2})/,
    /价税合计[（(]大写[）)][^0-9]*[¥￥]?\s*([0-9,]+\.?\d{0,2})/,
    /[¥￥]\s*([0-9,]+\.\d{2})/
  ]
  for (const pattern of totalPatterns) {
    const match = fullText.match(pattern)
    if (match) {
      totalAmount = parseFloat(match[1].replace(/,/g, ''))
      break
    }
  }

  // 兜底：查找最大金额
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

  // 金额和税额
  let amount = 0
  let taxAmount = 0
  const amountTaxMatch = fullText.match(
    /合\s*计\s+[¥￥]?\s*([\d,]+\.?\d{0,2})\s+[¥￥]?\s*([\d,]+\.?\d{0,2})/
  )
  if (amountTaxMatch) {
    amount = parseFloat(amountTaxMatch[1].replace(/,/g, ''))
    taxAmount = parseFloat(amountTaxMatch[2].replace(/,/g, ''))
  }

  // 购买方和销售方（使用分栏策略）
  let buyer = ''
  let seller = ''

  if (items && items.length > 0) {
    const maxX = Math.max(...items.map(item => item.x))
    const midX = maxX / 2 || 300

    const leftItems = items.filter(item => item.x < midX)
    const rightItems = items.filter(item => item.x >= midX)

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

    buyer =
      findValueInColumn(leftItems, /名称[:：]/) ||
      findValueInColumn(leftItems, /购\s*买\s*方/) ||
      ''
    seller =
      findValueInColumn(rightItems, /名称[:：]/) ||
      findValueInColumn(rightItems, /销\s*售\s*方/) ||
      ''
  }

  // 正则兜底
  if (!buyer) {
    const buyerPatterns = [
      /购\s*买\s*方[\s\S]{0,50}?名\s*称[:：]?\s*([^\s\n统一社会]{2,50})/,
      /购买方名称[:：]?\s*(.+?)(?:\s|$|统一社会)/,
      /购\s*方[:：]?\s*(.+?)(?:\s|$|统一)/,
      /购买方\s*名称[:：]?\s*([^统一\s]{2,50})/,
      /购买方[\s\S]{0,30}?([^统一\s]*?有限公司[^统一\s]*)/
    ]
    for (const pattern of buyerPatterns) {
      const match = fullText.match(pattern)
      if (match && match[1].trim().length > 1) {
        buyer = match[1]
          .trim()
          .replace(/[:：\s（(].*/g, '')
          .replace(/[（(]章[）)]?$/g, '')
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
      /销售方\s*名称[:：]?\s*([^统一\s]{2,50})/,
      /名称[:：]?\s*([^统一\s]*?有限公司[^统一\s]*)/
    ]
    for (const pattern of sellerPatterns) {
      const match = fullText.match(pattern)
      if (match && match[1].trim().length > 1) {
        seller = match[1]
          .trim()
          .replace(/[:：\s（(].*/g, '')
          .replace(/[（(]章[）)]?$/g, '')
        break
      }
    }
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

// 检测并解析多张发票
export function parseMultipleInvoices(pdfData: PdfParseData): InvoiceData[] {
  const { fullText } = pdfData
  const results: InvoiceData[] = []

  const invoiceBlocks = findInvoiceBlocks(fullText)

  if (invoiceBlocks.length <= 1) {
    const result = parseInvoiceFromPdf(pdfData)
    if (result.invoiceNumber || result.totalAmount > 0) {
      results.push(result)
    }
    return results
  }

  console.log(`📄 检测到 ${invoiceBlocks.length} 张发票`)

  for (const block of invoiceBlocks) {
    const blockText = block.text || ''
    let seller = ''
    let buyer = ''
    let amount = 0
    let taxAmount = 0

    // 提取销售方
    const sellerPatterns = [
      /销\s*售\s*方[\s\S]{0,30}?名\s*称[:：]?\s*([^\s\n统一社会纳税人识别号]{2,50})/,
      /销售方名称[:：]?\s*([^\s\n统一]{2,50})/,
      /销\s*方[:：]?\s*([^\s\n统一]{2,50})/
    ]
    for (const pattern of sellerPatterns) {
      const match = blockText.match(pattern)
      if (match && match[1].trim().length > 1) {
        seller = match[1]
          .trim()
          .replace(/[:：\s（(].*/g, '')
          .replace(/[（(]章[）)]?$/g, '')
        break
      }
    }

    // 提取购买方
    const buyerPatterns = [
      /购\s*买\s*方[\s\S]{0,30}?名\s*称[:：]?\s*([^\s\n统一社会纳税人识别号]{2,50})/,
      /购买方名称[:：]?\s*([^\s\n统一]{2,50})/,
      /购\s*方[:：]?\s*([^\s\n统一]{2,50})/
    ]
    for (const pattern of buyerPatterns) {
      const match = blockText.match(pattern)
      if (match && match[1].trim().length > 1) {
        buyer = match[1]
          .trim()
          .replace(/[:：\s（(].*/g, '')
          .replace(/[（(]章[）)]?$/g, '')
        break
      }
    }

    // 提取金额和税额
    const amountTaxMatch = blockText.match(
      /合\s*计\s+[¥￥]?\s*([\d,]+\.?\d{0,2})\s+[¥￥]?\s*([\d,]+\.?\d{0,2})/
    )
    if (amountTaxMatch) {
      amount = parseFloat(amountTaxMatch[1].replace(/,/g, ''))
      taxAmount = parseFloat(amountTaxMatch[2].replace(/,/g, ''))
    }

    results.push({
      invoiceNumber: block.invoiceNumber,
      invoiceCode: block.invoiceCode,
      amount,
      taxAmount,
      totalAmount: block.totalAmount,
      date: block.date,
      seller,
      buyer
    })
  }

  return results
}

// 查找发票块
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

  // 查找所有发票号码
  const numMatches: { number: string; index: number }[] = []
  const patterns = [
    /(?:发票号码|号码)[:：]?\s*(\d{8,20})/g,
    /(\d{20})/g,
    /(?:No|NO|no)[.:]?\s*(\d{8})/g
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(fullText)) !== null) {
      const before = fullText.substring(Math.max(0, match.index - 20), match.index)
      if (!before.includes('纳税人识别号') && !before.includes('统一社会信用代码')) {
        numMatches.push({ number: match[1], index: match.index })
      }
    }
    if (numMatches.length > 0) break
  }

  // 通过金额位置分割
  if (numMatches.length <= 1) {
    const amountSplitPattern = /[（(]小写[）)]/g
    const amountPositions: number[] = []
    let match
    while ((match = amountSplitPattern.exec(fullText)) !== null) {
      amountPositions.push(match.index)
    }

    if (amountPositions.length > 1) {
      console.log(`📄 通过金额位置检测到 ${amountPositions.length} 张发票`)
      return findInvoiceBlocksByAmount(fullText, amountPositions)
    }
  }

  if (numMatches.length === 0) return blocks

  // 查找金额
  const amountPattern = /[（(]?小写[）)]?[:：]?\s*[¥￥]?\s*([0-9,]+\.?\d{0,2})/g
  const amountMatches: { amount: number; index: number }[] = []
  let match
  while ((match = amountPattern.exec(fullText)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''))
    if (amount > 0) {
      amountMatches.push({ amount, index: match.index })
    }
  }

  // 查找日期
  const datePattern = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g
  const dateMatches: { date: string; index: number }[] = []
  while ((match = datePattern.exec(fullText)) !== null) {
    const date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    dateMatches.push({ date, index: match.index })
  }

  // 为每个发票号码匹配金额和日期
  for (let i = 0; i < numMatches.length; i++) {
    const numMatch = numMatches[i]
    const nextNumIndex = i < numMatches.length - 1 ? numMatches[i + 1].index : fullText.length

    let totalAmount = 0
    for (const am of amountMatches) {
      if (am.index > numMatch.index && am.index < nextNumIndex) {
        totalAmount = am.amount
        break
      }
    }

    if (!totalAmount) {
      const segmentText = fullText.substring(numMatch.index, nextNumIndex)
      const yenMatch = segmentText.match(/[¥￥]\s*([0-9,]+\.\d{2})/)
      if (yenMatch) {
        totalAmount = parseFloat(yenMatch[1].replace(/,/g, ''))
      }
    }

    let date = ''
    for (const dm of dateMatches) {
      if (dm.index > numMatch.index - 200 && dm.index < nextNumIndex) {
        date = dm.date
        break
      }
    }

    let invoiceCode = ''
    const codeSearchStart = Math.max(0, numMatch.index - 100)
    const codeSegment = fullText.substring(codeSearchStart, numMatch.index)
    const codeMatch = codeSegment.match(/发票代码[:：]?\s*(\d{10,12})/)
    if (codeMatch) {
      invoiceCode = codeMatch[1]
    }

    const textStartIndex = i > 0 ? numMatches[i - 1].index + 50 : 0
    blocks.push({
      invoiceNumber: numMatch.number,
      invoiceCode,
      totalAmount,
      date,
      text: fullText.substring(textStartIndex, nextNumIndex),
      startIndex: numMatch.index,
      endIndex: nextNumIndex
    })
  }

  return blocks
}

function findInvoiceBlocksByAmount(fullText: string, amountPositions: number[]): InvoiceBlock[] {
  const blocks: InvoiceBlock[] = []

  for (let i = 0; i < amountPositions.length; i++) {
    const startIndex = i > 0 ? amountPositions[i - 1] + 50 : 0
    const endIndex = i < amountPositions.length - 1 ? amountPositions[i + 1] : fullText.length
    const segmentText = fullText.substring(startIndex, endIndex)

    let totalAmount = 0
    const amountMatch = segmentText.match(/[（(]小写[）)][:：]?\s*[¥￥]?\s*([0-9,]+\.?\d{0,2})/)
    if (amountMatch) {
      totalAmount = parseFloat(amountMatch[1].replace(/,/g, ''))
    }

    let invoiceNumber = ''
    const numMatch = segmentText.match(/(?:发票号码|号码)[:：]?\s*(\d{8,20})/)
    if (numMatch) {
      invoiceNumber = numMatch[1]
    } else {
      const num20Match = segmentText.match(/(\d{20})/)
      if (num20Match) {
        invoiceNumber = num20Match[1]
      }
    }

    let invoiceCode = ''
    const codeMatch = segmentText.match(/发票代码[:：]?\s*(\d{10,12})/)
    if (codeMatch) {
      invoiceCode = codeMatch[1]
    }

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
