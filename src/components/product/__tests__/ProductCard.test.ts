// ============================================================
// テスト対象: ProductCard (src/components/product/ProductCard.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: product(商品データ)
// emits: click(商品) / detail(商品)
// 依存: useMemoStore（メモ登録状態の表示に使用）
// ------------------------------------------------------------
// テストケース一覧
//   [表示]
//   [1] 商品名・カテゴリ・説明文が表示される
//   [2] メモなし → 「未入力」チップを表示
//   [3] メモあり → 「入力済み」チップを表示
//   [4] inStock=true  → 「在庫あり」チップを表示
//   [5] inStock=false → 「在庫なし」チップを表示
//   [イベント]
//   [6] カードクリック     → click イベントを発火（商品オブジェクト付き）
//   [7] 詳細ボタンクリック → detail イベントを発火（商品オブジェクト付き）
//   [8] 詳細ボタンクリック → click イベントは発火しない（伝播なし）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { useMemoStore } from '@/stores/memo'
import ProductCard from '../ProductCard.vue'
import type { Product } from '@/types/api'

const baseProduct: Product = {
  id: 1,
  name: 'オーガニック緑茶',
  category: '食品',
  price: 1200,
  inStock: true,
  description: '風味豊かな緑茶',
  rating: 4,
  reviews: [],
}

describe('ProductCard', () => {
  it('商品名・カテゴリ・説明文が表示される', () => {
    const wrapper = mount(ProductCard, { props: { product: baseProduct } })
    expect(wrapper.text()).toContain('オーガニック緑茶')
    expect(wrapper.text()).toContain('食品')
    expect(wrapper.text()).toContain('風味豊かな緑茶')
  })

  it('メモなしのとき「未入力」チップを表示', () => {
    const wrapper = mount(ProductCard, { props: { product: baseProduct } })
    expect(wrapper.text()).toContain('未入力')
    expect(wrapper.text()).not.toContain('入力済み')
  })

  it('メモありのとき「入力済み」チップを表示', () => {
    const memoStore = useMemoStore()
    memoStore.setMemo(baseProduct.id, 'テストメモ')
    const wrapper = mount(ProductCard, { props: { product: baseProduct } })
    expect(wrapper.text()).toContain('入力済み')
    expect(wrapper.text()).not.toContain('未入力')
  })

  it('inStock=true のとき「在庫あり」チップを表示', () => {
    const wrapper = mount(ProductCard, { props: { product: baseProduct } })
    expect(wrapper.text()).toContain('在庫あり')
  })

  it('inStock=false のとき「在庫なし」チップを表示', () => {
    const wrapper = mount(ProductCard, {
      props: { product: { ...baseProduct, inStock: false } },
    })
    expect(wrapper.text()).toContain('在庫なし')
  })

  it('カードクリックで click イベントを発火', async () => {
    const wrapper = mount(ProductCard, { props: { product: baseProduct } })
    await wrapper.find('.v-card').trigger('click')
    expect(wrapper.emitted('click')?.[0]).toEqual([baseProduct])
  })

  it('「詳細を見る」クリックで detail イベントを発火', async () => {
    const wrapper = mount(ProductCard, { props: { product: baseProduct } })
    const btn = wrapper.findAll('button').find(b => b.text().includes('詳細を見る'))
    await btn?.trigger('click')
    expect(wrapper.emitted('detail')?.[0]).toEqual([baseProduct])
  })

  it('「詳細を見る」クリックは click イベントを発火しない', async () => {
    const wrapper = mount(ProductCard, { props: { product: baseProduct } })
    const btn = wrapper.findAll('button').find(b => b.text().includes('詳細を見る'))
    await btn?.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })
})
