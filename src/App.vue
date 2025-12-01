<template>
  <div class="app">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <span class="logo">📄 智能发票管理工具</span>
      </div>
      <div class="header-center">
        <button class="action-btn" @click="handleExportPDF">📥 导出PDF</button>
        <button class="action-btn" @click="handleExportExcel">📊 导出清单</button>
        <button class="action-btn" @click="handlePrint">🖨️ 打印</button>
        <button class="action-btn" @click="clearDuplicates">🗑️ 智能去重</button>
      </div>
      <div class="header-right">
        <button class="icon-btn" @click="showSettings = true">⚙️</button>
      </div>
    </header>

    <!-- 设置弹窗 -->
    <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>系统设置</h3>
          <button class="close-btn" @click="showSettings = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="setting-section">
            <h4>OCR 识别设置</h4>
            <div class="setting-item">
              <label class="setting-label">
                <input v-model="settings.enableOCR" type="checkbox" />
                启用 OCR 识别
              </label>
            </div>
            <div class="setting-item">
              <label>API Key</label>
              <input
                v-model="settings.apiKey"
                type="password"
                placeholder="请输入 SiliconFlow API Key"
                class="setting-input"
              />
            </div>
            <div class="setting-item">
              <label>API URL</label>
              <input
                v-model="settings.apiUrl"
                type="text"
                placeholder="https://api.siliconflow.cn/v1/chat/completions"
                class="setting-input"
              />
            </div>
          </div>

          <div class="setting-section">
            <h4>默认发票信息</h4>
            <div class="setting-item">
              <label>默认购买方</label>
              <input
                v-model="settings.defaultBuyer"
                type="text"
                placeholder="例如：公司名称"
                class="setting-input"
              />
            </div>
            <div class="setting-item">
              <label>默认销售方</label>
              <input
                v-model="settings.defaultSeller"
                type="text"
                placeholder="例如：供应商名称"
                class="setting-input"
              />
            </div>
          </div>

          <div class="setting-section">
            <h4>其他设置</h4>
            <div class="setting-item">
              <label class="setting-label">
                <input v-model="enableDuplicateRemoval" type="checkbox" />
                自动去重
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showSettings = false">取消</button>
          <button class="btn btn-primary" @click="saveSettings">保存设置</button>
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧：发票列表 -->
      <InvoiceList
        :invoices="invoices"
        :current-id="currentInvoice?.id || null"
        :is-processing="isProcessing"
        :progress-percent="progressPercent"
        :view-mode="listViewMode"
        :file-count="fileCount"
        @select="selectInvoice"
        @remove="removeInvoice"
        @upload="handleFileUpload"
        @toggle-view="toggleListView"
      />

      <!-- 中间：发票预览 -->
      <InvoicePreview
        :invoice="currentInvoice"
        :zoom="zoom"
        :total-count="validInvoiceCount"
        :total-amount="uniqueTotalAmount"
        :duplicate-count="invoices.length - validInvoiceCount"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @reset-zoom="resetZoom"
      />

      <!-- 右侧：发票信息 -->
      <InvoiceDetail
        :key="currentInvoice?.id + '-' + currentInvoice?.recognitionStatus"
        :invoice="currentInvoice"
        @update="updateInvoiceField"
      />
    </div>

    <!-- 打印预览区域(隐藏) -->
    <div id="print-area" style="display: none" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import InvoiceList from './components/InvoiceList.vue'
import InvoicePreview from './components/InvoicePreview.vue'
import InvoiceDetail from './components/InvoiceDetail.vue'
import { useInvoiceManager } from './composables/useInvoiceManager'
import { useExport } from './composables/useExport'

// 发票管理
const {
  invoices,
  currentInvoice,
  isProcessing,
  enableDuplicateRemoval,
  progressPercent,
  totalAmount,
  uniqueTotalAmount,
  validInvoiceCount,
  fileCount,
  selectInvoice,
  handleFileUpload,
  removeInvoice,
  clearDuplicates,
  updateInvoiceField
} = useInvoiceManager()

// 导出功能
const { exportExcel, exportPdf, printInvoices } = useExport()

// UI 状态
const listViewMode = ref<'grid' | 'list'>('list')
const zoom = ref(1)
const showSettings = ref(false)

// 设置
const settings = ref({
  enableOCR: true,
  apiKey: '',
  apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  defaultBuyer: '',
  defaultSeller: ''
})

// 加载设置
onMounted(() => {
  const saved = localStorage.getItem('invoice-settings')
  if (saved) {
    settings.value = { ...settings.value, ...JSON.parse(saved) }
  }
  // 同步到环境变量
  if (settings.value.apiKey) {
    import.meta.env.VITE_SILICONFLOW_API_KEY = settings.value.apiKey
  }
  if (settings.value.apiUrl) {
    import.meta.env.VITE_SILICONFLOW_API_URL = settings.value.apiUrl
  }
})

// 保存设置
function saveSettings() {
  localStorage.setItem('invoice-settings', JSON.stringify(settings.value))
  // 更新环境变量
  import.meta.env.VITE_SILICONFLOW_API_KEY = settings.value.apiKey
  import.meta.env.VITE_SILICONFLOW_API_URL = settings.value.apiUrl
  showSettings.value = false
  alert('设置已保存')
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

// 导出处理
function handleExportPDF() {
  exportPdf(invoices.value)
}

function handleExportExcel() {
  exportExcel(invoices.value, totalAmount.value)
}

function handlePrint() {
  printInvoices(invoices.value)
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
  min-width: 200px;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.header-center {
  display: flex;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  color: #333;
}

.action-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.header-right {
  display: flex;
  gap: 10px;
  min-width: 50px;
  justify-content: flex-end;
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

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
  color: #999;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.setting-section {
  margin-bottom: 24px;
}

.setting-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}

.setting-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.setting-label input[type='checkbox'] {
  margin-right: 8px;
  cursor: pointer;
}

.setting-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.3s;
}

.setting-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: white;
  color: #333;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
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
