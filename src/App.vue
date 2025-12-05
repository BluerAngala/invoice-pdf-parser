<template>
  <div class="app">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <span class="logo">发票识别统计工具 @陈恒律师自制</span>
      </div>
      <div class="header-center">
        <div class="privacy-notice">
          <span class="privacy-item">🔒 使用本地资源识别</span>
          <span class="privacy-divider">|</span>
          <span class="privacy-item">🛡️ 数据隐私保密，不作任何采集</span>
        </div>
      </div>
      <div class="header-right">
        <button class="action-btn" @click="handleExportExcel">📊 导出清单</button>
        <button class="action-btn" @click="clearDuplicates">🗑️ 智能去重</button>
        <button class="action-btn more-btn" @click="showMoreFeatures">🚀 更多功能</button>
      </div>
    </header>

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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import InvoiceList from './components/InvoiceList.vue'
import InvoicePreview from './components/InvoicePreview.vue'
import InvoiceDetail from './components/InvoiceDetail.vue'
import { useInvoiceManager } from './composables/useInvoiceManager'
import { useInvoiceExport } from './composables/useInvoiceExport'

// 发票管理
const {
  invoices,
  currentInvoice,
  isProcessing,
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
const { exportExcel } = useInvoiceExport()

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
function handleExportExcel() {
  exportExcel(invoices.value)
}

// 更多功能
function showMoreFeatures() {
  alert(
    '🚀 更多功能开发中...\n\n' +
      '即将推出：\n' +
      '• AI 自动识别\n' +
      '• OCR 图片识别\n' +
      '• 发票数据统计\n\n' +
      '敬请期待！'
  )
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
  gap: 15px;
  flex: 1;
  justify-content: center;
  align-items: center;
}

.privacy-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #f6ffed 0%, #e6f7ff 100%);
  border-radius: 20px;
  border: 1px solid #b7eb8f;
}

.privacy-item {
  font-size: 13px;
  color: #52c41a;
  font-weight: 500;
}

.privacy-divider {
  color: #d9d9d9;
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
  justify-content: flex-end;
}

.more-btn {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: white;
}

.more-btn:hover {
  background: #ff7875;
  border-color: #ff7875;
  color: white;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
