<template>
  <div class="center-panel">
    <div class="panel-header">
      <h3>发票预览</h3>
      <div class="toolbar">
        <button class="icon-btn" @click="$emit('zoomOut')">🔍-</button>
        <button class="icon-btn" @click="$emit('zoomIn')">🔍+</button>
        <button class="icon-btn" @click="$emit('resetZoom')">↻</button>
      </div>
    </div>

    <div class="preview-area">
      <div v-if="invoice" class="preview-content" :style="{ transform: `scale(${zoom})` }">
        <img :src="invoice.imageUrl" :alt="invoice.fileName" />
      </div>
      <div v-else class="preview-empty">
        <div class="empty-icon">📄</div>
        <div>选择一张发票进行预览</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Invoice } from '../types/invoice'

defineProps<{
  invoice: Invoice | null
  zoom: number
}>()

defineEmits<{
  zoomIn: []
  zoomOut: []
  resetZoom: []
}>()
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
}

.toolbar {
  display: flex;
  gap: 5px;
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

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}
</style>
