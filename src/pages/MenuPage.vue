<template>
  <v-layout>
    <AppHeader title="VuetifyPoC" />
    <v-main>
      <v-container class="py-6">
        <v-row>
          <v-col cols="12">
            <h1 class="text-h5 mb-4">メニュー</h1>
          </v-col>
          <v-col
            v-for="item in menuItems"
            :key="item.title"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              :disabled="!item.to"
              @click="item.to ? router.push(item.to) : undefined"
            >
              <v-card-title>
                <v-icon class="mr-2">{{ item.icon }}</v-icon>
                {{ item.title }}
              </v-card-title>
              <v-card-text>{{ item.description }}</v-card-text>
              <v-card-actions>
                <v-btn
                  :color="item.to ? 'primary' : undefined"
                  variant="text"
                  :disabled="!item.to"
                >
                  {{ item.to ? '開く' : '準備中' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <AppFooter />
  </v-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const router = useRouter()

const menuItems = [
  {
    title: '商品を探す',
    icon: 'mdi-magnify',
    description: '商品の検索・絞り込みができます',
    to: '/search',
  },
  {
    title: 'お気に入り',
    icon: 'mdi-heart',
    description: 'お気に入り商品の一覧（ダミー）',
    to: '',
  },
  {
    title: '設定',
    icon: 'mdi-cog',
    description: 'アプリの設定（ダミー）',
    to: '',
  },
]
</script>
