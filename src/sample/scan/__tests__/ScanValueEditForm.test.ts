import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
import { createSplitParser, passthroughParser } from '../logic/parsers'
import type { ScanFieldDef } from '../types'

const fieldDefs: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]
const parser = createSplitParser(fieldDefs.map((f) => f.key))

describe('ScanValueEditForm', () => {
  it('raw 編集で update:raw と再分割された update:fields を emit する', async () => {
    const w = mount(ScanValueEditForm, {
      props: { raw: '', fields: {}, fieldDefs, parser },
    })
    await w.find('.raw-input input').setValue('ITEM01,LOT-A,12')
    expect(w.emitted('update:raw')?.at(-1)).toEqual(['ITEM01,LOT-A,12'])
    expect(w.emitted('update:fields')?.at(-1)).toEqual([
      { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
    ])
  })

  it('項目の個別編集はマージして update:fields を emit する(raw は変えない)', async () => {
    const w = mount(ScanValueEditForm, {
      props: {
        raw: 'ITEM01,LOT-A,12',
        fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
        fieldDefs,
        parser,
      },
    })
    await w.find('.field-input-qty input').setValue('99')
    expect(w.emitted('update:fields')?.at(-1)).toEqual([
      { productCode: 'ITEM01', lot: 'LOT-A', qty: '99' },
    ])
    expect(w.emitted('update:raw')).toBeUndefined()
  })

  it('rawEditable: false のとき raw 入力欄はなく読み取り専用表示になる', () => {
    const w = mount(ScanValueEditForm, {
      props: { raw: 'ABC', fields: {}, fieldDefs, parser, rawEditable: false },
    })
    expect(w.find('.raw-input').exists()).toBe(false)
    expect(w.find('.raw-static').text()).toContain('ABC')
  })

  it('fieldDefs が空なら項目入力欄は出ない', () => {
    const w = mount(ScanValueEditForm, {
      props: { raw: 'ABC', fields: {}, fieldDefs: [], parser: passthroughParser },
    })
    expect(w.find('.raw-input').exists()).toBe(true)
    expect(w.findAll('.v-text-field')).toHaveLength(1)
  })
})
