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
        accept="application/pdf,.pdf"
        style="display: none"
        @change="handleFileChange"
      />
      <input
        ref="folderInput"
        type="file"
        webkitdirectory
        accept="application/pdf,.pdf"
        style="display: none"
        @change="handleFileChange"
      />
      <div class="upload-buttons">
        <button class="select-btn file-btn" @click="triggerUpload">📄 选择文件</button>
        <button class="select-btn folder-btn" @click="triggerFolderUpload">📂 选择文件夹</button>
      </div>
      <div
        class="upload-dropzone"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        :class="{ dragging: isDragging }"
      >
        <div class="upload-icon">☁️</div>
        <div class="upload-text">拖放 PDF 发票到此处</div>
        <div class="upload-hint">仅支持 PDF 格式</div>
      </div>
    </div>

    <div v-if="invoices.length > 0" class="stats-panel">
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">📁 文件:</span>
          <span class="stat-value">{{ fileCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">📄 发票:</span>
          <span class="stat-value">{{ invoices.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">✅ 已识别:</span>
          <span class="stat-value success">{{ successCount }}</span>
        </div>
      </div>
      <div class="stat-row">
        <div
          v-if="errorCount > 0 || duplicateCount > 0 || processingCount > 0"
          class="stat-item-group"
        >
          <div v-if="errorCount > 0" class="stat-item">
            <span class="stat-label">⚠️ 失败:</span>
            <span class="stat-value error">{{ errorCount }}</span>
          </div>
          <div v-if="duplicateCount > 0" class="stat-item">
            <span class="stat-label">🔄 重复:</span>
            <span class="stat-value duplicate">{{ duplicateCount }}</span>
          </div>
          <div v-if="processingCount > 0" class="stat-item">
            <span class="stat-label">⏳ 未识别:</span>
            <span class="stat-value processing">{{ processingCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="invoice-list">
      <!-- 按文件分组显示 -->
      <template v-for="group in invoiceGroups" :key="group.sourceFile">
        <!-- 多张发票的文件：显示分组头 -->
        <div v-if="group.invoices.length > 1" class="file-group">
          <div class="file-group-header" @click="toggleGroup(group.sourceFile)">
            <span class="expand-icon">{{ expandedGroups.has(group.sourceFile) ? '▼' : '▶' }}</span>
            <span class="file-name">{{ group.sourceFile }}</span>
            <span class="invoice-count">{{ group.invoices.length }}张</span>
          </div>
          <div v-if="expandedGroups.has(group.sourceFile)" class="file-group-content">
            <div
              v-for="invoice in group.invoices"
              :key="invoice.id"
              class="invoice-list-item nested"
              :class="{
                active: currentId === invoice.id,
                duplicate: invoice.isDuplicate
              }"
              @click="$emit('select', invoice.id)"
            >
              <div class="invoice-thumb">
                <img :src="invoice.imageUrl" :alt="invoice.fileName" />
                <div v-if="invoice.isDuplicate" class="status-tag duplicate">重复</div>
                <div
                  v-else-if="invoice.recognitionStatus === 'error'"
                  class="status-tag error"
                  :title="invoice.errorMessage"
                >
                  {{ invoice.errorMessage === '图片型PDF，暂不支持识别' ? '图片PDF' : '失败' }}
                </div>
                <div
                  v-else-if="invoice.recognitionStatus === 'processing'"
                  class="status-tag processing"
                >
                  未识别
                </div>
              </div>
              <div class="invoice-list-info">
                <div class="invoice-name">
                  {{ getShortName(invoice.fileName, group.sourceFile) }}
                </div>
                <div class="invoice-amount" :class="{ 'amount-zero': invoice.totalAmount === 0 }">
                  ¥{{ invoice.totalAmount.toFixed(2) }}
                </div>
              </div>
              <button class="delete-icon" @click.stop="$emit('remove', invoice.id)">🗑️</button>
            </div>
          </div>
        </div>
        <!-- 单张发票的文件：直接显示 -->
        <div
          v-else
          class="invoice-list-item"
          :class="{
            active: currentId === group.invoices[0].id,
            duplicate: group.invoices[0].isDuplicate
          }"
          @click="$emit('select', group.invoices[0].id)"
        >
          <div class="invoice-thumb">
            <img :src="group.invoices[0].imageUrl" :alt="group.invoices[0].fileName" />
            <div v-if="group.invoices[0].isDuplicate" class="status-tag duplicate">重复</div>
            <div
              v-else-if="group.invoices[0].recognitionStatus === 'error'"
              class="status-tag error"
              :title="group.invoices[0].errorMessage"
            >
              {{
                group.invoices[0].errorMessage === '图片型PDF，暂不支持识别' ? '图片PDF' : '失败'
              }}
            </div>
            <div
              v-else-if="group.invoices[0].recognitionStatus === 'processing'"
              class="status-tag processing"
            >
              未识别
            </div>
          </div>
          <div class="invoice-list-info">
            <div class="invoice-name">{{ group.invoices[0].fileName }}</div>
            <div
              class="invoice-amount"
              :class="{ 'amount-zero': group.invoices[0].totalAmount === 0 }"
            >
              ¥{{ group.invoices[0].totalAmount.toFixed(2) }}
            </div>
          </div>
          <button class="delete-icon" @click.stop="$emit('remove', group.invoices[0].id)">
            🗑️
          </button>
        </div>
      </template>

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
  viewMode: 'grid' | 'list'
  fileCount: number
}>()

// 展开状态
const expandedGroups = ref<Set<string>>(new Set())

// 拖拽状态
const isDragging = ref(false)

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    emit('upload', files)
  }
}

// 按文件分组
const invoiceGroups = computed(() => {
  const groups = new Map<string, Invoice[]>()
  for (const inv of props.invoices) {
    const key = inv.sourceFile || inv.fileName
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(inv)
  }
  return Array.from(groups.entries()).map(([sourceFile, invoices]) => ({
    sourceFile,
    invoices
  }))
})

// 统计识别状态
const successCount = computed(
  () => props.invoices.filter(inv => inv.recognitionStatus === 'success').length
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

function toggleGroup(sourceFile: string) {
  if (expandedGroups.value.has(sourceFile)) {
    expandedGroups.value.delete(sourceFile)
  } else {
    expandedGroups.value.add(sourceFile)
  }
}

// 获取简短名称（去掉文件名前缀）
function getShortName(fileName: string, sourceFile: string): string {
  if (fileName.startsWith(sourceFile)) {
    return fileName.slice(sourceFile.length).replace(/^\s*-\s*/, '') || fileName
  }
  return fileName
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

.upload-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.select-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s;
  color: #333;
}

.select-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.file-btn {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}

.file-btn:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  color: white;
}

.folder-btn {
  background: #52c41a;
  border-color: #52c41a;
  color: white;
}

.folder-btn:hover {
  background: #73d13d;
  border-color: #73d13d;
  color: white;
}

.upload-dropzone {
  padding: 24px 16px;
  border: 2px dashed #d9d9d9;
  background: #fafafa;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
}

.upload-dropzone.dragging {
  border-color: #1890ff;
  background: #e6f7ff;
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.stats-panel {
  padding: 10px 15px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  font-size: 12px;
}

.stat-row {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.stat-row:last-child {
  margin-bottom: 0;
}

.stat-item-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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

/* 文件分组样式 */
.file-group {
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
}

.file-group-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #f5f5f5;
  cursor: pointer;
  transition: background 0.3s;
}

.file-group-header:hover {
  background: #e8e8e8;
}

.expand-icon {
  font-size: 10px;
  margin-right: 8px;
  color: #666;
}

.file-name {
  flex: 1;
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invoice-count {
  font-size: 11px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
}

.file-group-content {
  border-top: 1px solid #e8e8e8;
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

.invoice-list-item.nested {
  margin-bottom: 0;
  border-radius: 0;
  border-bottom: 1px solid #f0f0f0;
  padding-left: 20px;
}

.invoice-list-item.nested:last-child {
  border-bottom: none;
}

.invoice-list-item:hover {
  background: #f5f5f5;
}

.invoice-list-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.invoice-list-item.nested.active {
  border-color: transparent;
  border-left: 3px solid #1890ff;
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

.status-tag {
  position: absolute;
  top: 0;
  right: 0;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 0 0 0 4px;
  font-weight: 500;
}

.status-tag.duplicate {
  background: #fa8c16;
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
