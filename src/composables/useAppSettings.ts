// 应用设置管理
import { ref, onMounted } from 'vue'

export interface AppSettings {
  enableOCR: boolean
  apiKey: string
  apiUrl: string
  defaultBuyer: string
  defaultSeller: string
}

const DEFAULT_SETTINGS: AppSettings = {
  enableOCR: true,
  apiKey: '',
  apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  defaultBuyer: '',
  defaultSeller: ''
}

export function useAppSettings() {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const showSettings = ref(false)

  // 加载设置
  function loadSettings() {
    const saved = localStorage.getItem('invoice-settings')
    if (saved) {
      settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
    // 同步到环境变量
    if (settings.value.apiKey) {
      import.meta.env.VITE_SILICONFLOW_API_KEY = settings.value.apiKey
    }
    if (settings.value.apiUrl) {
      import.meta.env.VITE_SILICONFLOW_API_URL = settings.value.apiUrl
    }
  }

  // 保存设置
  function saveSettings() {
    localStorage.setItem('invoice-settings', JSON.stringify(settings.value))
    // 更新环境变量
    import.meta.env.VITE_SILICONFLOW_API_KEY = settings.value.apiKey
    import.meta.env.VITE_SILICONFLOW_API_URL = settings.value.apiUrl
    showSettings.value = false
    alert('设置已保存')
  }

  // 获取 API 配置
  function getApiConfig() {
    return {
      apiKey: settings.value.apiKey || import.meta.env.VITE_SILICONFLOW_API_KEY || '',
      apiUrl:
        settings.value.apiUrl ||
        import.meta.env.VITE_SILICONFLOW_API_URL ||
        'https://api.siliconflow.cn/v1/chat/completions'
    }
  }

  onMounted(() => {
    loadSettings()
  })

  return {
    settings,
    showSettings,
    saveSettings,
    getApiConfig
  }
}
