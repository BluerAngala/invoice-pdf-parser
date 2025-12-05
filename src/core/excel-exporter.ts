// Excel 导出器
import * as XLSX from 'xlsx'
import type { Invoice } from '../types/invoice'

export function exportToExcel(invoices: Invoice[]) {
  const validInvoices = invoices.filter(inv => !inv.isDuplicate && inv.status !== 'invalid')

  if (validInvoices.length === 0) {
    alert('没有可导出的有效发票')
    return
  }

  // 按开票日期排序
  const sortedInvoices = [...validInvoices].sort((a, b) => {
    const dateA = a.date || ''
    const dateB = b.date || ''
    return dateA.localeCompare(dateB)
  })

  // 准备数据：序号、发票号码、金额、开票日期、文件名
  const data = sortedInvoices.map((inv, index) => ({
    序号: index + 1,
    发票号码: inv.invoiceNumber || '-',
    金额: inv.totalAmount || 0,
    开票日期: inv.date || '-',
    文件名: inv.fileName
  }))

  // 计算总金额
  const totalAmount = sortedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

  // 添加合计行
  data.push({
    序号: '' as unknown as number,
    发票号码: '合计',
    金额: totalAmount,
    开票日期: '',
    文件名: ''
  })

  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  ws['!cols'] = [
    { wch: 6 },
    { wch: 22 },
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

  console.log(`📊 导出成功: ${fileName}，共 ${sortedInvoices.length} 张发票，总金额: ${totalAmount}`)
}
