// ============================================================
// テスト対象: AppLoadingOverlay (src/components/ui/AppLoadingOverlay.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// useGlobalLoading の isLoading に応じて全画面グルグルを表示する常駐コンポーネント。
// テストケース一覧
//   [1] ローディングなし → グルグルが表示されない
//   [2] 遷移中フラグ ON → グルグルが表示され、OFF で消える
//   [3] close-on-back が無効化されている（戻るナビゲーション自滅バグの回帰防止）
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VOverlay } from 'vuetify/components/VOverlay'
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
    // v-overlay は leave トランジション後に DOM から消えるため waitUntil で待つ。
    // jsdom は offsetParent 等のレイアウト系プロパティを常に null 固定で返す(実装されていない)ため、
    // 非表示判定には使えない。@vue/test-utils のグローバル transition スタブは leave 確定時に
    // .v-overlay__content へ同期的に display:none を書き込むため、それを見て判定する。
    await vi.waitUntil(() => {
      const spinner = findSpinner()
      if (spinner === null) return true
      const content = (spinner as HTMLElement).closest<HTMLElement>('.v-overlay__content')
      return content === null || content.style.display === 'none'
    }, { timeout: 2000 })
    w.unmount()
  })

  it('close-on-back が無効化されている（戻る操作をキャンセルさせない）', () => {
    // このオーバーレイは startNavigation()（router.beforeEach）で表示されるため、
    // closeOnBack（VOverlay 既定 true）が有効だと「戻る操作 → ローディング表示 →
    // Vuetify がアクティブな persistent オーバーレイを理由にその戻りナビゲーション自体を
    // キャンセル」という自滅が起きる。false 固定が必須。
    const w = mount(AppLoadingOverlay)
    expect(w.findComponent(VOverlay).props('closeOnBack')).toBe(false)
    w.unmount()
  })
})
