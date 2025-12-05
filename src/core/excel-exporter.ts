// Excel 导出器 - 使用 ExcelJS 支持图片嵌入
import ExcelJS from 'exceljs'
import type { Invoice } from '../types/invoice'

export async function exportToExcel(invoices: Invoice[]) {
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

  // 创建工作簿
  const wb = new ExcelJS.Workbook()

  // ========== 发票清单工作表 ==========
  const ws = wb.addWorksheet('发票清单')

  // 设置列宽
  ws.columns = [{ width: 8 }, { width: 24 }, { width: 14 }, { width: 14 }, { width: 50 }]

  // 添加表头
  const headerRow = ws.addRow(['序号', '发票号码', '金额', '开票日期', '文件名'])
  headerRow.height = 28
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  })

  // 添加数据行
  sortedInvoices.forEach((inv, index) => {
    const row = ws.addRow([
      index + 1,
      inv.invoiceNumber || '-',
      inv.totalAmount || 0,
      inv.date || '-',
      inv.fileName
    ])
    row.height = 24
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: colNumber === 5 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: colNumber === 5
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      }
      if (colNumber === 3) {
        cell.numFmt = '#,##0.00'
      }
    })
  })

  // 添加合计行
  const totalRow = ws.addRow(['', '合计', totalAmount, '', ''])
  totalRow.height = 28
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 12, color: colNumber === 3 ? { argb: 'FFFF0000' } : undefined }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
    if (colNumber === 3) {
      cell.numFmt = '#,##0.00'
    }
  })

  // ========== 使用说明工作表 ==========
  const noticeWs = wb.addWorksheet('使用说明')
  // 列布局：A(边距) | B(左) | C(图片居中) | D(右) | E(边距)
  // B+C+D 合并显示文字，图片单独放 C 列
  noticeWs.columns = [{ width: 3 }, { width: 20 }, { width: 26 }, { width: 20 }, { width: 3 }]

  // 通用边框样式
  const cardBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFE8E8E8' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE8E8E8' } },
    left: { style: 'thin' as const, color: { argb: 'FFE8E8E8' } },
    right: { style: 'thin' as const, color: { argb: 'FFE8E8E8' } }
  }

  // 辅助函数：合并 B-D 列并设置样式
  const addMergedRow = (
    text: string,
    height: number,
    font: Partial<ExcelJS.Font>,
    fill: ExcelJS.Fill,
    alignment: Partial<ExcelJS.Alignment>
  ) => {
    const rowNum = noticeWs.rowCount + 1
    const row = noticeWs.addRow(['', text, '', '', ''])
    row.height = height
    noticeWs.mergeCells(rowNum, 2, rowNum, 4) // 合并 B-D
    row.getCell(2).font = font
    row.getCell(2).fill = fill
    row.getCell(2).alignment = alignment
    row.getCell(2).border = cardBorder
    return row
  }

  // 空行
  noticeWs.addRow([''])

  // ===== 重要提示卡片 =====
  addMergedRow(
    '⚠️  重要提示',
    36,
    { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF4D4F' } },
    { horizontal: 'center', vertical: 'middle' }
  )

  // 提示内容
  const tips = [
    '本清单由「发票识别统计工具」自动生成，仅供参考',
    '请务必进行二次核查，确保数据准确无误',
    '如发现识别错误或有任何问题，欢迎联系反馈'
  ]
  tips.forEach((tip, idx) => {
    addMergedRow(
      `${idx + 1}. ${tip}`,
      28,
      { size: 12, color: { argb: 'FF666666' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5F5' } },
      { horizontal: 'left', vertical: 'middle', indent: 2 }
    )
  })

  // 空行
  noticeWs.addRow([''])
  noticeWs.addRow([''])

  // ===== 联系方式卡片 =====
  addMergedRow(
    '📱  联系方式',
    36,
    { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } },
    { horizontal: 'center', vertical: 'middle' }
  )

  // 说明文字
  addMergedRow(
    '扫描下方二维码关注公众号，获取更多资讯',
    32,
    { size: 12, color: { argb: 'FF666666' } },
    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } },
    { horizontal: 'center', vertical: 'middle' }
  )

  // 加载并嵌入公众号图片
  try {
    const response = await fetch('/公众号.png')
    const arrayBuffer = await response.arrayBuffer()
    const imageId = wb.addImage({
      buffer: arrayBuffer,
      extension: 'png'
    })

    // 图片尺寸
    const imgWpx = 180
    const imgHpx = 180

    // 添加图片占位行（带背景色）- 记录起始行号
    const imgStartRow = noticeWs.rowCount + 1
    for (let i = 0; i < 10; i++) {
      const rowNum = noticeWs.rowCount + 1
      const imgRow = noticeWs.addRow(['', '', '', '', ''])
      imgRow.height = 20
      noticeWs.mergeCells(rowNum, 2, rowNum, 4) // 合并 B-D
      imgRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } }
      imgRow.getCell(2).border = cardBorder
    }

    // 图片放在 C 列（col=2），C 列宽 26 字符 ≈ 182px，刚好放 180px 图片
    // 垂直方向：10 行 × 20pt = 200pt ≈ 267px，图片 180px，偏移约 1.5 行
    noticeWs.addImage(imageId, {
      tl: { col: 2, row: imgStartRow - 1 + 1 } as ExcelJS.Anchor,
      ext: { width: imgWpx, height: imgHpx }
    })
  } catch (e) {
    console.warn('无法加载公众号图片:', e)
    addMergedRow(
      '（请访问工具页面点击「联系反馈」按钮扫码）',
      28,
      { size: 11, color: { argb: 'FF999999' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FF' } },
      { horizontal: 'center', vertical: 'middle' }
    )
  }

  // 空行
  noticeWs.addRow([''])

  // ===== 感谢文字 =====
  addMergedRow(
    '💚  感谢您的使用！',
    32,
    { bold: true, size: 14, color: { argb: 'FF52C41A' } },
    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6FFED' } },
    { horizontal: 'center', vertical: 'middle' }
  )

  // 作者信息
  const authorRowNum = noticeWs.rowCount + 1
  const authorRow = noticeWs.addRow(['', '陈恒律师 · 自制开发', '', '', ''])
  authorRow.height = 24
  noticeWs.mergeCells(authorRowNum, 2, authorRowNum, 4)
  authorRow.getCell(2).font = { size: 11, color: { argb: 'FF999999' } }
  authorRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }

  // 生成文件名
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const dateTimeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const fileName = `发票统计_${totalAmount.toFixed(2)}元_${invoiceCount}张_${dateTimeStr}.xlsx`

  // 导出文件
  const buffer = await wb.xlsx.writeBuffer()
  // eslint-disable-next-line no-undef
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)

  // 显示导出成功提示
  showExportSuccess(fileName, invoiceCount, totalAmount)
}

// 显示导出成功提示
function showExportSuccess(fileName: string, count: number, amount: number) {
  // 创建提示元素
  const toast = document.createElement('div')
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 32px 48px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 10000;
      text-align: center;
      animation: fadeIn 0.3s ease;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <div style="font-size: 18px; font-weight: 600; color: #52c41a; margin-bottom: 12px;">导出成功！</div>
      <div style="font-size: 14px; color: #666; margin-bottom: 8px;">共 ${count} 张发票，合计 ¥${amount.toFixed(2)}</div>
      <div style="font-size: 12px; color: #999; word-break: break-all; max-width: 300px;">${fileName}</div>
    </div>
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.3);
      z-index: 9999;
    " onclick="this.parentElement.remove()"></div>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    </style>
  `
  document.body.appendChild(toast)

  // 3秒后自动关闭
  setTimeout(() => toast.remove(), 3000)
}
