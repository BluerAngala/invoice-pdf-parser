<template>
  <div class="app">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <span class="logo">📄 智能发票管理工具</span>
      </div>
      <div class="header-right">
        <button class="icon-btn">🔍</button>
        <button class="icon-btn">⚙️</button>
        <button class="icon-btn">🔔</button>
      </div>
    </header>

    <div class="main-content">
      <!-- 左侧：发票列表 -->
      <div class="left-panel">
        <div class="panel-header">
          <h3>发票列表</h3>
          <button class="icon-btn" @click="toggleListView">
            <span v-if="listViewMode === 'grid'">☰</span>
            <span v-else>⊞</span>
          </button>
        </div>

        <div class="upload-section">
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*,application/pdf,.pdf"
            @change="handleFileSelect"
            style="display: none"
          />
          <button class="upload-btn" @click="triggerFileInput">
            <div class="upload-icon">☁️</div>
            <div>拖放发票文件到此处，或</div>
            <div class="upload-link">📎 选择文件</div>
            <div class="upload-hint">支持 PDF, JPG, PNG 格式</div>
          </button>
        </div>

        <div class="stats-mini">
          <div class="stat-mini">
            <div class="stat-mini-label">发票数量</div>
            <div class="stat-mini-value">{{ validInvoiceCount }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-label">总金额</div>
            <div class="stat-mini-value green">¥{{ totalAmount.toFixed(2) }}</div>
          </div>
        </div>

        <div v-if="isProcessing" class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>

        <div class="invoice-list">
          <div
            v-for="invoice in invoices"
            :key="invoice.id"
            class="invoice-list-item"
            :class="{ 
              'active': currentInvoice?.id === invoice.id,
              'duplicate': invoice.isDuplicate 
            }"
            @click="selectInvoice(invoice)"
          >
            <div class="invoice-thumb">
              <img :src="invoice.imageUrl" :alt="invoice.fileName" />
              <div v-if="invoice.isDuplicate" class="duplicate-tag">重复</div>
            </div>
            <div class="invoice-list-info">
              <div class="invoice-name">{{ invoice.fileName }}</div>
              <div class="invoice-amount">¥{{ invoice.totalAmount.toFixed(2) }}</div>
            </div>
            <button class="delete-icon" @click.stop="removeInvoice(invoice.id)">🗑️</button>
          </div>

          <div v-if="invoices.length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <div>暂无发票，请上传</div>
          </div>
        </div>
      </div>

      <!-- 中间：发票预览 -->
      <div class="center-panel">
        <div class="panel-header">
          <h3>发票预览</h3>
          <div class="toolbar">
            <button class="icon-btn" @click="zoomOut">🔍-</button>
            <button class="icon-btn" @click="zoomIn">🔍+</button>
            <button class="icon-btn" @click="resetZoom">↻</button>
          </div>
        </div>

        <div class="preview-area">
          <div v-if="currentInvoice" class="preview-content" :style="{ transform: `scale(${zoom})` }">
            <img :src="currentInvoice.imageUrl" :alt="currentInvoice.fileName" />
          </div>
          <div v-else class="preview-empty">
            <div class="empty-icon">📄</div>
            <div>选择一张发票进行预览</div>
          </div>
        </div>
      </div>

      <!-- 右侧：发票信息 -->
      <div class="right-panel">
        <div class="panel-header">
          <h3>发票信息</h3>
          <button class="icon-btn" @click="editMode = !editMode">✏️</button>
        </div>

        <div class="invoice-form">
          <div class="form-hint">
            <span class="hint-icon">ℹ️</span>
            {{ currentInvoice ? '当前发票详情' : '选择一张发票查看详情' }}
          </div>

          <div class="form-section">
            <h4>发票统计</h4>
            <div class="stat-row">
              <span class="stat-label">发票数量</span>
              <span class="stat-value">{{ validInvoiceCount }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">总金额（合计）</span>
              <span class="stat-value highlight">¥{{ totalAmount.toFixed(2) }}</span>
            </div>
          </div>

          <div v-if="currentInvoice" class="form-section">
            <h4>当前发票 <button class="edit-toggle-btn" @click="editMode = !editMode">{{ editMode ? '👁️ 查看' : '✏️ 编辑' }}</button></h4>
            
            <div v-if="!editMode" class="current-invoice-info">
              <div class="info-item">
                <span class="info-label">文件名</span>
                <span class="info-value">{{ currentInvoice.fileName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">发票号码</span>
                <span class="info-value">{{ currentInvoice.invoiceNumber || '未识别' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">发票代码</span>
                <span class="info-value">{{ currentInvoice.invoiceCode || '未识别' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">开票日期</span>
                <span class="info-value">{{ currentInvoice.date || '未识别' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">销售方</span>
                <span class="info-value">{{ currentInvoice.seller || '未识别' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">金额</span>
                <span class="info-value amount">¥{{ currentInvoice.totalAmount.toFixed(2) }}</span>
              </div>
              <div v-if="currentInvoice.isDuplicate" class="duplicate-warning">
                ⚠️ 此发票为重复发票
              </div>
            </div>

            <div v-else class="edit-form">
              <div class="form-group-inline">
                <label>发票号码</label>
                <input 
                  type="text" 
                  v-model="currentInvoice.invoiceNumber"
                  @input="checkDuplicates"
                  placeholder="请输入8位发票号码"
                />
              </div>
              <div class="form-group-inline">
                <label>发票代码</label>
                <input 
                  type="text" 
                  v-model="currentInvoice.invoiceCode"
                  placeholder="请输入发票代码"
                />
              </div>
              <div class="form-group-inline">
                <label>开票日期</label>
                <input 
                  type="date" 
                  v-model="currentInvoice.date"
                />
              </div>
              <div class="form-group-inline">
                <label>销售方</label>
                <input 
                  type="text" 
                  v-model="currentInvoice.seller"
                  placeholder="请输入销售方名称"
                />
              </div>
              <div class="form-group-inline">
                <label>购买方</label>
                <input 
                  type="text" 
                  v-model="currentInvoice.buyer"
                  placeholder="请输入购买方名称"
                />
              </div>
              <div class="form-group-inline">
                <label>金额</label>
                <input 
                  type="number" 
                  v-model.number="currentInvoice.amount"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div class="form-group-inline">
                <label>税额</label>
                <input 
                  type="number" 
                  v-model.number="currentInvoice.taxAmount"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div class="form-group-inline highlight-group">
                <label>价税合计</label>
                <input 
                  type="number" 
                  v-model.number="currentInvoice.totalAmount"
                  placeholder="0.00"
                  step="0.01"
                  class="highlight-input"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="switch-row">
              <span>发票去重</span>
              <label class="switch">
                <input type="checkbox" v-model="enableDuplicateRemoval" @change="checkDuplicates" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="action-buttons">
            <button class="btn btn-primary" @click="exportPDF">
              📥 导出PDF
            </button>
            <button class="btn btn-success" @click="exportExcel">
              📊 导出清单
            </button>
            <button class="btn btn-secondary" @click="printInvoices">
              🖨️ 打印
            </button>
            <button class="btn btn-purple" @click="clearDuplicates">
              🗑️ 智能去重
            </button>
          </div>
        </div>


      </div>
    </div>

    <!-- 打印预览区域(隐藏) -->
    <div id="print-area" style="display: none;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Invoice, RecognitionProgress } from './types/invoice'
import { exportToPDF, generatePrintHTML } from './utils/pdf'
import * as XLSX from 'xlsx'
import { convertPdfToImages, isPdfFile } from './utils/pdfToImage'
import { recognizeInvoice } from './utils/ocr'

const fileInput = ref<HTMLInputElement | null>(null)
const invoices = ref<Invoice[]>([])
const currentInvoice = ref<Invoice | null>(null)
const isProcessing = ref(false)
const enableDuplicateRemoval = ref(true)
const editMode = ref(false)
const listViewMode = ref<'grid' | 'list'>('list')
const zoom = ref(1)
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
function selectInvoice(invoice: Invoice) {
  currentInvoice.value = invoice
}

// 切换列表视图
function toggleListView() {
  listViewMode.value = listViewMode.value === 'grid' ? 'list' : 'grid'
}

// 缩放控制
function zoomIn() {
  zoom.value = Math.min(zoom.value + 0.2, 3)
}

function zoomOut() {
  zoom.value = Math.max(zoom.value - 0.2, 0.5)
}

function resetZoom() {
  zoom.value = 1
}

// 触发文件选择
function triggerFileInput() {
  fileInput.value?.click()
}

// 处理文件选择
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  isProcessing.value = true
  progress.value = {
    current: 0,
    total: files.length,
    status: '处理文件中...'
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    progress.value.current = i + 1
    progress.value.status = `处理文件 ${i + 1}/${files.length}: ${file.name}`

    try {
      if (isPdfFile(file)) {
        // PDF文件 - 转换为图片
        const images = await convertPdfToImages(file)
        for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
          const imageUrl = images[pageIndex]
          const invoice: Invoice = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            fileName: `${file.name} - 第${pageIndex + 1}页`,
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
          invoices.value.push(invoice)
          
          // 异步识别
          recognizeInvoiceAsync(invoice)
        }
      } else {
        // 图片文件
        const reader = new FileReader()
        await new Promise<void>((resolve) => {
          reader.onload = (e) => {
            const imageUrl = e.target?.result as string
            const invoice: Invoice = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              fileName: file.name,
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
            invoices.value.push(invoice)
            
            // 异步识别
            recognizeInvoiceAsync(invoice)
            resolve()
          }
          reader.readAsDataURL(file)
        })
      }
    } catch (error) {
      console.error('处理文件失败:', file.name, error)
      alert(`处理文件失败: ${file.name}`)
    }
  }

  isProcessing.value = false
  progress.value.status = '完成!'

  // 自动选择第一张发票
  if (invoices.value.length > 0 && !currentInvoice.value) {
    currentInvoice.value = invoices.value[0]
  }

  // 重置input
  target.value = ''
}

// 异步识别发票
async function recognizeInvoiceAsync(invoice: Invoice) {
  try {
    const result = await recognizeInvoice(invoice.imageUrl, invoice.fileName)
    Object.assign(invoice, result)
    invoice.recognitionStatus = 'success'
    
    // 识别完成后检查重复
    if (enableDuplicateRemoval.value) {
      checkDuplicates()
    }
  } catch (error) {
    invoice.recognitionStatus = 'error'
    console.error('识别失败:', error)
  }
}

// 快速编辑当前发票
function quickEdit(field: keyof Invoice, value: any) {
  if (currentInvoice.value) {
    (currentInvoice.value as any)[field] = value
    if (field === 'invoiceNumber' || field === 'invoiceCode') {
      checkDuplicates()
    }
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
  }
}

// 清空全部
function clearAll() {
  if (confirm('确定要清空所有发票吗?')) {
    invoices.value = []
    currentInvoice.value = null
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

// 打印发票
function printInvoices() {
  const printArea = document.getElementById('print-area')
  if (!printArea) return

  const validInvoices = invoices.value.filter(inv => !inv.isDuplicate)
  printArea.innerHTML = generatePrintHTML(validInvoices)
  printArea.style.display = 'block'

  setTimeout(() => {
    window.print()
    printArea.style.display = 'none'
  }, 100)
}

// 导出PDF
async function exportPDF() {
  const printArea = document.getElementById('print-area')
  if (!printArea) return

  const validInvoices = invoices.value.filter(inv => !inv.isDuplicate)
  printArea.innerHTML = generatePrintHTML(validInvoices)
  printArea.style.display = 'block'

  await exportToPDF(validInvoices, 'print-area')
  printArea.style.display = 'none'
}

// 导出Excel
function exportExcel() {
  const validInvoices = invoices.value.filter(inv => !inv.isDuplicate)
  
  // 准备数据
  const data = validInvoices.map((inv, index) => ({
    '序号': index + 1,
    '发票号码': inv.invoiceNumber || '未识别',
    '发票代码': inv.invoiceCode || '未识别',
    '开票日期': inv.date || '未识别',
    '销售方': inv.seller || '未识别',
    '购买方': inv.buyer || '未识别',
    '金额': inv.amount,
    '税额': inv.taxAmount,
    '价税合计': inv.totalAmount,
    '文件名': inv.fileName
  }))
  
  // 添加合计行
  data.push({
    '序号': '',
    '发票号码': '',
    '发票代码': '',
    '开票日期': '',
    '销售方': '',
    '购买方': '',
    '金额': '',
    '税额': '合计:',
    '价税合计': totalAmount.value,
    '文件名': ''
  } as any)
  
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data)
  
  // 设置列宽
  ws['!cols'] = [
    { wch: 6 },  // 序号
    { wch: 12 }, // 发票号码
    { wch: 14 }, // 发票代码
    { wch: 12 }, // 开票日期
    { wch: 20 }, // 销售方
    { wch: 20 }, // 购买方
    { wch: 12 }, // 金额
    { wch: 12 }, // 税额
    { wch: 12 }, // 价税合计
    { wch: 30 }  // 文件名
  ]
  
  // 创建工作簿
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '发票清单')
  
  // 导出文件
  XLSX.writeFile(wb, `发票统计_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`)
}

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待识别',
    processing: '识别中',
    success: '已识别',
    error: '识别失败'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.header-right {
  display: flex;
  gap: 10px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  font-size: 16px;
  transition: all 0.3s;
}

.icon-btn:hover {
  background: #f0f0f0;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧面板 */
.left-panel {
  width: 280px;
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.panel-header {
  height: 50px;
  padding: 0 15px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.upload-section {
  padding: 15px;
  border-bottom: 1px solid #e8e8e8;
}

.upload-btn {
  width: 100%;
  padding: 30px 20px;
  border: 2px dashed #d9d9d9;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s;
  font-size: 13px;
  color: #666;
}

.upload-btn:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.upload-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.upload-link {
  color: #1890ff;
  margin: 8px 0;
  font-weight: 500;
}

.upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.stats-mini {
  display: flex;
  padding: 15px;
  gap: 10px;
  border-bottom: 1px solid #e8e8e8;
}

.stat-mini {
  flex: 1;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
}

.stat-mini-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 5px;
}

.stat-mini-value {
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
}

.stat-mini-value.green {
  color: #52c41a;
}

.progress-bar {
  height: 3px;
  background: #f0f0f0;
  margin: 0 15px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  transition: width 0.3s;
}

.invoice-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.invoice-list-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.invoice-list-item:hover {
  background: #f5f5f5;
}

.invoice-list-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.invoice-list-item.duplicate {
  opacity: 0.6;
  background: #fff1f0;
}

.invoice-thumb {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;
}

.invoice-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.duplicate-tag {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 0 0 0 4px;
}

.invoice-list-info {
  flex: 1;
  margin-left: 10px;
  overflow: hidden;
}

.invoice-name {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.invoice-amount {
  font-size: 14px;
  font-weight: bold;
  color: #52c41a;
}

.delete-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  opacity: 0;
  transition: all 0.3s;
}

.invoice-list-item:hover .delete-icon {
  opacity: 1;
}

.delete-icon:hover {
  background: #ff4d4f;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

/* 中间面板 */
.center-panel {
  flex: 1;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  gap: 5px;
}

.preview-area {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.preview-content {
  transition: transform 0.3s;
  transform-origin: center;
}

.preview-content img {
  max-width: 100%;
  height: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.preview-empty {
  text-align: center;
  color: #999;
}

/* 右侧面板 */
.right-panel {
  width: 320px;
  background: white;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.invoice-form {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.form-hint {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
  font-size: 13px;
  color: #0050b3;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint-icon {
  font-size: 16px;
}

.form-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-toggle-btn {
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.edit-toggle-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.stat-value.highlight {
  color: #52c41a;
  font-size: 16px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-group input.highlight-input {
  font-weight: 600;
  color: #52c41a;
  font-size: 15px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #333;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.current-invoice-info {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #999;
  min-width: 80px;
}

.info-value {
  color: #333;
  font-weight: 500;
  text-align: right;
  flex: 1;
  word-break: break-all;
}

.info-value.amount {
  color: #52c41a;
  font-size: 16px;
  font-weight: 600;
}

.duplicate-warning {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 12px;
  text-align: center;
}

.edit-form {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.form-group-inline {
  margin-bottom: 12px;
}

.form-group-inline:last-child {
  margin-bottom: 0;
}

.form-group-inline label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.form-group-inline input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.3s;
}

.form-group-inline input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.highlight-group {
  background: #f6ffed;
  padding: 10px;
  border-radius: 4px;
  margin-top: 8px;
}

.highlight-group .highlight-input {
  font-weight: 600;
  color: #52c41a;
  font-size: 15px;
  border-color: #b7eb8f;
}

@media print {
  body * {
    visibility: hidden;
  }
  #print-area,
  #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>

.btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-success {
  background: #52c41a;
  color: white;
}

.btn-success:hover {
  background: #73d13d;
}

.btn-secondary {
  background: #595959;
  color: white;
}

.btn-secondary:hover {
  background: #8c8c8c;
}

.btn-purple {
  background: #722ed1;
  color: white;
}

.btn-purple:hover {
  background: #9254de;
}

@media print {
  body * {
    visibility: hidden;
  }
  #print-area,
  #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
