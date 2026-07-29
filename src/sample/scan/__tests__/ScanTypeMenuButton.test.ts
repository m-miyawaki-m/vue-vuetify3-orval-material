import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'

describe('ScanTypeMenuButton', () => {
  it('現在の種別ラベルを表示する', () => {
    const w = mount(ScanTypeMenuButton, {
      props: { modelValue: 'barcode' as const },
      attachTo: document.body,
    })
    expect(w.text()).toContain('種別: バーコード')
    w.unmount()
  })

  it('メニューから選択すると update:modelValue を emit する', async () => {
    const w = mount(ScanTypeMenuButton, {
      props: { modelValue: 'barcode' as const },
      attachTo: document.body,
    })
    await w.find('.type-menu-btn').trigger('click')
    await w.vm.$nextTick()
    const qrItem = Array.from(document.body.querySelectorAll('.v-list-item')).find(
      (el) => el.textContent?.includes('QR'),
    )
    expect(qrItem).toBeTruthy()
    ;(qrItem as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['qr'])
    w.unmount()
  })

  it('3種別すべてがメニューに並ぶ', async () => {
    const w = mount(ScanTypeMenuButton, {
      props: { modelValue: 'qr' as const },
      attachTo: document.body,
    })
    await w.find('.type-menu-btn').trigger('click')
    await w.vm.$nextTick()
    const texts = Array.from(document.body.querySelectorAll('.v-list-item')).map(
      (el) => el.textContent ?? '',
    )
    expect(texts.some((t) => t.includes('QR'))).toBe(true)
    expect(texts.some((t) => t.includes('バーコード'))).toBe(true)
    expect(texts.some((t) => t.includes('OCR'))).toBe(true)
    w.unmount()
  })
})
