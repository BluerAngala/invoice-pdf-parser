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
    <SettingsModal
      :show="showSettings"
      :settings="settings"
      :enable-duplicate-removal="enableDuplicateRemoval"
      @close="showSettings = false"
      @save="saveSettings"
    />

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
import { ref } from 'vue'
import InvoiceList from './components/InvoiceList.vue'
import InvoicePreview from './components/InvoicePreview.vue'
import InvoiceDetail from './components/InvoiceDetail.vue'
import SettingsModal from './components/SettingsModal.vue'
import { useInvoiceManager } from './composables/useInvoiceManager'
import { useInvoiceExport } from './composables/useInvoiceExport'
import { useAppSettings } from './composables/useAppSettings'

// 发票管理
const {
  invoices,
  currentInvoice,
  isProcessing,
  enableDuplicateRemoval,
  progressPercent,
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
const { exportExcel, exportPdf, print } = useInvoiceExport()

// 应用设置
const { settings, showSettings, saveSettings } = useAppSettings()

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
  exportExcel(invoices.value, uniqueTotalAmount.value)
}

function handlePrint() {
  print(invoices.value)
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
