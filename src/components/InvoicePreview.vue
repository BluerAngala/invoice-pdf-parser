<template>
  <div class="center-panel">
    <div class="panel-header">
      <h3>发票预览</h3>
      <div class="stats-center">
        <div class="stat-item">
          <span class="stat-label">有效发票</span>
          <span class="stat-value">{{ totalCount }}</span>
        </div>
        <div v-if="duplicateCount > 0" class="stat-item">
          <span class="stat-label">重复</span>
          <span class="stat-value duplicate">{{ duplicateCount }}</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-label">去重金额</span>
          <span class="stat-value highlight">¥{{ totalAmount.toFixed(2) }}</span>
        </div>
      </div>
      <div class="toolbar">
        <button class="icon-btn" @click="$emit('zoomOut')" title="缩小">🔍-</button>
        <button class="icon-btn" @click="$emit('zoomIn')" title="放大">🔍+</button>
        <button class="icon-btn" @click="$emit('resetZoom')" title="重置缩放">↻</button>
      </div>
    </div>

    <div
      ref="previewAreaRef"
      class="preview-area"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      <div
        v-if="invoice"
        class="preview-content"
        :style="{
          transform: `scale(${zoom}) translate(${offsetX / zoom}px, ${offsetY / zoom}px)`
        }"
      >
        <img :src="invoice.imageUrl" :alt="invoice.fileName" draggable="false" />
      </div>
      <!-- 复位按钮 - 图片偏移时显示 -->
      <button
        v-if="invoice && (offsetX !== 0 || offsetY !== 0)"
        class="reset-position-btn"
        @click.stop="resetPosition"
        title="复位到中心"
      >
        ⊙ 复位
      </button>
      <div v-if="!invoice" class="preview-empty">
        <div class="empty-icon">📄</div>
        <div>选择一张发票进行预览</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Invoice } from '../types/invoice'

const props = defineProps<{
  invoice: Invoice | null
  zoom: number
  totalCount: number
  totalAmount: number
  duplicateCount: number
}>()

defineEmits<{
  zoomIn: []
  zoomOut: []
  resetZoom: []
}>()

// 拖拽状态
const isDragging = ref(false)
const offsetX = ref(0)
const offsetY = ref(0)
const startX = ref(0)
const startY = ref(0)
const previewAreaRef = ref<HTMLElement | null>(null)

// 切换发票时重置位置
watch(
  () => props.invoice?.id,
  () => {
    offsetX.value = 0
    offsetY.value = 0
  }
)

function startDrag(e: MouseEvent) {
  if (!props.invoice) return
  isDragging.value = true
  startX.value = e.clientX - offsetX.value
  startY.value = e.clientY - offsetY.value
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  offsetX.value = e.clientX - startX.value
  offsetY.value = e.clientY - startY.value
}

function stopDrag() {
  isDragging.value = false
}

// 复位图片位置
function resetPosition() {
  offsetX.value = 0
  offsetY.value = 0
}
</script>

<style scoped>
.center-panel {
  flex: 1;
  background: #fafafa;
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
  background: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  min-width: 80px;
}

.stats-center {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

.stat-value.highlight {
  color: #52c41a;
  font-size: 18px;
}

.stat-value.duplicate {
  color: #faad14;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: #e8e8e8;
}

.toolbar {
  display: flex;
  gap: 5px;
  min-width: 120px;
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

.preview-area {
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  cursor: grab;
  user-select: none;
}

.preview-area.dragging {
  cursor: grabbing;
}

.preview-content {
  transition: transform 0.1s ease-out;
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

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

.reset-position-btn {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
  transition: all 0.3s;
  z-index: 10;
}

.reset-position-btn:hover {
  background: #40a9ff;
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.5);
}
</style>
