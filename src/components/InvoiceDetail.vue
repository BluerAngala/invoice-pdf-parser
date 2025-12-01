<template>
  <div class="right-panel">
    <div class="panel-header">
      <h3>发票信息</h3>
    </div>

    <div class="invoice-form">
      <div class="form-hint">
        <span class="hint-icon">ℹ️</span>
        {{ invoice ? '当前发票详情' : '选择一张发票查看详情' }}
      </div>

      <div v-if="invoice" class="form-section">
        <h4>
          当前发票 
          <button class="edit-toggle-btn" @click="toggleEdit">
            {{ isEditMode ? '👁️ 查看' : '✏️ 编辑' }}
          </button>
        </h4>
        
        <div v-if="!isEditMode" class="current-invoice-info">
          <div class="info-item">
            <span class="info-label">文件名</span>
            <span class="info-value">{{ invoice.fileName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">发票号码</span>
            <span class="info-value">{{ invoice.invoiceNumber || '未识别' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">发票代码</span>
            <span class="info-value">{{ invoice.invoiceCode || '未识别' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">开票日期</span>
            <span class="info-value">{{ invoice.date || '未识别' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">销售方</span>
            <span class="info-value">{{ invoice.seller || '未识别' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">金额</span>
            <span class="info-value amount">¥{{ invoice.totalAmount.toFixed(2) }}</span>
          </div>
          <div v-if="invoice.isDuplicate" class="duplicate-warning">
            ⚠️ 此发票为重复发票
          </div>
        </div>

        <div v-else class="edit-form">
          <div class="form-group-inline">
            <label>发票号码</label>
            <input 
              type="text" 
              :value="invoice.invoiceNumber"
              @input="updateField('invoiceNumber', ($event.target as HTMLInputElement).value)"
              placeholder="请输入发票号码"
            />
          </div>
          <div class="form-group-inline">
            <label>发票代码</label>
            <input 
              type="text" 
              :value="invoice.invoiceCode"
              @input="updateField('invoiceCode', ($event.target as HTMLInputElement).value)"
              placeholder="请输入发票代码"
            />
          </div>
          <div class="form-group-inline">
            <label>开票日期</label>
            <input 
              type="date" 
              :value="invoice.date"
              @input="updateField('date', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-group-inline">
            <label>销售方</label>
            <input 
              type="text" 
              :value="invoice.seller"
              @input="updateField('seller', ($event.target as HTMLInputElement).value)"
              placeholder="请输入销售方名称"
            />
          </div>
          <div class="form-group-inline">
            <label>购买方</label>
            <input 
              type="text" 
              :value="invoice.buyer"
              @input="updateField('buyer', ($event.target as HTMLInputElement).value)"
              placeholder="请输入购买方名称"
            />
          </div>
          <div class="form-group-inline">
            <label>金额</label>
            <input 
              type="number" 
              :value="invoice.amount"
              @input="updateField('amount', parseFloat(($event.target as HTMLInputElement).value))"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div class="form-group-inline">
            <label>税额</label>
            <input 
              type="number" 
              :value="invoice.taxAmount"
              @input="updateField('taxAmount', parseFloat(($event.target as HTMLInputElement).value))"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div class="form-group-inline highlight-group">
            <label>价税合计</label>
            <input 
              type="number" 
              :value="invoice.totalAmount"
              @input="updateField('totalAmount', parseFloat(($event.target as HTMLInputElement).value))"
              placeholder="0.00"
              step="0.01"
              class="highlight-input"
            />
          </div>
        </div>
      </div>


    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Invoice } from '../types/invoice'

defineProps<{
  invoice: Invoice | null
}>()

const emit = defineEmits<{
  update: [field: string, value: any]
}>()

const isEditMode = ref(false)

function toggleEdit() {
  isEditMode.value = !isEditMode.value
}

function updateField(field: string, value: any) {
  emit('update', field, value)
}
</script>

<style scoped>
.right-panel {
  width: 320px;
  background: white;
  border-left: 1px solid #e8e8e8;
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

.invoice-form {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.form-hint {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
  font-size: 13px;
  color: #0050b3;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint-icon {
  font-size: 16px;
}

.form-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-toggle-btn {
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.edit-toggle-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.current-invoice-info {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #999;
  min-width: 80px;
}

.info-value {
  color: #333;
  font-weight: 500;
  text-align: right;
  flex: 1;
  word-break: break-all;
}

.info-value.amount {
  color: #52c41a;
  font-size: 16px;
  font-weight: 600;
}

.duplicate-warning {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 12px;
  text-align: center;
}

.edit-form {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.form-group-inline {
  margin-bottom: 12px;
}

.form-group-inline:last-child {
  margin-bottom: 0;
}

.form-group-inline label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.form-group-inline input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.3s;
}

.form-group-inline input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.highlight-group {
  background: #f6ffed;
  padding: 10px;
  border-radius: 4px;
  margin-top: 8px;
}

.highlight-group .highlight-input {
  font-weight: 600;
  color: #52c41a;
  font-size: 15px;
  border-color: #b7eb8f;
}


</style>
