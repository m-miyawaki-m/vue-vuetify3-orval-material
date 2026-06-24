<template>
  <v-card
    :color="modelValue ? 'primary' : undefined"
    :variant="modelValue ? 'tonal' : 'elevated'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <div class="d-flex align-center px-4 py-3 ga-3">
      <v-checkbox-btn
        :model-value="modelValue"
        color="primary"
        @click.stop
        @update:model-value="emit('update:modelValue', $event)"
      />
      <div class="flex-1-1">
        <p class="text-body-2 font-weight-bold mb-1">{{ name }}</p>
        <p class="text-caption text-medium-emphasis">{{ code }} · {{ date }}</p>
      </div>
      <v-chip :color="statusColor" size="x-small" variant="tonal">{{ status }}</v-chip>
    </div>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  name: string
  code: string
  date: string
  status: string
  statusColor: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
