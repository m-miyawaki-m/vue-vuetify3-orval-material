<template>
  <SubLayout :title="product?.name ?? '詳細'">
    <template #footer>
      <div class="d-flex align-center justify-center w-100" style="position: relative;">
        <v-btn
          v-if="errorHistory.length > 0"
          color="error"
          variant="tonal"
          icon
          style="position: absolute; left: 8px;"
          @click="errorSheetOpen = true"
        >
          <v-badge :content="errorHistory.length" color="error" floating>
            <v-icon>mdi-alert-circle-outline</v-icon>
          </v-badge>
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-content-save"
          :disabled="!product"
          @click="confirmOpen = true"
        >
          登録
        </v-btn>
      </div>
    </template>

    <FlowStepper :step="3" />
    <v-container v-if="product" class="pb-6">
      <v-tabs v-model="tab" class="mb-4" color="primary">
        <v-tab value="info">基本情報</v-tab>
        <v-tab value="issues">
          エラー一覧
          <v-badge
            v-if="unresolvedCount > 0"
            :content="unresolvedCount"
            color="error"
            inline
            class="ml-1"
          />
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- 基本情報タブ -->
        <v-window-item value="info">
          <v-card class="mb-3">
            <v-card-title>{{ product.name }}</v-card-title>
            <v-card-subtitle>{{ product.category }}</v-card-subtitle>
            <v-card-text>
              <v-chip :color="product.inStock ? 'success' : 'error'" variant="tonal" class="mb-3">
                {{ product.inStock ? '在庫あり' : '在庫なし' }}
              </v-chip>
              <p class="text-body-1">{{ product.description }}</p>
            </v-card-text>
          </v-card>

          <v-card>
            <v-card-text class="d-flex flex-column ga-2">
              <SelectPickerField
                v-model="localLocation"
                label="ロケーション *"
                placeholder="棚・場所を選択"
                :items="locationItems"
                :error="!!fieldErrors.location"
                :error-messages="fieldErrors.location"
              />
              <SelectPickerField
                v-model="localGroup"
                label="グループ *"
                placeholder="グループを選択"
                :items="groupItems"
                :error="!!fieldErrors.group"
                :error-messages="fieldErrors.group"
              />
              <BarcodeInputField
                v-model="localMemo"
                label="メモ"
                placeholder="メモを入力またはバーコードをスキャン"
                clearable
              />
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- エラー一覧タブ -->
        <v-window-item value="issues">
          <v-alert v-if="issues.length === 0" type="info" variant="tonal">
            エラーはありません。
          </v-alert>

          <v-card
            v-for="issue in issues"
            :key="issue.id"
            class="mb-3"
          >
            <v-card-title class="text-body-1 d-flex align-center ga-2 pt-4">
              {{ issue.title }}
              <v-chip
                :color="issue.resolved ? 'success' : 'error'"
                size="x-small"
                variant="tonal"
              >
                {{ issue.resolved ? '対応済み' : '未対応' }}
              </v-chip>
            </v-card-title>

            <v-card-text class="d-flex flex-column ga-3">
              <div class="d-flex align-center ga-3">
                <span class="text-body-2 text-medium-emphasis" style="min-width: 40px;">数量</span>
                <v-btn
                  icon="mdi-minus"
                  size="small"
                  variant="outlined"
                  :disabled="issue.quantity <= 0 || issue.resolved"
                  @click="issue.quantity--"
                />
                <span class="text-body-1 font-weight-bold" style="min-width: 32px; text-align: center;">
                  {{ issue.quantity }}
                </span>
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="outlined"
                  :disabled="issue.resolved"
                  @click="issue.quantity++"
                />
              </div>

              <v-textarea
                v-model="issue.comment"
                label="コメント"
                rows="2"
                auto-grow
                variant="outlined"
                density="compact"
                hide-details
                :disabled="issue.resolved"
              />
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn
                v-if="!issue.resolved"
                color="success"
                variant="elevated"
                size="small"
                prepend-icon="mdi-check"
                @click="issue.resolved = true"
              >
                対応済みにする
              </v-btn>
              <v-btn
                v-else
                variant="text"
                size="small"
                @click="issue.resolved = false"
              >
                未対応に戻す
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-window-item>
      </v-window>
    </v-container>

    <v-container v-else>
      <v-progress-linear v-if="isLoading" indeterminate color="primary" />
      <v-alert v-else type="error" variant="tonal">商品が見つかりませんでした。</v-alert>
    </v-container>
  </SubLayout>

  <!-- 確認ダイアログ -->
  <ConfirmDialog
    v-model="confirmOpen"
    title="登録確認"
    message="入力内容を登録します。よろしいですか？"
    @confirm="onConfirm"
    @cancel="confirmOpen = false"
  />

  <!-- エラー履歴ボトムシート -->
  <v-bottom-sheet v-model="errorSheetOpen">
    <v-card rounded="t-xl">
      <v-card-title class="pt-5 px-5 pb-1 text-h6 d-flex align-center">
        <v-icon color="error" class="mr-2">mdi-alert-circle-outline</v-icon>
        エラー履歴
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="errorSheetOpen = false" />
      </v-card-title>

      <v-list lines="two" class="px-2">
        <v-list-item
          v-for="(err, i) in errorHistory"
          :key="i"
          :subtitle="err.timestamp"
          rounded="lg"
        >
          <template #prepend>
            <v-icon color="error" size="20">mdi-alert</v-icon>
          </template>
          <template #title>
            <span class="text-body-2">{{ err.field }}：{{ err.message }}</span>
          </template>
        </v-list-item>
      </v-list>

      <div class="pa-4 pt-2 d-flex ga-2">
        <v-btn
          variant="outlined"
          color="error"
          size="small"
          prepend-icon="mdi-delete-outline"
          @click="errorHistory = []"
        >
          履歴をクリア
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="errorSheetOpen = false">閉じる</v-btn>
      </div>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductDetail } from '@/composables/queries/useProductDetail'
