// ============================================================
// テスト対象: BaseDialog (src/components/dialog/BaseDialog.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: title / maxWidth? (default: '500px')
// v-model: modelValue (表示制御)
// slots: default / actions
// ------------------------------------------------------------
// テストケース一覧
//   [1] modelValue=true → title が表示される
//   [2] デフォルトスロットの内容が表示される
//   [3] actions スロットの内容が表示される
//   [4] modelValue=false → コンテンツが body に表示されない
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDialog from '../BaseDialog.vue'

describe('BaseDialog', () => {
  it('modelValue=true のとき title が表示される', () => {
    const w = mount(BaseDialog, {
      props: { modelValue: true, title: 'お知らせ' },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('お知らせ')
    w.unmount()
  })

  it('デフォルトスロットの内容が表示される', () => {
    const w = mount(BaseDialog, {
      props: { modelValue: true, title: 'テスト' },
      slots: { default: '<p>スロットの内容</p>' },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('スロットの内容')
    w.unmount()
  })

  it('actions スロットの内容が表示される', () => {
    const w = mount(BaseDialog, {
      props: { modelValue: true, title: 'テスト' },
      slots: { actions: '<button>閉じる</button>' },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('閉じる')
    w.unmount()
  })

  it('modelValue=false のとき body にコンテンツが表示されない', () => {
    const w = mount(BaseDialog, {
      props: { modelValue: false, title: '非表示タイトル' },
      attachTo: document.body,
    })
    expect(document.body.textContent).not.toContain('非表示タイトル')
    w.unmount()
  })
})
