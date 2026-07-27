import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanItem } from '../types'

const item = (raw: string, timestamp = 1): ScanItem => ({
  raw,
  format: 'EAN_13',
  timestamp,
  fields: {},
})

describe('scanSessionStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初期状態はセッションなし', () => {
    const store = useScanSessionStore()
    expect(store.hasSession).toBe(false)
    expect(store.count).toBe(0)
  })

  it('startSession でパターン/モードを設定し items をクリアする', () => {
    const store = useScanSessionStore()
    store.addItem(item('old'))
    store.startSession('list-raw', 'continuous')
    expect(store.patternId).toBe('list-raw')
    expect(store.mode).toBe('continuous')
    expect(store.items).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('setSingleResult は items を1件に置き換える', () => {
    const store = useScanSessionStore()
    store.addItem(item('A'))
    store.setSingleResult(item('B'))
    expect(store.items).toHaveLength(1)
    expect(store.single?.raw).toBe('B')
  })

  it('addItem は末尾に追加し latest が末尾を返す', () => {
    const store = useScanSessionStore()
    store.addItem(item('A', 1))
    store.addItem(item('B', 2))
    expect(store.count).toBe(2)
    expect(store.latest?.raw).toBe('B')
  })

  it('removeItem は指定 index を削除する', () => {
    const store = useScanSessionStore()
    store.addItem(item('A'))
    store.addItem(item('B'))
    store.removeItem(0)
    expect(store.items.map((i) => i.raw)).toEqual(['B'])
  })

  it('clearItems は items のみ空にしセッションは維持する', () => {
    const store = useScanSessionStore()
    store.startSession('single-raw', 'single')
    store.addItem(item('A'))
    store.clearItems()
    expect(store.items).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('reset でセッション終了(patternId/items が消える)', () => {
    const store = useScanSessionStore()
    store.startSession('single-raw', 'single')
    store.addItem(item('A'))
    store.reset()
    expect(store.hasSession).toBe(false)
    expect(store.items).toHaveLength(0)
  })
})
