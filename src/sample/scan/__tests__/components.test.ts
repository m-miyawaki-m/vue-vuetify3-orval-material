import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanResultCard from '../components/ScanResultCard.vue'
import type { ScanItem } from '../types'

const item: ScanItem = {
  raw: 'ITEM01,LOT-A,12',
  format: 'QR_CODE',
  timestamp: 1000,
  fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
}

describe('ScanTypeTabs', () => {
  it('3種別のタブを表示し、クリックで update:modelValue を emit する', async () => {
    const w = mount(ScanTypeTabs, { props: { modelValue: 'barcode' as const } })
    const tabs = w.findAll('.v-tab')
    expect(tabs).toHaveLength(3)
    await tabs[0].trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['qr'])
  })
})

describe('ScanSummaryBar', () => {
  it('件数と直近1件(fields 指定時はラベル値連結)を表示する', () => {
    const w = mount(ScanSummaryBar, {
      props: {
        count: 3,
        latest: item,
        fields: [
          { key: 'productCode', label: '商品コード' },
          { key: 'lot', label: 'ロット' },
        ],
      },
    })
    expect(w.text()).toContain('読取済み: 3件')
    expect(w.text()).toContain('ITEM01 / LOT-A')
  })

  it('fields が空なら直近は raw を表示する', () => {
    const w = mount(ScanSummaryBar, { props: { count: 1, latest: item, fields: [] } })
    expect(w.text()).toContain('ITEM01,LOT-A,12')
  })
})

describe('ScanResultCard', () => {
  it('raw と形式を表示する', () => {
    const w = mount(ScanResultCard, { props: { item } })
    expect(w.text()).toContain('ITEM01,LOT-A,12')
    expect(w.text()).toContain('QR_CODE')
  })
})
