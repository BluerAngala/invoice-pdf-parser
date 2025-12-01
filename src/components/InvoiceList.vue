<template>
  <div class="left-panel">
    <div class="panel-header">
      <h3>发票列表</h3>
      <button class="icon-btn" @click="$emit('toggleView')">
        <span v-if="viewMode === 'grid'">☰</span>
        <span v-else>⊞</span>
      </button>
    </div>

    <div class="upload-section">
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf"
        style="display: none"
        @change="handleFileChange"
      />
      <input
        ref="folderInput"
        type="file"
        webkitdirectory
        style="display: none"
        @change="handleFileChange"
      />
      <button class="upload-btn" @click="triggerUpload">
        <div class="upload-icon">☁️</div>
        <div>拖放发票文件到此处，或</div>
        <div class="upload-actions">
          <span class="upload-link">📎 选择文件</span>
          <span class="upload-divider">|</span>
          <span class="upload-link" @click.stop="triggerFolderUpload">📁 选择文件夹</span>
        </div>
        <div class="upload-hint">支持 PDF, JPG, PNG 格式</div>
      </button>
    </div>

    <div v-if="isProcessing" class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
    </div>

    <div v-if="invoices.length > 0" class="stats-panel">
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">📥 导入:</span>
          <span class="stat-value">{{ invoices.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">✅ 已识别:</span>
          <span class="stat-value success">{{ successCount }}</span>
        </div>
      </div>
      <div class="stat-row">
        <div v-if="errorCount > 0" class="stat-item">
          <span class="stat-label">⚠️ 问题:</span>
          <span class="stat-value error">{{ errorCount }}</span>
        </div>
        <div v-if="duplicateCount > 0" class="stat-item">
          <span class="stat-label">🔄 重复:</span>
          <span class="stat-value duplicate">{{ duplicateCount }}</span>
        </div>
        <div v-if="processingCount > 0" class="stat-item">
          <span class="stat-label">⏳ 识别中:</span>
          <span class="stat-value processing">{{ processingCount }}</span>
        </div>
      </div>
    </div>

    <div class="invoice-list">
      <div
        v-for="invoice in invoices"
        :key="invoice.id"
        class="invoice-list-item"
        :class="{
          active: currentId === invoice.id,
          duplicate: invoice.isDuplicate
        }"
        @click="$emit('select', invoice.id)"
      >
        <div class="invoice-thumb">
          <img :src="invoice.imageUrl" :alt="invoice.fileName" />
          <div v-if="invoice.isDuplicate" class="duplicate-tag">重复</div>
          <div v-if="invoice.recognitionStatus === 'processing'" class="status-tag processing">
            识别中
          </div>
          <div v-if="invoice.recognitionStatus === 'error'" class="status-tag error">失败</div>
        </div>
        <div class="invoice-list-info">
          <div class="invoice-name">
            {{ invoice.fileName }}
          </div>
          <div class="invoice-amount" :class="{ 'amount-zero': invoice.totalAmount === 0 }">
            ¥{{ invoice.totalAmount.toFixed(2) }}
          </div>
        </div>
        <button class="delete-icon" @click.stop="$emit('remove', invoice.id)">🗑️</button>
      </div>

      <div v-if="invoices.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <div>暂无发票，请上传</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Invoice } from '../types/invoice'

const props = defineProps<{
  invoices: Invoice[]
  currentId: string | null
  isProcessing: boolean
  progressPercent: number
  viewMode: 'grid' | 'list'
}>()

// 统计识别状态
const successCount = computed(
  () => props.invoices.filter(inv => inv.recognitionStatus === 'success' && !inv.isDuplicate).length
)
const errorCount = computed(
  () => props.invoices.filter(inv => inv.recognitionStatus === 'error').length
)
const processingCount = computed(
  () => props.invoices.filter(inv => inv.recognitionStatus === 'processing').length
)
const duplicateCount = computed(() => props.invoices.filter(inv => inv.isDuplicate).length)

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
  upload: [files: FileList]
  toggleView: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInput.value?.click()
}

function triggerFolderUpload() {
  folderInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('upload', target.files)
    target.value = ''
  }
}
</script>

<style scoped>
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

.upload-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 8px 0;
}

.upload-link {
  color: #1890ff;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.upload-divider {
  color: #d9d9d9;
}

.upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
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

.stats-panel {
  padding: 10px 15px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  font-size: 12px;
}

.stat-row {
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
}

.stat-row:last-child {
  margin-bottom: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: #666;
  font-size: 11px;
}

.stat-value {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.stat-value.success {
  color: #52c41a;
}

.stat-value.error {
  color: #ff4d4f;
}

.stat-value.duplicate {
  color: #fa8c16;
}

.stat-value.processing {
  color: #1890ff;
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

.status-tag {
  position: absolute;
  bottom: 0;
  left: 0;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 0 4px 0 0;
}

.status-tag.processing {
  background: #1890ff;
}

.status-tag.error {
  background: #ff4d4f;
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

.invoice-amount.amount-zero {
  color: #999;
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
</style>
