// ============================================================
// テスト対象: AppLoadingOverlay (src/components/ui/AppLoadingOverlay.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// useGlobalLoading の isLoading に応じて全画面グルグルを表示する常駐コンポーネント。
// テストケース一覧
//   [1] ローディングなし → グルグルが表示されない
//   [2] 遷移中フラグ ON → グルグルが表示され、OFF で消える
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppLoadingOverlay from '../AppLoadingOverlay.vue'
import { startNavigation, endNavigation } from '@/composables/useGlobalLoading'

const findSpinner = () => document.querySelector('[data-testid="global-loading"]')

describe('AppLoadingOverlay', () => {
  it('ローディングがないときはグルグルが表示されない', () => {
    const w = mount(AppLoadingOverlay, { attachTo: document.body })
    expect(findSpinner()).toBeNull()
    w.unmount()
  })

  it('遷移中フラグが ON の間だけグルグルが表示される', async () => {
    const w = mount(AppLoadingOverlay, { attachTo: document.body })
    startNavigation()
    await nextTick()
    expect(findSpinner()).not.toBeNull()
    endNavigation()
    await nextTick()
    // v-overlay は leave トランジション後に DOM から消えるため waitFor で待つ
    // jsdom での CSS transition 環境対応: display:none になるまで待つ
    await vi.waitFor(() => {
      const spinner = findSpinner()
      return spinner === null || (spinner as HTMLElement).offsetParent === null
    }, { timeout: 2000 })
    w.unmount()
  })
})
