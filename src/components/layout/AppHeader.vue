<template>
  <v-app-bar color="primary" elevation="2">
    <template v-if="showBack" #prepend>
      <v-btn icon @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>
    <v-app-bar-title>{{ title }}</v-app-bar-title>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

withDefaults(defineProps<{
  title: string
  showBack?: boolean
}>(), { showBack: false })

const router = useRouter()
</script>
