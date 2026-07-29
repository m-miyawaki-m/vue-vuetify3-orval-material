<template>
  <SubLayout :title="`${title} - 明細 (${index + 1}件目)`">
    <v-container v-if="item">
      <v-card variant="outlined">
        <v-card-text>
          <p class="text-overline text-medium-emphasis mb-1">読取情報</p>
          <p class="text-body-2" style="word-break: break-all">読取値: {{ item.raw }}</p>
          <p class="text-caption text-medium-emphasis">形式: {{ item.format }}</p>
          <p class="text-caption text-medium-emphasis">時刻: {{ time }}</p>
          <template v-if="fields.length">
            <v-divider class="my-3" />
            <p v-for="f in fields" :key="f.key" class="text-body-2">
              <span class="text-medium-emphasis">{{ f.label }}: </span>{{ item.fields[f.key] ?? '' }}
            </p>
          </template>
        </v-card-text>
      </v-card>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import { getPattern } from '../logic/patterns'
import { useItemDetailScreen } from '../logic/useItemDetailScreen'

const { item, index, title, fields } = useItemDetailScreen(getPattern('list-raw'))
const time = computed(() =>
  item.value ? new Date(item.value.timestamp).toLocaleTimeString() : '',
)
</script>
