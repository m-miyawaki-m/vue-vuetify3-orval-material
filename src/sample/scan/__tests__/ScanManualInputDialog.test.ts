import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'

const mountDialog = () =>
  mount(ScanManualInputDialog, {
    props: { modelValue: true },
    global: { stubs: { teleport: true } },
  })

describe('ScanManualInputDialog', () => {
  it('入力して追加すると submit を emit し入力欄がクリアされる', async () => {
    const w = mountDialog()
    const input = w.find('input')
    await input.setValue('ITEM01,LOT-A,12')
    await w.find('.submit-btn').trigger('click')
    expect(w.emitted('submit')?.[0]).toEqual(['ITEM01,LOT-A,12'])
    expect((input.element as HTMLInputElement).value).toBe('')
    // 開いたまま(連続入力対応): 閉じる指示は出ていない
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('前後空白は trim して emit する', async () => {
    const w = mountDialog()
    await w.find('input').setValue('  ABC  ')
    await w.find('.submit-btn').trigger('click')
    expect(w.emitted('submit')?.[0]).toEqual(['ABC'])
  })

  it('空文字では submit を emit しない', async () => {
    const w = mountDialog()
    await w.find('input').setValue('   ')
    await w.find('.submit-btn').trigger('click')
    expect(w.emitted('submit')).toBeUndefined()
  })

  it('Enter キーでも追加できる', async () => {
    const w = mountDialog()
    const input = w.find('input')
    await input.setValue('XYZ')
    await input.trigger('keydown.enter')
    expect(w.emitted('submit')?.[0]).toEqual(['XYZ'])
  })

  it('閉じるで update:modelValue(false) を emit する', async () => {
    const w = mountDialog()
    await w.find('.close-btn').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
