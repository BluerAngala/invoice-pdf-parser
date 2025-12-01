import { ref, computed, triggerRef } from 'vue'
import type { Invoice, RecognitionProgress } from '../types/invoice'
import { extractPdfText, isPdfFile } from '../utils/pdfExtract'
import { recognizeInvoice } from '../utils/ocr'

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

  const validInvoiceCount = computed(() => {
    return invoices.value.filter(inv => !inv.isDuplicate).length
  })

  const totalAmount = computed(() => {
    return invoices.value
      .filter(inv => !inv.isDuplicate)
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
  })

  // 选择发票
  function selectInvoice(id: string) {
    currentInvoice.value = invoices.value.find(inv => inv.id === id) || null
  }

  // 创建发票对象
  function createInvoice(fileName: string, imageUrl: string): Invoice {
    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      fileName,
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
            const invoice = createInvoice(
              pages.length > 1 ? `${file.name} - 第${page.pageNumber}页` : file.name,
              page.imageUrl
            )
            invoices.value.push(invoice)
            console.log(`  ✓ 添加发票: ${invoice.fileName}`)
            // 异步识别，不阻塞后续文件处理
            recognizeInvoiceAsync(invoice, page.text)
          }
        } else {
          const imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => resolve(e.target?.result as string)
            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsDataURL(file)
          })
          const invoice = createInvoice(file.name, imageUrl)
          invoices.value.push(invoice)
          console.log(`  ✓ 添加发票: ${invoice.fileName}`)
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
  async function recognizeInvoiceAsync(invoice: Invoice, pdfText?: string) {
    try {
      console.log(`🔍 开始识别: ${invoice.fileName}`)
      const result = await recognizeInvoice(invoice.imageUrl, invoice.fileName, pdfText)

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
      } else {
        console.log(`✅ 识别成功: ${invoice.fileName}`)
      }

      // 强制触发响应式更新
      triggerRef(invoices)
      if (currentInvoice.value?.id === invoice.id) {
        triggerRef(currentInvoice)
      }

      if (enableDuplicateRemoval.value) checkDuplicates()
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

    const seen = new Set<string>()
    invoices.value.forEach(invoice => {
      const key = invoice.invoiceNumber || invoice.invoiceCode
      if (key && seen.has(key)) {
        invoice.isDuplicate = true
      } else {
        invoice.isDuplicate = false
        if (key) seen.add(key)
      }
    })
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
    selectInvoice,
    handleFileUpload,
    removeInvoice,
    clearDuplicates,
    updateInvoiceField,
    toggleDuplicateRemoval
  }
}
