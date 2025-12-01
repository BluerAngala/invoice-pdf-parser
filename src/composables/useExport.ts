import * as XLSX from 'xlsx'
import { exportToPDF, generatePrintHTML } from '../utils/pdf'
import type { Invoice } from '../types/invoice'

export function useExport() {
  // 导出Excel
  function exportExcel(invoices: Invoice[], totalAmount: number) {
    const validInvoices = invoices.filter(inv => !inv.isDuplicate)

    // 准备数据
    const data = validInvoices.map((inv, index) => ({
      序号: index + 1,
      发票号码: inv.invoiceNumber || '未识别',
      发票代码: inv.invoiceCode || '未识别',
      开票日期: inv.date || '未识别',
      销售方: inv.seller || '未识别',
      购买方: inv.buyer || '未识别',
      金额: inv.amount,
      税额: inv.taxAmount,
      价税合计: inv.totalAmount,
      文件名: inv.fileName
    }))

    // 添加合计行
    data.push({
      序号: '' as unknown as number,
      发票号码: '',
      发票代码: '',
      开票日期: '',
      销售方: '',
      购买方: '',
      金额: '' as unknown as number,
      税额: '合计:' as unknown as number,
      价税合计: totalAmount,
      文件名: ''
    })

    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(data)

    // 设置列宽
    ws['!cols'] = [
      { wch: 6 }, // 序号
      { wch: 22 }, // 发票号码
      { wch: 14 }, // 发票代码
      { wch: 12 }, // 开票日期
      { wch: 20 }, // 销售方
      { wch: 20 }, // 购买方
      { wch: 12 }, // 金额
      { wch: 12 }, // 税额
      { wch: 12 }, // 价税合计
      { wch: 30 } // 文件名
    ]

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '发票清单')

    // 导出文件
    const fileName = `发票统计_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // 导出PDF
  async function exportPdf(invoices: Invoice[]) {
    const printArea = document.getElementById('print-area')
    if (!printArea) return

    const validInvoices = invoices.filter(inv => !inv.isDuplicate)
    printArea.innerHTML = generatePrintHTML(validInvoices)
    printArea.style.display = 'block'

    await exportToPDF(validInvoices, 'print-area')
    printArea.style.display = 'none'
  }

  // 打印发票
  function printInvoices(invoices: Invoice[]) {
    const printArea = document.getElementById('print-area')
    if (!printArea) return

    const validInvoices = invoices.filter(inv => !inv.isDuplicate)
    printArea.innerHTML = generatePrintHTML(validInvoices)
    printArea.style.display = 'block'

    setTimeout(() => {
      window.print()
      printArea.style.display = 'none'
    }, 100)
  }

  return {
    exportExcel,
    exportPdf,
    printInvoices
  }
}
