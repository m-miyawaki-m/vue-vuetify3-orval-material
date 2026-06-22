<template>
  <v-text-field
    v-bind="$attrs"
    :model-value="modelValue"
    :label="label"
    :placeholder="placeholder"
    readonly
    clearable
    @click="open = true"
    @click:clear.stop="emit('update:modelValue', '')"
  >
    <template #append-inner>
      <v-btn icon size="x-small" variant="text" tabindex="-1" @click.stop="open = true">
        <v-icon>mdi-chevron-down</v-icon>
      </v-btn>
    </template>
  </v-text-field>

  <v-dialog v-model="open" max-width="360">
    <v-card>
      <v-card-title class="pt-4 px-4 text-body-1 font-weight-bold">{{ label?.replace(' *', '') }}</v-card-title>

      <v-list density="compact" nav>
        <v-list-item
          v-for="item in items"
          :key="item"
          :title="item"
          :active="modelValue === item"
          active-color="primary"
          rounded="lg"
          @click="select(item)"
        />
      </v-list>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">キャンセル</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    placeholder?: string
    items?: string[]
  }>(),
  { modelValue: '', items: () => [] },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}
</script>
