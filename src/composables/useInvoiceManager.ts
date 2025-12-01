import { ref, computed } from 'vue'
import type { Invoice, RecognitionProgress } from '../types/invoice'
import { extractPdfText, isPdfFile } from '../utils/pdfExtract'
import {
  recognizeInvoice,
  recognizeMultipleInvoices,
  type PdfParseData,
  type InvoiceData
} from '../utils/ocr'

export function useInvoiceManager() {
  const invoices = ref<Invoice[]>([])
  const currentInvoice = ref<Invoice | null>(null)
  const isProcessing = ref(false)
  const enableDuplicateRemoval = ref(true)
  const progress = ref<RecognitionProgress>({
    current: 0,
    total: 0,
    status: '准备中...'
  })

  // 计算属性
  const progressPercent = computed(() => {
    if (progress.value.total === 0) return 0
    return (progress.value.current / progress.value.total) * 100
  })

  // 有效发票数量（排除重复）
  const validInvoiceCount = computed(() => {
    return invoices.value.filter(inv => !inv.isDuplicate).length
  })

  // 总金额（所有导入的发票，不排除重复）
  const totalAmount = computed(() => {
    return invoices.value.reduce((sum, inv) => sum + inv.totalAmount, 0)
  })

  // 去重后的金额（排除重复发票）
  const uniqueTotalAmount = computed(() => {
    return invoices.value
      .filter(inv => !inv.isDuplicate)
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
  })

  // 选择发票
  function selectInvoice(id: string) {
    currentInvoice.value = invoices.value.find(inv => inv.id === id) || null
  }

  // 创建发票对象
  function createInvoice(fileName: string, imageUrl: string, sourceFile: string): Invoice {
    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      fileName,
      sourceFile,
      imageUrl,
      invoiceNumber: '',
      invoiceCode: '',
      amount: 0,
      taxAmount: 0,
      totalAmount: 0,
      date: '',
      seller: '',
      buyer: '',
      isDuplicate: false,
      recognitionStatus: 'processing'
    }
  }

  // 文件数量（去重后的 sourceFile）
  const fileCount = computed(() => {
    const files = new Set(invoices.value.map(inv => inv.sourceFile))
    return files.size
  })

  // 应用识别结果到发票对象
  function applyInvoiceData(invoice: Invoice, data: InvoiceData) {
    invoice.invoiceNumber = data.invoiceNumber
    invoice.invoiceCode = data.invoiceCode
    invoice.amount = data.amount
    invoice.taxAmount = data.taxAmount
    invoice.totalAmount = data.totalAmount
    invoice.date = data.date
    invoice.seller = data.seller
    invoice.buyer = data.buyer

    const hasContent = data.invoiceNumber || data.invoiceCode || data.totalAmount > 0
    invoice.recognitionStatus = hasContent ? 'success' : 'error'

    if (enableDuplicateRemoval.value) {
      // 延迟检查重复，等所有发票添加完成
      setTimeout(() => checkDuplicates(), 100)
    }
  }

  // 处理文件上传
  async function handleFileUpload(files: FileList) {
    if (!files || files.length === 0) return

    console.log(`📁 开始处理文件夹，总文件数: ${files.length}`)

    // 统计信息
    const stats = {
      total: files.length,
      supported: 0,
      skipped: 0,
      processed: 0,
      failed: 0,
      skippedFiles: [] as string[],
      failedFiles: [] as { name: string; error: string }[]
    }

    // 过滤出支持的文件类型
    const supportedFiles = Array.from(files).filter(file => {
      const ext = file.name.toLowerCase()
      const isSupported =
        ext.endsWith('.pdf') ||
        ext.endsWith('.jpg') ||
        ext.endsWith('.jpeg') ||
        ext.endsWith('.png')

      if (!isSupported) {
        stats.skipped++
        stats.skippedFiles.push(file.name)
        console.log(`⏭️ 跳过不支持的文件: ${file.name}`)
      }
      return isSupported
    })

    stats.supported = supportedFiles.length

    if (supportedFiles.length === 0) {
      alert(`❌ 没有找到支持的文件格式\n\n总文件数: ${stats.total}\n跳过: ${stats.skipped} 个`)
      return
    }

    console.log(`✅ 找到 ${supportedFiles.length} 个支持的文件`)

    isProcessing.value = true
    progress.value = { current: 0, total: supportedFiles.length, status: '处理文件中...' }

    for (let i = 0; i < supportedFiles.length; i++) {
      const file = supportedFiles[i]
      progress.value.current = i + 1
      progress.value.status = `处理 ${i + 1}/${supportedFiles.length}: ${file.name}`

      try {
        console.log(`📄 处理文件 [${i + 1}/${supportedFiles.length}]: ${file.name}`)

        if (isPdfFile(file)) {
          const pages = await extractPdfText(file)
          console.log(`  📑 PDF 包含 ${pages.length} 页`)

          for (const page of pages) {
            const pdfData: PdfParseData = {
              fullText: page.fullText,
              text: page.text,
              items: page.items
            }

            // 检测是否一页多张发票
            const multiResults = recognizeMultipleInvoices(pdfData)

            if (multiResults.length > 1) {
              // 一页多张发票
              console.log(`  📄 第${page.pageNumber}页检测到 ${multiResults.length} 张发票`)
              for (let idx = 0; idx < multiResults.length; idx++) {
                const result = multiResults[idx]
                const invoice = createInvoice(
                  `${file.name} - 第${page.pageNumber}页 - 发票${idx + 1}`,
                  page.imageUrl,
                  file.name // 原始文件名
                )
                // 直接填充识别结果
                applyInvoiceData(invoice, result)
                invoices.value.push(invoice)
                // console.log(`  ✓ 添加发票: ${invoice.fileName}`)
              }
            } else {
              // 单张发票，异步识别
              const invoice = createInvoice(
                pages.length > 1 ? `${file.name} - 第${page.pageNumber}页` : file.name,
                page.imageUrl,
                file.name // 原始文件名
              )
              invoices.value.push(invoice)
              // console.log(`  ✓ 添加发票: ${invoice.fileName}`)
              recognizeInvoiceAsync(invoice, pdfData)
            }
          }
        } else {
          const imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => resolve(e.target?.result as string)
            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsDataURL(file)
          })
          const invoice = createInvoice(file.name, imageUrl, file.name)
          invoices.value.push(invoice)
          // console.log(`  ✓ 添加发票: ${invoice.fileName}`)
          // 异步识别，不阻塞后续文件处理
          recognizeInvoiceAsync(invoice)
        }

        stats.processed++
      } catch (error) {
        stats.failed++
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        stats.failedFiles.push({ name: file.name, error: errorMsg })
        console.error(`❌ 处理失败: ${file.name}`, error)
      }
    }

    isProcessing.value = false
    progress.value.status = '完成'

    if (!currentInvoice.value && invoices.value.length > 0) {
      currentInvoice.value = invoices.value[0]
    }

    // 显示详细的处理报告
    console.log('📊 处理完成统计:')
    console.log(`  总文件数: ${stats.total}`)
    console.log(`  支持的文件: ${stats.supported}`)
    console.log(`  成功处理: ${stats.processed}`)
    console.log(`  处理失败: ${stats.failed}`)
    console.log(`  跳过文件: ${stats.skipped}`)

    // 等待一小段时间让识别状态更新
    setTimeout(() => {
      const recognizedCount = invoices.value.filter(
        inv => inv.recognitionStatus === 'success'
      ).length
      const recognitionErrorCount = invoices.value.filter(
        inv => inv.recognitionStatus === 'error'
      ).length
      const duplicates = invoices.value.filter(inv => inv.isDuplicate).length

      let message = `📊 文件处理完成\n\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n`
      message += `📁 选择文件数: ${stats.total}\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`

      message += `✅ 成功导入: ${stats.processed} 个文件\n`
      message += `📄 已识别: ${recognizedCount} 张发票\n`

      if (recognitionErrorCount > 0) {
        message += `⚠️ 存在问题: ${recognitionErrorCount} 张\n`
        message += `   (未识别到有效内容)\n`
      }

      if (duplicates > 0) {
        message += `🔄 重复发票: ${duplicates} 张\n`
      }

      if (stats.failed > 0) {
        message += `\n❌ 导入失败: ${stats.failed} 个\n`
        stats.failedFiles.forEach(f => {
          message += `  • ${f.name}\n    ${f.error}\n`
        })
      }

      if (stats.skipped > 0) {
        message += `\n⏭️ 跳过不支持格式: ${stats.skipped} 个\n`
        if (stats.skippedFiles.length <= 5) {
          stats.skippedFiles.forEach(name => {
            message += `  • ${name}\n`
          })
        } else {
          message += `  (${stats.skippedFiles.length} 个文件)\n`
        }
      }

      alert(message)
    }, 1000)
  }

  // 异步识别发票
  async function recognizeInvoiceAsync(invoice: Invoice, pdfData?: PdfParseData) {
    try {
      const result = await recognizeInvoice(invoice.imageUrl, invoice.fileName, pdfData)

      // 逐个字段赋值确保响应式更新
      invoice.invoiceNumber = result.invoiceNumber
      invoice.invoiceCode = result.invoiceCode
      invoice.amount = result.amount
      invoice.taxAmount = result.taxAmount
      invoice.totalAmount = result.totalAmount
      invoice.date = result.date
      invoice.seller = result.seller
      invoice.buyer = result.buyer
      invoice.recognitionStatus = 'success'

      // 检查是否识别到有效内容
      const hasContent = result.invoiceNumber || result.invoiceCode || result.totalAmount > 0
      if (!hasContent) {
        console.warn(`⚠️ 未识别到有效内容: ${invoice.fileName}`)
        invoice.recognitionStatus = 'error'
      }

      // 强制触发响应式更新 - 通过重新赋值触发
      invoices.value = [...invoices.value]
      if (currentInvoice.value?.id === invoice.id) {
        // 重新从数组中获取更新后的对象
        currentInvoice.value = invoices.value.find(inv => inv.id === invoice.id) || null
      }

      if (enableDuplicateRemoval.value) checkDuplicates()

      // 打印识别结果（包含重复状态）
      if (hasContent) {
        const dupTag = invoice.isDuplicate ? ' [重复]' : ''
        console.log(
          `✅ ${invoice.fileName} | 号码:${result.invoiceNumber || '-'} | 代码:${result.invoiceCode || '-'} | 金额:¥${result.totalAmount} | 日期:${result.date || '-'} | 销售方:${result.seller || '-'}${dupTag}`
        )
      }
    } catch (error) {
      invoice.recognitionStatus = 'error'
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      console.error(`❌ 识别失败: ${invoice.fileName}`, errorMsg)
    }
  }

  // 检查重复发票
  function checkDuplicates() {
    if (!enableDuplicateRemoval.value) {
      invoices.value.forEach(inv => (inv.isDuplicate = false))
      return
    }

    // 先重置所有发票的重复状态
    invoices.value.forEach(inv => (inv.isDuplicate = false))

    // 用于记录每个 key 第一次出现的发票索引
    const firstSeenIndex = new Map<string, number>()

    for (let i = 0; i < invoices.value.length; i++) {
      const invoice = invoices.value[i]

      // 生成去重 key
      const key = getDedupeKey(invoice)

      // key 必须有实际内容才参与去重判断
      if (key) {
        const existingIndex = firstSeenIndex.get(key)
        if (existingIndex !== undefined) {
          // 当前发票是重复的，标记为重复
          invoice.isDuplicate = true
        } else {
          // 第一次出现，记录索引，不标记为重复
          firstSeenIndex.set(key, i)
        }
      }
    }
  }

  // 生成发票去重 key
  function getDedupeKey(invoice: Invoice): string | null {
    // 优先使用发票号码
    const invoiceNum = invoice.invoiceNumber?.trim()
    if (invoiceNum) {
      return invoiceNum
    }

    // 其次使用发票代码
    const invoiceCode = invoice.invoiceCode?.trim()

    // 如果没有发票号码，尝试使用发票代码+金额+日期组合
    if (invoiceCode && invoice.totalAmount > 0) {
      const amountKey = invoice.totalAmount.toFixed(2)
      const dateKey = invoice.date?.trim() || ''
      return `code_${invoiceCode}_${amountKey}_${dateKey}`
    }

    // 如果仍然没有 key，但有完整的金额+日期+销售方信息，使用组合 key
    if (invoice.totalAmount > 0 && invoice.date?.trim() && invoice.seller?.trim()) {
      const amountKey = invoice.totalAmount.toFixed(2)
      const dateKey = invoice.date.trim()
      const sellerKey = invoice.seller.trim()
      return `amt_${amountKey}_${dateKey}_${sellerKey}`
    }

    return null
  }

  // 删除发票
  function removeInvoice(id: string) {
    const index = invoices.value.findIndex(inv => inv.id === id)
    if (index > -1) {
      invoices.value.splice(index, 1)
      if (currentInvoice.value?.id === id) {
        currentInvoice.value = invoices.value[0] || null
      }
    }
  }

  // 智能去重
  function clearDuplicates() {
    const duplicates = invoices.value.filter(inv => inv.isDuplicate)
    if (duplicates.length === 0) {
      alert('没有发现重复的发票')
      return
    }

    if (confirm(`发现 ${duplicates.length} 张重复发票，确定删除吗？`)) {
      invoices.value = invoices.value.filter(inv => !inv.isDuplicate)
      if (currentInvoice.value?.isDuplicate) {
        currentInvoice.value = invoices.value[0] || null
      }
    }
  }

  // 更新发票字段
  function updateInvoiceField(field: keyof Invoice, value: string | number | boolean) {
    if (currentInvoice.value) {
      ;(currentInvoice.value[field] as typeof value) = value
      if (field === 'invoiceNumber' || field === 'invoiceCode') {
        checkDuplicates()
      }
    }
  }

  // 切换去重功能
  function toggleDuplicateRemoval() {
    enableDuplicateRemoval.value = !enableDuplicateRemoval.value
    checkDuplicates()
  }

  return {
    invoices,
    currentInvoice,
    isProcessing,
    enableDuplicateRemoval,
    progress,
    progressPercent,
    validInvoiceCount,
    totalAmount,
    uniqueTotalAmount,
    fileCount,
    selectInvoice,
    handleFileUpload,
    removeInvoice,
    clearDuplicates,
    updateInvoiceField,
    toggleDuplicateRemoval
  }
}
