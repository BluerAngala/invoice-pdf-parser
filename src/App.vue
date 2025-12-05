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
        <button class="action-btn export-btn" @click="handleExportExcel">📊 导出清单</button>
        <button class="action-btn dedup-btn" @click="clearDuplicates">🗑️ 智能去重</button>
        <button class="action-btn more-btn" @click="showMoreModal = true">🚀 更多功能</button>
        <button class="action-btn changelog-btn" @click="showChangelogModal = true">
          📝 更新日志
        </button>
        <button class="action-btn contact-btn" @click="showContactModal = true">💬 联系反馈</button>
      </div>
    </header>

    <!-- 更多功能弹窗 -->
    <div v-if="showMoreModal" class="modal-overlay" @click.self="showMoreModal = false">
      <div class="modal-content feature-modal">
        <button class="modal-close-float" @click="showMoreModal = false">×</button>
        <div class="feature-header">
          <div class="feature-icon">🚀</div>
          <h2 class="feature-title">更多功能即将上线</h2>
          <p class="feature-subtitle">我们正在努力开发，让发票处理更智能</p>
        </div>
        <div class="feature-cards">
          <div class="feature-card">
            <div class="card-icon">🤖</div>
            <div class="card-content">
              <h3>AI 自动识别</h3>
              <p>智能识别发票信息，准确率高达 99%</p>
            </div>
            <span class="card-badge">即将推出</span>
          </div>
          <div class="feature-card">
            <div class="card-icon">📷</div>
            <div class="card-content">
              <h3>OCR 图片识别</h3>
              <p>支持拍照、截图等图片格式发票</p>
            </div>
            <span class="card-badge">开发中</span>
          </div>
          <div class="feature-card">
            <div class="card-icon">📈</div>
            <div class="card-content">
              <h3>数据统计分析</h3>
              <p>多维度统计，生成可视化报表</p>
            </div>
            <span class="card-badge planning">规划中</span>
          </div>
        </div>
        <div class="feature-footer">
          <span class="footer-text clickable" @click="openContact">
            💡 有功能建议？点击联系反馈
          </span>
        </div>
      </div>
    </div>

    <!-- 更新日志弹窗 -->
    <div v-if="showChangelogModal" class="modal-overlay" @click.self="showChangelogModal = false">
      <div class="modal-content changelog-modal">
        <button class="modal-close-float" @click="showChangelogModal = false">×</button>
        <div class="changelog-header">
          <div class="changelog-icon">📝</div>
          <h2 class="changelog-title">更新日志</h2>
          <p class="changelog-subtitle">持续优化，只为更好的体验</p>
        </div>
        <div class="changelog-body">
          <div class="changelog-timeline">
            <div
              v-for="(log, index) in changelog"
              :key="log.version"
              class="timeline-item"
              :class="{ latest: index === 0 }"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="version-tag" :class="{ 'version-latest': index === 0 }">
                    {{ log.version }}
                  </span>
                  <span class="version-date">{{ log.date }}</span>
                  <span v-if="index === 0" class="new-badge">NEW</span>
                </div>
                <ul class="timeline-changes">
                  <li v-for="(item, idx) in log.changes" :key="idx">
                    <span class="change-icon">✨</span>
                    {{ item }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 联系反馈弹窗 -->
    <div v-if="showContactModal" class="modal-overlay" @click.self="showContactModal = false">
      <div class="modal-content contact-modal">
        <button class="modal-close-float" @click="showContactModal = false">×</button>
        <div class="contact-header">
          <div class="contact-icon">💬</div>
          <h2 class="contact-title">联系反馈</h2>
          <p class="contact-subtitle">扫码关注公众号，获取更多资讯</p>
        </div>
        <div class="contact-body">
          <img src="/公众号.png" alt="公众号二维码" class="qrcode-img" />
          <p class="contact-tip">微信扫一扫，关注公众号</p>
        </div>
      </div>
    </div>

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
const showMoreModal = ref(false)
const showChangelogModal = ref(false)
const showContactModal = ref(false)

// 更新日志数据
const changelog = [
  {
    version: 'v1.2.0',
    date: '2025-12-05',
    changes: ['新增更新日志功能', '优化弹窗交互体验']
  },
  {
    version: 'v1.1.0',
    date: '2025-12-03',
    changes: ['新增智能去重功能', '新增导出 Excel 清单', '优化发票预览效果']
  },
  {
    version: 'v1.0.0',
    date: '2025-12-2',
    changes: ['首次发布', '支持 PDF 发票识别', '支持发票信息编辑']
  }
]

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

// 打开联系反馈（从更多功能弹窗）
function openContact() {
  showMoreModal.value = false
  showContactModal.value = true
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

.export-btn {
  background: #13c2c2;
  border-color: #13c2c2;
  color: white;
}

.export-btn:hover {
  background: #36cfc9;
  border-color: #36cfc9;
  color: white;
}

.dedup-btn {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: white;
}

.dedup-btn:hover {
  background: #ff7875;
  border-color: #ff7875;
  color: white;
}

.more-btn {
  background: #722ed1;
  border-color: #722ed1;
  color: white;
}

.more-btn:hover {
  background: #9254de;
  border-color: #9254de;
  color: white;
}

.changelog-btn {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}

.changelog-btn:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  color: white;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  min-width: 320px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: modalIn 0.2s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  line-height: 1;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

/* 更多功能弹窗 */
.feature-modal {
  width: 520px;
  overflow: hidden;
  position: relative;
}

.modal-close-float {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-float:hover {
  background: white;
  color: #333;
}

.feature-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 24px;
  text-align: center;
  color: white;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 12px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.feature-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.feature-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.feature-cards {
  padding: 20px;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #f8f9fc;
  border-radius: 12px;
  margin-bottom: 12px;
  position: relative;
  transition: all 0.2s;
}

.feature-card:hover {
  background: #f0f2f8;
  transform: translateX(4px);
}

.feature-card:last-child {
  margin-bottom: 0;
}

.card-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-content h3 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.card-content p {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.card-badge {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  padding: 3px 8px;
  background: linear-gradient(135deg, #52c41a, #73d13d);
  color: white;
  border-radius: 10px;
  font-weight: 500;
}

.card-badge.planning {
  background: linear-gradient(135deg, #faad14, #ffc53d);
}

.feature-footer {
  padding: 16px 24px;
  background: #fafafa;
  text-align: center;
  border-top: 1px solid #f0f0f0;
}

.footer-text {
  font-size: 13px;
  color: #888;
}

/* 更新日志弹窗 */
.changelog-modal {
  max-height: 70vh;
  width: 520px;
  overflow: hidden;
  position: relative;
}

.changelog-header {
  background: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%);
  padding: 28px 24px;
  text-align: center;
  color: white;
}

.changelog-icon {
  font-size: 42px;
  margin-bottom: 10px;
}

.changelog-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.changelog-subtitle {
  font-size: 13px;
  opacity: 0.9;
  margin: 0;
}

.changelog-body {
  max-height: 45vh;
  overflow-y: auto;
  padding: 20px 24px;
}

.changelog-timeline {
  position: relative;
}

.timeline-item {
  position: relative;
  padding-left: 24px;
  padding-bottom: 20px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 12px;
  bottom: 0;
  width: 2px;
  background: #e8e8e8;
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d9d9d9;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #e8e8e8;
}

.timeline-item.latest .timeline-dot {
  background: #1890ff;
  box-shadow: 0 0 0 2px #1890ff33;
}

.timeline-content {
  background: #f8f9fc;
  border-radius: 10px;
  padding: 14px;
}

.timeline-item.latest .timeline-content {
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
  border: 1px solid #91d5ff;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.version-tag {
  background: #8c8c8c;
  color: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.version-tag.version-latest {
  background: linear-gradient(135deg, #1890ff, #36cfc9);
}

.version-date {
  color: #999;
  font-size: 12px;
}

.new-badge {
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 600;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.timeline-changes {
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-changes li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #555;
  font-size: 13px;
  line-height: 1.8;
}

.change-icon {
  font-size: 12px;
}

/* 联系反馈按钮 */
.contact-btn {
  background: #52c41a;
  border-color: #52c41a;
  color: white;
}

.contact-btn:hover {
  background: #73d13d;
  border-color: #73d13d;
  color: white;
}

/* 可点击文本 */
.clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.clickable:hover {
  color: #1890ff;
}

/* 联系反馈弹窗 */
.contact-modal {
  width: 400px;
  overflow: hidden;
  position: relative;
}

.contact-header {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  padding: 28px 24px;
  text-align: center;
  color: white;
}

.contact-icon {
  font-size: 42px;
  margin-bottom: 10px;
}

.contact-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.contact-subtitle {
  font-size: 13px;
  opacity: 0.9;
  margin: 0;
}

.contact-body {
  padding: 24px;
  text-align: center;
}

.qrcode-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.contact-tip {
  margin: 16px 0 0 0;
  color: #888;
  font-size: 13px;
}
</style>
