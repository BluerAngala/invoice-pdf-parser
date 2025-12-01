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
        @change="handleFileChange"
        style="display: none"
      />
      <button class="upload-btn" @click="triggerUpload">
        <div class="upload-icon">☁️</div>
        <div>拖放发票文件到此处，或</div>
        <div class="upload-link">📎 选择文件</div>
        <div class="upload-hint">支持 PDF, JPG, PNG 格式</div>
      </button>
    </div>

    <div class="stats-mini">
      <div class="stat-mini">
        <div class="stat-mini-label">发票数量</div>
        <div class="stat-mini-value">{{ validCount }}</div>
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
          'active': currentId === invoice.id,
          'duplicate': invoice.isDuplicate 
        }"
        @click="$emit('select', invoice.id)"
      >
        <div class="invoice-thumb">
          <img :src="invoice.imageUrl" :alt="invoice.fileName" />
          <div v-if="invoice.isDuplicate" class="duplicate-tag">重复</div>
        </div>
        <div class="invoice-list-info">
          <div class="invoice-name">{{ invoice.fileName }}</div>
          <div class="invoice-amount">¥{{ invoice.totalAmount.toFixed(2) }}</div>
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
import { ref } from 'vue'
import type { Invoice } from '../types/invoice'

defineProps<{
  invoices: Invoice[]
  currentId: string | null
  validCount: number
  totalAmount: number
  isProcessing: boolean
  progressPercent: number
  viewMode: 'grid' | 'list'
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
  upload: [files: FileList]
  toggleView: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
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
</style>
