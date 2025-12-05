// 发票导出功能
import { exportToExcel } from '../core/excel-exporter'
import type { Invoice } from '../types/invoice'

export function useInvoiceExport() {
  // 导出 Excel
  function exportExcel(invoices: Invoice[]) {
    exportToExcel(invoices)
  }

  return {
    exportExcel
  }
}
