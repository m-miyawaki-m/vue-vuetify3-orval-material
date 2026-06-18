import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SearchPage from '../SearchPage.vue'

// useRouter を差し替えて push をスパイ
const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({ push: mockPush, back: vi.fn() }),
    useRoute: () => ({ path: '/search', query: {} }),
  }
})

// MainLayout の v-bottom-navigation がナビゲーションタブを描画するため最小限のルーターは必要
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/search', component: { template: '<div />' } },
      { path: '/products', component: { template: '<div />' } },
      { path: '/scanner', component: { template: '<div />' } },
    ],
  })
}

describe('SearchPage', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('キーワードのみで検索すると { path: /products, query: { q } } で push', async () => {
    const wrapper = mount(SearchPage, {
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })

    await wrapper.find('input').setValue('緑茶')

    const filterBtn = wrapper.findAll('button').find(b => b.text().includes('絞り込み'))
    // 絞り込みボタンが見つかることを確認（レンダリング確認）
    expect(filterBtn?.exists()).toBe(true)

    // footerActions の 検索 onClick を直接実行（v-bottom-navigation 内ボタンの代替）
    const searchBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.trim() === '検索' || b.textContent?.includes('検索'))
    searchBtn?.click()
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      path: '/products',
      query: { q: '緑茶' },
    })
    wrapper.unmount()
  })

  it('キーワードなしで検索すると空クエリで /products に push', async () => {
    const wrapper = mount(SearchPage, {
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })

    const searchBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.trim() === '検索' || b.textContent?.includes('検索'))
    searchBtn?.click()
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      path: '/products',
      query: {},
    })
    wrapper.unmount()
  })

  it('絞り込みボタンクリックでダイアログが開く', async () => {
    const wrapper = mount(SearchPage, {
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })

    const filterBtn = wrapper.findAll('button').find(b => b.text().includes('絞り込み'))
    await filterBtn?.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('絞り込み条件')
    wrapper.unmount()
  })

  it('読み取りボタンクリックで /scanner に push', async () => {
    const wrapper = mount(SearchPage, {
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })

    const scanBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.includes('読み取り'))
    scanBtn?.click()
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith('/scanner')
    wrapper.unmount()
  })
})
