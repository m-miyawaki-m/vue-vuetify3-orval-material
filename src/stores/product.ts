import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product } from '@/types/product'
import { mockProducts } from '@/mocks/products'

const PAGE_SIZE = 5

export const useProductStore = defineStore('product', () => {
  const products = ref<Product[]>(mockProducts)
  const keyword = ref('')
  const selectedCategory = ref('')
  const inStockOnly = ref(false)
  const currentPage = ref(1)
  const selectedProduct = ref<Product | null>(null)

  const filteredProducts = computed(() =>
    products.value.filter(p => {
      const matchKeyword = !keyword.value
        || p.name.includes(keyword.value)
        || p.description.includes(keyword.value)
      const matchCategory = !selectedCategory.value || p.category === selectedCategory.value
      const matchStock = !inStockOnly.value || p.inStock
      return matchKeyword && matchCategory && matchStock
    })
  )

  const totalPages = computed(() =>
    Math.ceil(filteredProducts.value.length / PAGE_SIZE)
  )

  const pagedProducts = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredProducts.value.slice(start, start + PAGE_SIZE)
  })

  function resetPage() {
    currentPage.value = 1
  }

  function selectProduct(product: Product) {
    selectedProduct.value = product
  }

  return {
    products,
    keyword,
    selectedCategory,
    inStockOnly,
    currentPage,
    selectedProduct,
    filteredProducts,
    totalPages,
    pagedProducts,
    resetPage,
    selectProduct,
  }
})
