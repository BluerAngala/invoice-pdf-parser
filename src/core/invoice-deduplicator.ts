// 发票去重器
import type { Invoice } from '../types/invoice'

// 检查重复发票
export function checkDuplicates(invoices: Invoice[], enabled: boolean) {
  if (!enabled) {
    invoices.forEach(inv => {
      inv.isDuplicate = false
      if (inv.status === 'duplicate') inv.status = 'valid'
    })
    return
  }

  // 重置状态
  invoices.forEach(inv => {
    inv.isDuplicate = false
    if (inv.status === 'duplicate') inv.status = 'valid'
  })

  // 记录第一次出现的发票
  const firstSeenIndex = new Map<string, number>()

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i]

    if (invoice.recognitionStatus !== 'success') {
      continue
    }

    const key = getDedupeKey(invoice)

    if (key) {
      const existingIndex = firstSeenIndex.get(key)
      if (existingIndex !== undefined) {
        invoice.isDuplicate = true
        invoice.status = 'duplicate'
      } else {
        firstSeenIndex.set(key, i)
      }
    }
  }
}

// 生成去重 key
function getDedupeKey(invoice: Invoice): string | null {
  // 优先使用发票号码
  const invoiceNum = invoice.invoiceNumber?.trim()
  if (invoiceNum) {
    return invoiceNum
  }

  // 使用发票代码+金额+日期
  const invoiceCode = invoice.invoiceCode?.trim()
  if (invoiceCode && invoice.totalAmount > 0) {
    const amountKey = invoice.totalAmount.toFixed(2)
    const dateKey = invoice.date?.trim() || ''
    return `code_${invoiceCode}_${amountKey}_${dateKey}`
  }

  // 使用金额+日期+销售方
  if (invoice.totalAmount > 0 && invoice.date?.trim() && invoice.seller?.trim()) {
    const amountKey = invoice.totalAmount.toFixed(2)
    const dateKey = invoice.date.trim()
    const sellerKey = invoice.seller.trim()
    return `amt_${amountKey}_${dateKey}_${sellerKey}`
  }

  return null
}
