// 发票导出功能
import { exportToExcel } from '../core/excel-exporter'
import type { Invoice } from '../types/invoice'

export function useInvoiceExport() {
  // 导出 Excel
  async function exportExcel(invoices: Invoice[]) {
    await exportToExcel(invoices)
  }

  return {
    exportExcel
  }
}
