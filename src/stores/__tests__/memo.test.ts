// ============================================================
// テスト対象: useMemoStore (src/stores/memo.ts)
// 種別: ストアユニットテスト
// ------------------------------------------------------------
// テストケース一覧
//   [1] 初期状態ではメモが空
//   [2] setMemo でメモを保存できる
//   [3] hasMemo: メモがある場合 true
//   [4] hasMemo: メモがない場合 false
//   [5] hasMemo: 空白のみのメモは false（境界値）
//   [6] setMemo で空文字にするとメモが消える
//   [7] 商品ごとに独立して管理される
// ============================================================
import { describe, it, expect } from 'vitest'
import { useMemoStore } from '../memo'

describe('useMemoStore', () => {
  it('初期状態ではメモが空', () => {
    const store = useMemoStore()
    expect(store.getMemo(1)).toBe('')
  })

  it('setMemo でメモを保存できる', () => {
    const store = useMemoStore()
    store.setMemo(1, 'テストメモ')
    expect(store.getMemo(1)).toBe('テストメモ')
  })

  it('hasMemo: メモがある場合 true', () => {
    const store = useMemoStore()
    store.setMemo(2, '何か入力')
    expect(store.hasMemo(2)).toBe(true)
  })

  it('hasMemo: メモがない場合 false', () => {
    const store = useMemoStore()
    expect(store.hasMemo(99)).toBe(false)
  })

  it('hasMemo: 空白のみのメモは false', () => {
    const store = useMemoStore()
    store.setMemo(3, '   ')
    expect(store.hasMemo(3)).toBe(false)
  })

  it('setMemo で空文字にするとメモが消える', () => {
    const store = useMemoStore()
    store.setMemo(4, 'あり')
    store.setMemo(4, '')
    expect(store.hasMemo(4)).toBe(false)
  })

  it('商品ごとに独立して管理される', () => {
    const store = useMemoStore()
    store.setMemo(1, '商品1のメモ')
    store.setMemo(2, '商品2のメモ')
    expect(store.getMemo(1)).toBe('商品1のメモ')
    expect(store.getMemo(2)).toBe('商品2のメモ')
  })
})
