// 常量定义

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png'] as const

// 默认 API 配置
export const DEFAULT_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'

// 发票号码长度
export const INVOICE_NUMBER_LENGTH = {
  FULL_ELECTRONIC: 20, // 全电发票
  TRADITIONAL_MIN: 8, // 传统发票最小长度
  TRADITIONAL_MAX: 12 // 传统发票最大长度
} as const

// 发票代码长度
export const INVOICE_CODE_LENGTH = {
  MIN: 10,
  MAX: 12
} as const
