import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanItemList from '../components/ScanItemList.vue'
import type { ScanFieldDef, ScanItem } from '../types'

const items: ScanItem[] = [
  {
    raw: 'ITEM01,LOT-A,12',
    format: 'QR_CODE',
    timestamp: 1000,
    fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
  },
  {
    raw: 'ITEM02,LOT-B,5',
    format: 'QR_CODE',
    timestamp: 2000,
    fields: { productCode: 'ITEM02', lot: 'LOT-B', qty: '5' },
  },
]
const fields: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]

describe('ScanItemList', () => {
  it('件数バーに件数を表示し、1件=1カードで縦に並ぶ', () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    expect(w.text()).toContain('読取済み: 2件')
    expect(w.findAll('.scan-item-card')).toHaveLength(2)
  })

  it('fields 指定時はカード内にラベル付きで縦表示する', () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    expect(w.text()).toContain('商品コード: ITEM01')
    expect(w.text()).toContain('ロット: LOT-A')
    expect(w.text()).toContain('数量: 12')
  })

  it('fields が空なら raw と形式を表示する', () => {
    const w = mount(ScanItemList, { props: { items, fields: [] } })
    expect(w.text()).toContain('読取値: ITEM01,LOT-A,12')
    expect(w.text()).toContain('QR_CODE')
  })

  it('削除ボタンで remove(index) を emit する', async () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    await w.findAll('.remove-btn')[1].trigger('click')
    expect(w.emitted('remove')?.[0]).toEqual([1])
  })

  it('クリアボタンで clear を emit する', async () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    await w.find('.clear-btn').trigger('click')
    expect(w.emitted('clear')).toHaveLength(1)
  })

  it('0件のとき空メッセージを表示しクリアボタンは出ない', () => {
    const w = mount(ScanItemList, { props: { items: [], fields } })
    expect(w.text()).toContain('読み取り結果がありません')
    expect(w.find('.clear-btn').exists()).toBe(false)
  })
})
