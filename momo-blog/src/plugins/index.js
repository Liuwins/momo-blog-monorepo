import { toast } from '@/utils/toast'
import { showConfirmDialog } from 'vant'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'

export { toast }

export const dialog = {
  confirm: (options) => showConfirmDialog(options),
}

export function installPlugins(app) {
  app.config.globalProperties.$toast = toast
  app.config.globalProperties.$dialog = dialog
}
