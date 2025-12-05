import { ref, computed } from 'vue'
import type { Invoice, RecognitionProgress } from '../types/invoice'
import { extractPdfText, isPdfFile } from '../core/pdf-processor'
import { recognizeInvoice, recognizeMultipleInvoices } from '../core/invoice-recognizer'
import { checkDuplicates } from '../core/invoice-deduplicator'
import type { InvoiceData, PdfParseData } from '../core/invoice-parser'

// 显示加载弹窗
function showLoadingModal(message: string): { update: (msg: string) => void; close: () => void } {
  const modal = document.createElement('div')
  modal.id = 'import-loading-modal'
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    ">
      <div style="
        background: white;
        padding: 32px 48px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        text-align: center;
        min-width: 300px;
      ">
        <div style="font-size: 40px; margin-bottom: 16px; animation: spin 1s linear infinite;">📄</div>
        <div id="loading-message" style="font-size: 16px; font-weight: 500; color: #333; margin-bottom: 8px;">${message}</div>
        <div id="loading-sub" style="font-size: 13px; color: #999;">请稍候...</div>
      </div>
    </div>
    <style>
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  `
  document.body.appendChild(modal)

  return {
    update: (msg: string) => {
      const msgEl = modal.querySelector('#loading-message')
      if (msgEl) msgEl.textContent = msg
    },
    close: () => modal.remove()
  }
}

// 显示结果弹窗
interface ImportResult {
  total: number
  processed: number
  recognized: number
  errorCount: number
  duplicates: number
  failed: number
  skipped: number
}

function showResultModal(result: ImportResult) {
  const modal = document.createElement('div')
  const hasError = result.errorCount > 0 || result.failed > 0
  const icon = hasError ? '⚠️' : '✅'
  const title = hasError ? '导入完成（部分异常）' : '导入完成'
  const titleColor = hasError ? '#fa8c16' : '#52c41a'

  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    " onclick="if(event.target === this) this.parentElement.remove()">
      <div style="
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        width: 420px;
        overflow: hidden;
        animation: fadeIn 0.2s ease;
      ">
        <div style="
          background: linear-gradient(135deg, ${titleColor} 0%, ${hasError ? '#ffc53d' : '#73d13d'} 100%);
          padding: 24px;
          text-align: center;
          color: white;
        ">
          <div style="font-size: 42px; margin-bottom: 8px;">${icon}</div>
          <div style="font-size: 18px; font-weight: 600;">${title}</div>
        </div>
        <div style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #666;">📁 选择文件数</span>
            <span style="font-weight: 600; color: #333;">${result.total}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #666;">✅ 成功导入</span>
            <span style="font-weight: 600; color: #52c41a;">${result.processed} 个文件</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #666;">📄 已识别发票</span>
            <span style="font-weight: 600; color: #1890ff;">${result.recognized} 张</span>
          </div>
          ${result.duplicates > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #666;">🔄 重复发票</span>
            <span style="font-weight: 600; color: #fa8c16;">${result.duplicates} 张</span>
          </div>` : ''}
          ${result.errorCount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #666;">⚠️ 识别异常</span>
            <span style="font-weight: 600; color: #ff4d4f;">${result.errorCount} 张</span>
          </div>` : ''}
          ${result.failed > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #666;">❌ 导入失败</span>
            <span style="font-weight: 600; color: #ff4d4f;">${result.failed} 个</span>
          </div>` : ''}
          ${result.skipped > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <span style="color: #666;">⏭️ 跳过文件</span>
            <span style="font-weight: 600; color: #999;">${result.skipped} 个</span>
          </div>` : ''}
        </div>
        <div style="padding: 16px 20px; background: #fafafa; text-align: center;">
          <button onclick="this.closest('[style*=position]').parentElement.remove()" style="
            padding: 8px 32px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
          ">确定</button>
        </div>
      </div>
    </div>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
    </style>
  `
  document.body.appendChild(modal)
}

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
    return invoices.value.reduce((sum, inv) => sum + inv.totalAmount, 0)
  })

  const uniqueTotalAmount = computed(() => {
    return invoices.value
      .filter(inv => !inv.isDuplicate)
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
  })

  const fileCount = computed(() => {
    const files = new Set(invoices.value.map(inv => inv.sourceFile))
    return files.size
  })

  // 选择发票
  function selectInvoice(id: string) {
    currentInvoice.value = invoices.value.find(inv => inv.id === id) || null
  }

  // 创建发票对象
  function createInvoice(
    fileName: string,
    imageUrl: string,
    sourceFile: string,
    pdfData?: ArrayBuffer,
    pageNumber?: number
  ): Invoice {
    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      fileName,
      sourceFile,
      uploadTime: new Date().toISOString(),
      imageUrl,
      pdfData,
      pageNumber,
      invoiceNumber: '',
      invoiceCode: '',
      amount: 0,
      taxAmount: 0,
      totalAmount: 0,
      date: '',
      seller: '',
      buyer: '',
      category: '',
      status: 'valid',
      isDuplicate: false,
      recognitionStatus: 'processing'
    }
  }

  // 应用识别结果
  function applyInvoiceData(invoice: Invoice, data: InvoiceData, method?: 'regex' | 'llm' | 'ocr') {
    invoice.invoiceNumber = data.invoiceNumber
    invoice.invoiceCode = data.invoiceCode
    invoice.amount = data.amount
    invoice.taxAmount = data.taxAmount
    invoice.totalAmount = data.totalAmount
    invoice.date = data.date
    invoice.seller = data.seller
    invoice.buyer = data.buyer
    invoice.recognitionMethod = method

    const hasContent = data.invoiceNumber || data.invoiceCode || data.totalAmount > 0
    invoice.recognitionStatus = hasContent ? 'success' : 'error'
    invoice.status = hasContent ? 'valid' : 'invalid'
  }

  // 处理文件上传
  async function handleFileUpload(files: FileList) {
    if (!files || files.length === 0) return

    console.log(`📁 开始处理文件夹，总文件数: ${files.length}`)

    const stats = {
      total: files.length,
      supported: 0,
      skipped: 0,
      processed: 0,
      failed: 0,
      skippedFiles: [] as string[],
      failedFiles: [] as { name: string; error: string }[]
    }

    // 过滤支持的文件
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

    // 显示加载弹窗
    const loadingModal = showLoadingModal(`正在导入 ${supportedFiles.length} 个文件...`)

    isProcessing.value = true
    progress.value = { current: 0, total: supportedFiles.length, status: '处理文件中...' }

    // 获取 API 配置
    const apiConfig = {
      apiKey: import.meta.env.VITE_SILICONFLOW_API_KEY || '',
      apiUrl:
        import.meta.env.VITE_SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1/chat/completions'
    }

    // 并发处理配置
    const CONCURRENCY = 4 // 同时处理 4 个文件
    let completedCount = 0

    // 处理单个文件
    async function processFile(file: File, index: number) {
      try {
        console.log(`📄 处理文件 [${index + 1}/${supportedFiles.length}]: ${file.name}`)

        if (isPdfFile(file)) {
          // 读取原始 PDF 数据
          const pdfArrayBuffer = await file.arrayBuffer()
          const pages = await extractPdfText(file)
          console.log(`  📑 PDF 包含 ${pages.length} 页`)

          for (const page of pages) {
            const pdfParseData: PdfParseData = {
              fullText: page.fullText,
              text: page.text,
              items: page.items
            }

            // 检测一页多张
            const multiResults = recognizeMultipleInvoices(pdfParseData)

            if (multiResults.length > 1) {
              console.log(`  📄 第${page.pageNumber}页检测到 ${multiResults.length} 张发票`)
              for (let idx = 0; idx < multiResults.length; idx++) {
                const result = multiResults[idx]
                const invoice = createInvoice(
                  `${file.name} - 第${page.pageNumber}页 - 发票${idx + 1}`,
                  page.imageUrl,
                  file.name,
                  pdfArrayBuffer,
                  page.pageNumber
                )

                if (!result.invoiceNumber) {
                  invoices.value.push(invoice)
                  recognizeInvoiceAsync(invoice, pdfParseData, apiConfig)
                } else {
                  applyInvoiceData(invoice, result, 'regex')
                  invoices.value.push(invoice)
                }
              }
            } else {
              const invoice = createInvoice(
                pages.length > 1 ? `${file.name} - 第${page.pageNumber}页` : file.name,
                page.imageUrl,
                file.name,
                pdfArrayBuffer,
                page.pageNumber
              )
              invoices.value.push(invoice)
              recognizeInvoiceAsync(invoice, pdfParseData, apiConfig)
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
          recognizeInvoiceAsync(invoice, undefined, apiConfig)
        }

        stats.processed++
      } catch (error) {
        stats.failed++
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        stats.failedFiles.push({ name: file.name, error: errorMsg })
        console.error(`❌ 处理失败: ${file.name}`, error)
      } finally {
        completedCount++
        progress.value.current = completedCount
        progress.value.status = `处理 ${completedCount}/${supportedFiles.length}`
        loadingModal.update(`正在处理 ${completedCount}/${supportedFiles.length}...`)
      }
    }

    // 分批并发处理
    for (let i = 0; i < supportedFiles.length; i += CONCURRENCY) {
      const batch = supportedFiles.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map((file, idx) => processFile(file, i + idx)))
    }

    // 关闭加载弹窗
    loadingModal.close()

    isProcessing.value = false
    progress.value.status = '完成'

    // 统一检查重复
    if (enableDuplicateRemoval.value) {
      checkDuplicates(invoices.value, true)
    }

    if (!currentInvoice.value && invoices.value.length > 0) {
      currentInvoice.value = invoices.value[0]
    }

    // 显示处理报告
    console.log('📊 处理完成统计:')
    console.log(`  总文件数: ${stats.total}`)
    console.log(`  支持的文件: ${stats.supported}`)
    console.log(`  成功处理: ${stats.processed}`)
    console.log(`  处理失败: ${stats.failed}`)
    console.log(`  跳过文件: ${stats.skipped}`)

    // 显示结果弹窗
    setTimeout(() => {
      const recognizedCount = invoices.value.filter(
        inv => inv.recognitionStatus === 'success'
      ).length
      const recognitionErrorCount = invoices.value.filter(
        inv => inv.recognitionStatus === 'error'
      ).length
      const duplicates = invoices.value.filter(inv => inv.isDuplicate).length

      showResultModal({
        total: stats.total,
        processed: stats.processed,
        recognized: recognizedCount,
        errorCount: recognitionErrorCount,
        duplicates,
        failed: stats.failed,
        skipped: stats.skipped
      })
    }, 500)
  }

  // 异步识别发票
  async function recognizeInvoiceAsync(
    invoice: Invoice,
    pdfData?: PdfParseData,
    apiConfig?: { apiKey: string; apiUrl: string }
  ) {
    try {
      const result = await recognizeInvoice(invoice.imageUrl, invoice.fileName, pdfData, apiConfig)

      invoice.invoiceNumber = result.invoiceNumber
      invoice.invoiceCode = result.invoiceCode
      invoice.amount = result.amount
      invoice.taxAmount = result.taxAmount
      invoice.totalAmount = result.totalAmount
      invoice.date = result.date
      invoice.seller = result.seller
      invoice.buyer = result.buyer

      // 处理错误信息
      if (result.errorMessage) {
        invoice.errorMessage = result.errorMessage
        invoice.recognitionStatus = 'error'
        invoice.status = 'invalid'
        console.warn(`⚠️ ${invoice.fileName}: ${result.errorMessage}`)
      } else {
        const hasContent = result.invoiceNumber || result.invoiceCode || result.totalAmount > 0
        if (!hasContent) {
          console.warn(`⚠️ 未识别到有效内容: ${invoice.fileName}`)
          invoice.recognitionStatus = 'error'
          invoice.status = 'invalid'
          invoice.errorMessage = '未识别到有效内容'
        } else {
          invoice.recognitionStatus = 'success'
          invoice.status = 'valid'
        }
      }

      // 强制触发响应式更新
      invoices.value = [...invoices.value]
      if (currentInvoice.value?.id === invoice.id) {
        currentInvoice.value = invoices.value.find(inv => inv.id === invoice.id) || null
      }

      // 检查重复
      if (enableDuplicateRemoval.value) checkDuplicates(invoices.value, true)

      // 打印识别结果
      const hasContent = result.invoiceNumber || result.invoiceCode || result.totalAmount > 0
      if (hasContent) {
        const latestInvoice = invoices.value.find(inv => inv.id === invoice.id)
        const statusTag = latestInvoice?.isDuplicate ? ' [重复]' : ' [原始]'
        console.log(
          `✅ ${invoice.fileName} | 号码:${result.invoiceNumber || '-'} | 代码:${result.invoiceCode || '-'} | 金额:¥${result.totalAmount} | 日期:${result.date || '-'} | 销售方:${result.seller || '-'}${statusTag}`
        )
      }
    } catch (error) {
      invoice.recognitionStatus = 'error'
      const errorMsg = error instanceof Error ? error.message : '未知错误'
      invoice.errorMessage = errorMsg
      console.error(`❌ 识别失败: ${invoice.fileName}`, errorMsg)
    }
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
        checkDuplicates(invoices.value, enableDuplicateRemoval.value)
      }
    }
  }

  // 切换去重功能
  function toggleDuplicateRemoval() {
    enableDuplicateRemoval.value = !enableDuplicateRemoval.value
    checkDuplicates(invoices.value, enableDuplicateRemoval.value)
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
