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
      <InvoiceList
        :invoices="invoices"
        :current-id="currentInvoice?.id || null"
        :valid-count="validInvoiceCount"
        :total-amount="totalAmount"
        :is-processing="isProcessing"
        :progress-percent="progressPercent"
        :view-mode="listViewMode"
        @select="selectInvoice"
        @remove="removeInvoice"
        @upload="handleFileUpload"
        @toggle-view="toggleListView"
      />

      <!-- 中间：发票预览 -->
      <InvoicePreview
        :invoice="currentInvoice"
        :zoom="zoom"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @reset-zoom="resetZoom"
      />

      <!-- 右侧：发票信息 -->
      <InvoiceDetail
        :invoice="currentInvoice"
        :valid-count="validInvoiceCount"
        :total-amount="totalAmount"
        :enable-duplicate-removal="enableDuplicateRemoval"
        @update="updateInvoiceField"
        @toggle-duplicate="toggleDuplicateRemoval"
        @export-p-d-f="handleExportPDF"
        @export-excel="handleExportExcel"
        @print="handlePrint"
        @clear-duplicates="clearDuplicates"
      />
    </div>

    <!-- 打印预览区域(隐藏) -->
    <div id="print-area" style="display: none;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
  validInvoiceCount,
  totalAmount,
  selectInvoice,
  handleFileUpload,
  removeInvoice,
  clearDuplicates,
  updateInvoiceField,
  toggleDuplicateRemoval
} = useInvoiceManager()

// 导出功能
const { exportExcel, exportPdf, printInvoices } = useExport()

// UI 状态
const listViewMode = ref<'grid' | 'list'>('list')
const zoom = ref(1)

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
