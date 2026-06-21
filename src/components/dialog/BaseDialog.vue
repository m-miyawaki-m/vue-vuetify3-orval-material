<template>
  <v-dialog v-model="model" :max-width="maxWidth">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <v-card-actions v-if="$slots.actions">
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    maxWidth?: string
  }>(),
  {
    maxWidth: '500px',
  }
)

const model = defineModel<boolean>()
</script>