import { useMemoStore } from '@/stores/memo'
import { useSnackbar } from '@/composables/useSnackbar'
import FlowStepper from '@/components/ui/FlowStepper.vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import BarcodeInputField from '@/components/scanner/BarcodeInputField.vue'
import SelectPickerField from '@/components/ui/SelectPickerField.vue'
import ConfirmDialog from '@/components/dialog/ConfirmDialog.vue'
import { useSettingsStore } from '@/stores/settings'

interface Issue {
  id: number
  title: string
  quantity: number
  resolved: boolean
  comment: string
}

interface ErrorRecord {
  field: string
  message: string
  timestamp: string
}

const props = defineProps<{ id: string }>()
const memoStore = useMemoStore()
const { showSnack } = useSnackbar()
const settingsStore = useSettingsStore()

const tab = ref('info')
const localMemo = ref('')
const localLocation = ref('')
const localGroup = ref('')
const confirmOpen = ref(false)
const errorSheetOpen = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const errorHistory = ref<ErrorRecord[]>([])

const locationItems = ['A棚-1', 'A棚-2', 'B棚-1', 'B棚-2', 'C棚-1', 'C棚-2']
const groupItems = ['グループA', 'グループB', 'グループC']

const productId = computed(() => Number(props.id))
const { product, isLoading } = useProductDetail(productId)

const issues = ref<Issue[]>([
  { id: 1, title: '数量不一致', quantity: 3, resolved: false, comment: '' },
  { id: 2, title: '商品ラベル破損', quantity: 1, resolved: false, comment: '' },
  { id: 3, title: '入庫日未入力', quantity: 0, resolved: true, comment: '2026/06/20 確認済み' },
])

const unresolvedCount = computed(() => issues.value.filter((i) => !i.resolved).length)

watch(
  product,
  (p) => { localMemo.value = p ? memoStore.getMemo(p.id) : '' },
  { immediate: true },
)

function validate(): boolean {
  const errors: Record<string, string> = {}
  const now = new Date().toLocaleString('ja-JP')

  if (!localLocation.value) errors.location = 'ロケーションを選択してください'
  if (!localGroup.value) errors.group = 'グループを選択してください'

  fieldErrors.value = errors

  if (Object.keys(errors).length > 0) {
    for (const [field, message] of Object.entries(errors)) {
      errorHistory.value.unshift({ field: fieldLabel(field), message, timestamp: now })
    }
    const limit = settingsStore.errorHistoryLimit
    if (errorHistory.value.length > limit) {
      errorHistory.value = errorHistory.value.slice(0, limit)
    }
    return false
  }
  return true
}

function fieldLabel(key: string): string {
  const map: Record<string, string> = { location: 'ロケーション', group: 'グループ' }
  return map[key] ?? key
}

function onConfirm() {
  confirmOpen.value = false
  if (!validate()) {
    errorSheetOpen.value = true
    tab.value = 'info'
    return
  }
  if (!product.value) return
  memoStore.setMemo(product.value.id, localMemo.value)
  showSnack('success', '登録しました')
}
</script>
