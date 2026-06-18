// ============================================================
// テスト対象: ProductFilterDialog (src/components/search/ProductFilterDialog.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: modelValue(表示制御) / category / inStock
// emits: update:modelValue / reset
// ------------------------------------------------------------
// テストケース一覧
//   [1] modelValue=true → ダイアログが表示される
//   [2] 全カテゴリが選択肢として表示される
//   [3] リセットボタンクリック → reset イベントを発火
//   [4] 閉じるボタンクリック  → update:modelValue=false を発火
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductFilterDialog, { CATEGORIES } from '../ProductFilterDialog.vue'

const defaultProps = {
  modelValue: true,
  category: '' as const,
  inStock: false,
}

const mountOptions = {
  props: defaultProps,
  attachTo: document.body,
}

describe('ProductFilterDialog', () => {
  it('modelValue=true のときダイアログが表示される', () => {
    const wrapper = mount(ProductFilterDialog, mountOptions)
    expect(document.body.textContent).toContain('絞り込み条件')
    wrapper.unmount()
  })

  it('全カテゴリが選択肢として表示される', () => {
    const wrapper = mount(ProductFilterDialog, mountOptions)
    for (const cat of CATEGORIES) {
      expect(document.body.textContent).toContain(cat)
    }
    wrapper.unmount()
  })

  it('リセットボタンクリックで reset イベントを発火', async () => {
    const wrapper = mount(ProductFilterDialog, mountOptions)
    const buttons = document.body.querySelectorAll('button')
    const resetBtn = Array.from(buttons).find(b => b.textContent?.includes('リセット'))
    resetBtn?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('reset')).toBeTruthy()
    wrapper.unmount()
  })

  it('閉じるボタンクリックで update:modelValue=false を発火', async () => {
    const wrapper = mount(ProductFilterDialog, mountOptions)
    const buttons = document.body.querySelectorAll('button')
    const closeBtn = Array.from(buttons).find(b => b.textContent?.includes('閉じる'))
    closeBtn?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    wrapper.unmount()
  })
})
