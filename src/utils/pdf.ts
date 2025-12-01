import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Invoice } from '../types/invoice'

// 导出PDF
export async function exportToPDF(invoices: Invoice[], elementId: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const imgWidth = 210 // A4宽度
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
  pdf.save(`发票统计_${new Date().toLocaleDateString()}.pdf`)
}

// 生成打印内容HTML
export function generatePrintHTML(invoices: Invoice[]): string {
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const validInvoices = invoices.filter(inv => !inv.isDuplicate)

  return `
    <div style="padding: 20px; font-family: 'Microsoft YaHei', sans-serif;">
      <h1 style="text-align: center; margin-bottom: 30px;">发票统计报表</h1>
      
      <div style="margin-bottom: 20px;">
        <p><strong>统计日期:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>发票总数:</strong> ${validInvoices.length} 张</p>
        <p><strong>金额合计:</strong> ¥${totalAmount.toFixed(2)}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px;">序号</th>
            <th style="border: 1px solid #ddd; padding: 8px;">发票号码</th>
            <th style="border: 1px solid #ddd; padding: 8px;">发票代码</th>
            <th style="border: 1px solid #ddd; padding: 8px;">开票日期</th>
            <th style="border: 1px solid #ddd; padding: 8px;">销售方</th>
            <th style="border: 1px solid #ddd; padding: 8px;">金额</th>
            <th style="border: 1px solid #ddd; padding: 8px;">税额</th>
            <th style="border: 1px solid #ddd; padding: 8px;">价税合计</th>
          </tr>
        </thead>
        <tbody>
          ${validInvoices
            .map(
              (inv, index) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${inv.invoiceNumber}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${inv.invoiceCode}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${inv.date}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${inv.seller}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">¥${inv.amount.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">¥${inv.taxAmount.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">¥${inv.totalAmount.toFixed(2)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f9f9f9; font-weight: bold;">
            <td colspan="7" style="border: 1px solid #ddd; padding: 8px; text-align: right;">合计:</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">¥${totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `
}
