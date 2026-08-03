import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { ScanItem } from '../types'

const item = (raw: string, timestamp = 1): ScanItem => ({
  raw,
  format: 'EAN_13',
  timestamp,
  fields: {},
})

describe('stepScanSessionStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初期状態はセッションなし・ステップ0', () => {
    const store = useStepScanSessionStore()
    expect(store.hasSession).toBe(false)
    expect(store.currentStepIndex).toBe(0)
    expect(store.setCount).toBe(0)
  })

  it('startSession でパターン/モードを設定し parts/sets をクリアする', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('old'))
    store.completeSet()
    store.startSession('pair-list', 'continuous')
    expect(store.patternId).toBe('pair-list')
    expect(store.mode).toBe('continuous')
    expect(store.parts).toHaveLength(0)
    expect(store.sets).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('addPart で parts に積まれ currentStepIndex が進む', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('A'))
    expect(store.currentStepIndex).toBe(1)
    store.addPart(item('B'))
    expect(store.currentStepIndex).toBe(2)
    expect(store.parts.map((p) => p.raw)).toEqual(['A', 'B'])
  })

  it('completeSet で parts が sets に移り currentStepIndex が 0 に戻る', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('A'))
    store.addPart(item('B'))
    store.completeSet()
    expect(store.setCount).toBe(1)
    expect(store.sets[0].parts.map((p) => p.raw)).toEqual(['A', 'B'])
    expect(store.parts).toHaveLength(0)
    expect(store.currentStepIndex).toBe(0)
    expect(store.firstSet?.parts[0].raw).toBe('A')
  })

  it('stepBack は直前の part を破棄して1つ戻る(空なら何もしない)', () => {
    const store = useStepScanSessionStore()
    store.stepBack() // 空でもエラーにならない
    store.addPart(item('A'))
    store.addPart(item('B'))
    store.stepBack()
    expect(store.parts.map((p) => p.raw)).toEqual(['A'])
    expect(store.currentStepIndex).toBe(1)
  })

  it('removeSet は指定 index の組を削除する', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('A'))
    store.completeSet()
    store.addPart(item('B'))
    store.completeSet()
    store.removeSet(0)
    expect(store.sets.map((s) => s.parts[0].raw)).toEqual(['B'])
  })

  it('clearSets は sets と parts を空にしセッションは維持する', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-single', 'single')
    store.addPart(item('A'))
    store.completeSet()
    store.addPart(item('B'))
    store.clearSets()
    expect(store.sets).toHaveLength(0)
    expect(store.parts).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('reset でセッション終了', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-single', 'single')
    store.addPart(item('A'))
    store.reset()
    expect(store.hasSession).toBe(false)
    expect(store.parts).toHaveLength(0)
    expect(store.sets).toHaveLength(0)
  })
})
