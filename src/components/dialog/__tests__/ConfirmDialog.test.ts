// ============================================================
// テスト対象: ConfirmDialog (src/components/dialog/ConfirmDialog.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: title / message
// v-model: modelValue (表示制御)
// emits: confirm / cancel
// ------------------------------------------------------------
// テストケース一覧
//   [1] modelValue=true → title と message が表示される
//   [2] OK ボタンクリックで confirm イベントを発火
//   [3] キャンセルボタンクリックで cancel イベントを発火
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'

const defaultProps = {
  modelValue: true,
  title: '削除の確認',
  message: 'このアイテムを削除しますか？',
}

describe('ConfirmDialog', () => {
  it('modelValue=true のとき title と message が表示される', () => {
    const w = mount(ConfirmDialog, {
      props: defaultProps,
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('削除の確認')
    expect(document.body.textContent).toContain('このアイテムを削除しますか？')
    w.unmount()
  })

  it('OK ボタンクリックで confirm イベントを発火', async () => {
    const w = mount(ConfirmDialog, {
      props: defaultProps,
      attachTo: document.body,
    })
    const okBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.includes('OK'))
    okBtn?.click()
    await w.vm.$nextTick()
    expect(w.emitted('confirm')).toBeTruthy()
    w.unmount()
  })

  it('キャンセルボタンクリックで cancel イベントを発火', async () => {
    const w = mount(ConfirmDialog, {
      props: defaultProps,
      attachTo: document.body,
    })
    const cancelBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.includes('キャンセル'))
    cancelBtn?.click()
    await w.vm.$nextTick()
    expect(w.emitted('cancel')).toBeTruthy()
    w.unmount()
  })
})
