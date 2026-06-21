import { reactive } from 'vue'

const ICON_MAP = {
  success: 'mdi-check-circle',
  error: 'mdi-alert-circle',
  info: 'mdi-information',
} as const

type SnackColor = keyof typeof ICON_MAP
type IconType = (typeof ICON_MAP)[SnackColor]

const state = reactive<{
  show: boolean
  color: SnackColor
  text: string
  icon: IconType
}>({
  show: false,
  color: 'success',
  text: '',
  icon: ICON_MAP.success,
})

export function useSnackbar() {
  function showSnack(color: SnackColor, text: string) {
    state.color = color
    state.text = text
    state.icon = ICON_MAP[color]
    state.show = true
  }
  return { state, showSnack }
}
