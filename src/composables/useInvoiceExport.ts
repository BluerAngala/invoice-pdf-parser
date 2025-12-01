// 发票导出功能
import { exportToExcel } from '../core/excel-exporter'
import { exportToPDF, printInvoices } from '../core/pdf-exporter'
import type { Invoice } from '../types/invoice'

export function useInvoiceExport() {
  // 导出 Excel
  function exportExcel(invoices: Invoice[], totalAmount: number) {
    exportToExcel(invoices, totalAmount)
  }

  // 导出 PDF
  async function exportPdf(invoices: Invoice[]) {
    const printArea = document.getElementById('print-area')
    if (!printArea) return

    const validInvoices = invoices.filter(inv => !inv.isDuplicate)
    await exportToPDF(validInvoices, 'print-area')
  }

  // 打印
  function print(invoices: Invoice[]) {
    printInvoices(invoices)
  }

  return {
    exportExcel,
    exportPdf,
    print
  }
}
