<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <ScanItemList
      :items="items"
      :fields="fields"
      @remove="removeItem"
      @clear="clearItems"
      @select="openDetail"
    />
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!items.length" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanItemList from '../components/ScanItemList.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const { items, fields, rescan, confirm, removeItem, clearItems, openDetail, title } =
  useResultScreen(getPattern('list-split'))
</script>
