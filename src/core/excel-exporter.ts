// Excel 导出器
import XLSX from 'xlsx-js-style'
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

  // 计算总金额
  const totalAmount = sortedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  const invoiceCount = sortedInvoices.length

  // 表头样式
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    fill: { fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  }

  // 数据行样式
  const dataStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D9D9D9' } },
      bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
      left: { style: 'thin', color: { rgb: 'D9D9D9' } },
      right: { style: 'thin', color: { rgb: 'D9D9D9' } }
    }
  }

  // 文件名样式（自动换行）
  const fileNameStyle = {
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'D9D9D9' } },
      bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
      left: { style: 'thin', color: { rgb: 'D9D9D9' } },
      right: { style: 'thin', color: { rgb: 'D9D9D9' } }
    }
  }

  // 金额样式
  const amountStyle = {
    ...dataStyle,
    numFmt: '#,##0.00'
  }

  // 合计行样式
  const totalStyle = {
    font: { bold: true, sz: 12 },
    fill: { fgColor: { rgb: 'FFF2CC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  }

  const totalAmountStyle = {
    ...totalStyle,
    font: { bold: true, sz: 12, color: { rgb: 'FF0000' } },
    numFmt: '#,##0.00'
  }

  // 构建数据
  const headers = ['序号', '发票号码', '金额', '开票日期', '文件名']
  const rows = sortedInvoices.map((inv, index) => [
    index + 1,
    inv.invoiceNumber || '-',
    inv.totalAmount || 0,
    inv.date || '-',
    inv.fileName
  ])

  // 添加合计行
  rows.push(['', '合计', totalAmount, '', ''])

  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // 设置列宽
  ws['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 50 }
  ]

  // 设置行高
  ws['!rows'] = [{ hpt: 28 }]
  for (let i = 1; i <= rows.length; i++) {
    ws['!rows'][i] = { hpt: 24 }
  }

  // 应用表头样式
  const cols = ['A', 'B', 'C', 'D', 'E']
  cols.forEach(col => {
    const cell = ws[`${col}1`]
    if (cell) cell.s = headerStyle
  })

  // 应用数据行样式
  for (let i = 2; i <= rows.length; i++) {
    cols.forEach((col, colIndex) => {
      const cell = ws[`${col}${i}`]
      if (cell) {
        if (colIndex === 2) {
          cell.s = amountStyle
        } else if (colIndex === 4) {
          cell.s = fileNameStyle
        } else {
          cell.s = dataStyle
        }
      }
    })
  }

  // 应用合计行样式
  const totalRowIndex = rows.length + 1
  cols.forEach((col, colIndex) => {
    const cell = ws[`${col}${totalRowIndex}`]
    if (cell) {
      cell.s = colIndex === 2 ? totalAmountStyle : totalStyle
    }
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '发票清单')

  // 生成文件名：发票统计_总金额_发票数量_年月日时分秒
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const dateTimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const fileName = `发票统计_${totalAmount.toFixed(2)}元_${invoiceCount}张_${dateTimeStr}.xlsx`

  // 使用浏览器兼容的方式下载文件
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  console.log(`导出成功: ${fileName}`)
}
