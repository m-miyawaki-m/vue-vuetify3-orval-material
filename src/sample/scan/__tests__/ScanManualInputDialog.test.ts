import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'

const mountDialog = () =>
  mount(ScanManualInputDialog, {
    props: { modelValue: true },
    attachTo: document.body,
  })

describe('ScanManualInputDialog', () => {
  it('入力して追加すると submit を emit し入力欄がクリアされる', async () => {
    const w = mountDialog()
    const input = document.body.querySelector('input') as HTMLInputElement
    input.value = 'ITEM01,LOT-A,12'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await w.vm.$nextTick()
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('追加'),
    )
    submitBtn?.click()
    await w.vm.$nextTick()
    expect(w.emitted('submit')?.[0]).toEqual(['ITEM01,LOT-A,12'])
    const inputAfter = document.body.querySelector('input') as HTMLInputElement
    expect(inputAfter.value).toBe('')
    // 開いたまま(連続入力対応): 閉じる指示は出ていない
    expect(w.emitted('update:modelValue')).toBeUndefined()
    w.unmount()
  })

  it('前後空白は trim して emit する', async () => {
    const w = mountDialog()
    const input = document.body.querySelector('input') as HTMLInputElement
    input.value = '  ABC  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await w.vm.$nextTick()
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('追加'),
    )
    submitBtn?.click()
    await w.vm.$nextTick()
    expect(w.emitted('submit')?.[0]).toEqual(['ABC'])
    w.unmount()
  })

  it('空文字では submit を emit しない', async () => {
    const w = mountDialog()
    const input = document.body.querySelector('input') as HTMLInputElement
    input.value = '   '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await w.vm.$nextTick()
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('追加'),
    )
    submitBtn?.click()
    await w.vm.$nextTick()
    expect(w.emitted('submit')).toBeUndefined()
    w.unmount()
  })

  it('Enter キーでも追加できる', async () => {
    const w = mountDialog()
    const input = document.body.querySelector('input') as HTMLInputElement
    input.value = 'XYZ'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await w.vm.$nextTick()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
    await w.vm.$nextTick()
    expect(w.emitted('submit')?.[0]).toEqual(['XYZ'])
    w.unmount()
  })

  it('閉じるで update:modelValue(false) を emit する', async () => {
    const w = mountDialog()
    const closeBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('閉じる'),
    )
    closeBtn?.click()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')?.[0]).toEqual([false])
    w.unmount()
  })
})
