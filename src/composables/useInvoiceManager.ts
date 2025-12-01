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
    isProcessing.value = true
    progress.value = { current: 0, total: files.length, status: '处理文件中...' }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      progress.value.current = i + 1
      progress.value.status = `处理 ${i + 1}/${files.length}: ${file.name}`

      try {
        if (isPdfFile(file)) {
          const pages = await extractPdfText(file)
          pages.forEach(page => {
            const invoice = createInvoice(
              pages.length > 1 ? `${file.name} - 第${page.pageNumber}页` : file.name,
              page.imageUrl
            )
            invoices.value.push(invoice)
            recognizeInvoiceAsync(invoice, page.text)
          })
        } else {
          const imageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(file)
          })
          const invoice = createInvoice(file.name, imageUrl)
          invoices.value.push(invoice)
          recognizeInvoiceAsync(invoice)
        }
      } catch (error) {
        console.error('处理失败:', file.name, error)
      }
    }

    isProcessing.value = false
    progress.value.status = '完成'
    
    if (!currentInvoice.value && invoices.value.length > 0) {
      currentInvoice.value = invoices.value[0]
    }
  }

  // 异步识别发票
  async function recognizeInvoiceAsync(invoice: Invoice, pdfText?: string) {
    try {
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
      
      // 强制触发响应式更新
      triggerRef(invoices)
      if (currentInvoice.value?.id === invoice.id) {
        triggerRef(currentInvoice)
      }
      
      if (enableDuplicateRemoval.value) checkDuplicates()
    } catch (error) {
      invoice.recognitionStatus = 'error'
      console.error('识别失败:', error)
    }
  }

  // 检查重复发票
  function checkDuplicates() {
    if (!enableDuplicateRemoval.value) {
      invoices.value.forEach(inv => inv.isDuplicate = false)
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
  function updateInvoiceField(field: string, value: any) {
    if (currentInvoice.value) {
      (currentInvoice.value as any)[field] = value
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
