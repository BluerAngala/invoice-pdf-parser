<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>系统设置</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <div class="setting-section">
          <h4>OCR 识别设置</h4>
          <div class="setting-item">
            <label class="setting-label">
              <input v-model="localSettings.enableOCR" type="checkbox" />
              启用 OCR 识别
            </label>
          </div>
          <div class="setting-item">
            <label>API Key</label>
            <input
              v-model="localSettings.apiKey"
              type="password"
              placeholder="请输入 SiliconFlow API Key"
              class="setting-input"
            />
          </div>
          <div class="setting-item">
            <label>API URL</label>
            <input
              v-model="localSettings.apiUrl"
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
              v-model="localSettings.defaultBuyer"
              type="text"
              placeholder="例如：公司名称"
              class="setting-input"
            />
          </div>
          <div class="setting-item">
            <label>默认销售方</label>
            <input
              v-model="localSettings.defaultSeller"
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
              <input :checked="enableDuplicateRemoval" type="checkbox" disabled />
              自动去重（在主界面管理）
            </label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave">保存设置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AppSettings } from '../composables/useAppSettings'

const props = defineProps<{
  show: boolean
  settings: AppSettings
  enableDuplicateRemoval: boolean
}>()

const emit = defineEmits<{
  close: []
  save: []
}>()

const localSettings = ref<AppSettings>({ ...props.settings })

watch(
  () => props.settings,
  newSettings => {
    localSettings.value = { ...newSettings }
  },
  { deep: true }
)

function handleSave() {
  Object.assign(props.settings, localSettings.value)
  emit('save')
}
</script>

<style scoped>
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
</style>
