import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import { createSplitParser } from '../logic/parsers'
import type { ScanFieldDef, ScanItem } from '../types'

const fieldDefs: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]
const parser = createSplitParser(fieldDefs.map((f) => f.key))
const item: ScanItem = {
  raw: 'ITEM01,LOT-A,12',
  format: 'OCR',
  timestamp: 1000,
  fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
}

function mountDialog() {
  return mount(ScanOcrConfirmDialog, {
    props: { modelValue: true, item, fieldDefs, parser },
    attachTo: document.body,
  })
}

describe('ScanOcrConfirmDialog', () => {
  it('item の値と項目が初期表示される', async () => {
    const w = mountDialog()
    const rawInput = document.body.querySelector('.raw-input input') as HTMLInputElement
    expect(rawInput.value).toBe('ITEM01,LOT-A,12')
    const qtyInput = document.body.querySelector('.field-input-qty input') as HTMLInputElement
    expect(qtyInput.value).toBe('12')
    w.unmount()
  })

  it('raw を修正して追加すると再分割済みの item を confirm emit する', async () => {
    const w = mountDialog()
    const rawInput = document.body.querySelector('.raw-input input') as HTMLInputElement
    rawInput.value = 'ITEM09,LOT-Z,7'
    rawInput.dispatchEvent(new Event('input'))
    await w.vm.$nextTick()
    ;(document.body.querySelector('.confirm-btn') as HTMLElement).click()
    await w.vm.$nextTick()
    const emitted = w.emitted('confirm')?.[0]?.[0] as ScanItem
    expect(emitted.raw).toBe('ITEM09,LOT-Z,7')
    expect(emitted.fields).toEqual({ productCode: 'ITEM09', lot: 'LOT-Z', qty: '7' })
    expect(emitted.format).toBe('OCR')
    w.unmount()
  })

  it('破棄で discard を emit し confirm は出ない', async () => {
    const w = mountDialog()
    ;(document.body.querySelector('.discard-btn') as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('discard')).toHaveLength(1)
    expect(w.emitted('confirm')).toBeUndefined()
    w.unmount()
  })
})
