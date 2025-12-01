// Excel 导出器
import * as XLSX from 'xlsx'
import type { Invoice } from '../types/invoice'

export function exportToExcel(invoices: Invoice[], totalAmount: number) {
  const validInvoices = invoices.filter(inv => !inv.isDuplicate && inv.status !== 'invalid')

  if (validInvoices.length === 0) {
    alert('没有可导出的有效发票')
    return
  }

  // 准备数据
  const data = validInvoices.map((inv, index) => {
    const isFullElectronic = inv.invoiceNumber && inv.invoiceNumber.length === 20
    return {
      序号: index + 1,
      发票号码: inv.invoiceNumber || '-',
      发票代码: inv.invoiceCode || (isFullElectronic ? '-' : ''),
      开票日期: inv.date || '-',
      销售方: inv.seller || '-',
      购买方: inv.buyer || '-',
      金额: inv.amount || 0,
      税额: inv.taxAmount || 0,
      价税合计: inv.totalAmount || 0,
      文件名: inv.fileName
    }
  })

  // 添加合计行
  const sumAmount = validInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const sumTax = validInvoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0)

  data.push({
    序号: '' as unknown as number,
    发票号码: '',
    发票代码: '',
    开票日期: '',
    销售方: '',
    购买方: '合计',
    金额: sumAmount,
    税额: sumTax,
    价税合计: totalAmount,
    文件名: ''
  })

  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  ws['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 }
  ]

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '发票清单')

  // 导出文件
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const fileName = `发票统计_${dateStr}.xlsx`
  XLSX.writeFile(wb, fileName)

  console.log(`📊 导出成功: ${fileName}，共 ${validInvoices.length} 张发票`)
}
