# ComponentSamplePage タブ化 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ComponentSamplePage.vue` のアコーディオンセクションを削除し、残り9セクションを5つの `v-tabs` に整理する。

**Architecture:** 1ファイル変更のみ。テンプレートを `v-tabs` + `v-window` 構造に組み換え、スクリプトからアコーディオン関連変数を削除して `activeTab` を追加する。コンテンツ（各サンプルUI・ロジック）は変更しない。

**Tech Stack:** Vue 3.5 (`<script setup>`), Vuetify 4.0 (`v-tabs`, `v-window`, `v-window-item`)

---

## ファイル構成

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/pages/ComponentSamplePage.vue` | 変更 | アコーディオン削除 + タブ構造への組み換え |

---

### Task 1: ComponentSamplePage.vue — タブ化

**Files:**
- Modify: `src/pages/ComponentSamplePage.vue`

タブ割り当て:

| タブ value | 表示名 | セクション |
|---|---|---|
| `input` | 入力・選択 | ラジオ / トグル / プルダウン / カレンダー + ダイアログ / 時刻 + ダイアログ |
| `display` | 表示制御 | v-if / v-show / v-menu |
| `dialog` | ダイアログ | 情報 / 確認 / フォーム / フルスクリーン + 各ダイアログ本体 |
| `notification` | 通知 | snackbar / bottom-sheet + 本体 |
| `scanner` | スキャナー | BarcodeInputField / 連続スキャン→テーブル |

- [ ] **Step 1: `src/pages/ComponentSamplePage.vue` を以下の内容で全体を書き換える**

```vue
<template>
  <SubLayout title="コンポーネントサンプル">
    <div style="position: sticky; top: 0; z-index: 1; background: rgb(var(--v-theme-background));">
      <v-tabs v-model="activeTab" color="primary" align-tabs="start">
        <v-tab value="input">入力・選択</v-tab>
        <v-tab value="display">表示制御</v-tab>
        <v-tab value="dialog">ダイアログ</v-tab>
        <v-tab value="notification">通知</v-tab>
        <v-tab value="scanner">スキャナー</v-tab>
      </v-tabs>
    </div>

    <v-window v-model="activeTab">

      <!-- ===== 入力・選択 ===== -->
      <v-window-item value="input">
        <v-container class="pb-8">

          <!-- ラジオボタン -->
          <section class="mb-8">
            <p class="text-overline text-medium-emphasis mb-2">ラジオボタン</p>
            <v-radio-group v-model="radioValue" label="配送方法を選択" color="primary">
              <v-radio label="通常配送（3〜5日）"    value="standard" />
              <v-radio label="速達配送（翌日）"       value="express"  />
              <v-radio label="店頭受け取り"           value="pickup"   />
            </v-radio-group>
            <v-radio-group
              v-model="radioInline"
              label="サイズ"
              inline
              color="primary"
              class="mt-2"
            >
              <v-radio label="S" value="S" />
              <v-radio label="M" value="M" />
              <v-radio label="L" value="L" />
              <v-radio label="XL" value="XL" />
            </v-radio-group>
            <p class="text-caption text-medium-emphasis mt-1">
              配送: {{ radioValue }}　サイズ: {{ radioInline }}
            </p>
          </section>

          <v-divider class="mb-8" />

          <!-- トグルボタン -->
          <section class="mb-8">
            <p class="text-overline text-medium-emphasis mb-2">トグルボタン</p>

            <p class="text-body-2 mb-1">単一選択</p>
            <v-btn-toggle v-model="toggleSingle" color="primary" variant="outlined" rounded="lg" mandatory>
              <v-btn value="list"  icon="mdi-view-list"   />
              <v-btn value="grid"  icon="mdi-view-grid"   />
              <v-btn value="table" icon="mdi-table-large" />
            </v-btn-toggle>
            <p class="text-caption text-medium-emphasis mt-1 mb-4">
              表示形式: {{ toggleSingle }}
            </p>

            <p class="text-body-2 mb-1">複数選択</p>
            <v-btn-toggle v-model="toggleMultiple" color="primary" variant="outlined" rounded="lg" multiple>
              <v-btn value="bold"          icon="mdi-format-bold"          />
              <v-btn value="italic"        icon="mdi-format-italic"        />
              <v-btn value="underline"     icon="mdi-format-underline"     />
              <v-btn value="strikethrough" icon="mdi-format-strikethrough" />
            </v-btn-toggle>
            <p class="text-caption text-medium-emphasis mt-1">
              書式: {{ toggleMultiple.length ? toggleMultiple.join(', ') : 'なし' }}
            </p>
          </section>

          <v-divider class="mb-8" />

          <!-- プルダウンリスト -->
          <section class="mb-8">
            <p class="text-overline text-medium-emphasis mb-2">プルダウンリスト</p>

            <v-select
              v-model="selectSingle"
              :items="prefectures"
              label="都道府県"
              variant="outlined"
              class="mb-4"
            />

            <v-select
              v-model="selectMultiple"
              :items="categories"
              label="カテゴリ（複数選択可）"
              variant="outlined"
              multiple
              chips
              closable-chips
              class="mb-2"
            />

            <p class="text-caption text-medium-emphasis">
              都道府県: {{ selectSingle ?? '未選択' }}
              カテゴリ: {{ selectMultiple.length ? selectMultiple.join(', ') : '未選択' }}
            </p>
          </section>

          <v-divider class="mb-8" />

          <!-- カレンダー -->
          <section class="mb-4">
            <p class="text-overline text-medium-emphasis mb-2">カレンダー</p>

            <p class="text-body-2 mb-2">単一日付</p>
            <v-text-field
              :model-value="selectedDate ? formatDate(selectedDate) : ''"
              label="日付を選択"
              variant="outlined"
              readonly
              placeholder="yyyy/mm/dd"
              class="mb-6"
            >
              <template #append-inner>
                <v-btn icon="mdi-calendar" variant="text" density="compact" @click="openSingle" />
              </template>
            </v-text-field>

            <p class="text-body-2 mb-2">期間選択</p>
            <div class="d-flex align-center gap-2 mb-1">
              <v-text-field
                :model-value="rangeStart ? formatDate(rangeStart) : ''"
                label="開始日"
                variant="outlined"
                readonly
                placeholder="yyyy/mm/dd"
                hide-details
                style="flex:1"
              />
              <span class="text-body-2 mx-1">〜</span>
              <v-text-field
                :model-value="rangeEnd ? formatDate(rangeEnd) : ''"
                label="終了日"
                variant="outlined"
                readonly
                placeholder="yyyy/mm/dd"
                hide-details
                style="flex:1"
              />
              <v-btn icon="mdi-calendar-range" variant="tonal" color="primary" class="ml-1" @click="openRange" />
            </div>
            <p class="text-caption text-medium-emphasis mt-2">
              {{ rangeStart && rangeEnd
                ? formatDate(rangeStart) + ' 〜 ' + formatDate(rangeEnd)
                : rangeStart ? formatDate(rangeStart) + ' 〜 未選択' : '未選択' }}
            </p>
          </section>

          <!-- カレンダーダイアログ（単一） -->
          <v-dialog v-model="singleDialog" max-width="360">
            <v-card>
              <v-card-title class="pt-4 pl-4">日付を選択</v-card-title>
              <v-date-picker
                v-model="tempDate"
                color="primary"
                show-adjacent-months
                elevation="0"
              />
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="singleDialog = false">キャンセル</v-btn>
                <v-btn color="primary" variant="elevated" @click="confirmSingle">OK</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- カレンダーダイアログ（期間） -->
          <v-dialog v-model="rangeDialog" max-width="360">
            <v-card>
              <v-card-title class="pt-4 pl-4">期間を選択</v-card-title>
              <v-card-subtitle class="pb-0 pl-4">
                {{ tempRange.length === 0 ? '開始日をタップ' : tempRange.length === 1 ? '終了日をタップ' : '期間が選択されました' }}
              </v-card-subtitle>
              <v-date-picker
                v-model="tempRange"
                color="primary"
                show-adjacent-months
                multiple="range"
                elevation="0"
              />
              <v-card-actions>
                <v-btn variant="text" @click="clearRange">クリア</v-btn>
                <v-spacer />
                <v-btn variant="text" @click="rangeDialog = false">キャンセル</v-btn>
                <v-btn
                  color="primary"
                  variant="elevated"
                  :disabled="tempRange.length < 2"
                  @click="confirmRange"
                >OK</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <v-divider class="mb-8" />

          <!-- 時刻選択 -->
          <section class="mb-4">
            <p class="text-overline text-medium-emphasis mb-2">時刻</p>

            <v-card variant="outlined" class="mb-6 pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">デフォルトパターン（Vuetify 標準）</p>
              <p class="text-caption text-medium-emphasis mb-4">
                Vuetify 組み込みの <code>v-time-picker</code> を使用。クロック形式で時・分を選択します。
              </p>

              <p class="text-body-2 mb-2">単一時刻</p>
              <v-text-field
                :model-value="defTime ?? ''"
                label="時刻を選択"
                variant="outlined"
                readonly
                placeholder="HH:mm"
                class="mb-4"
              >
                <template #append-inner>
                  <v-btn icon="mdi-clock-outline" variant="text" density="compact" @click="openDefSingle" />
                </template>
              </v-text-field>

              <p class="text-body-2 mb-2">時間範囲</p>
              <div class="d-flex align-center gap-2">
                <v-text-field
                  :model-value="defRangeStart ?? ''"
                  label="開始時刻"
                  variant="outlined"
                  readonly
                  placeholder="HH:mm"
                  hide-details
                  style="flex:1"
                />
                <span class="text-body-2 mx-1">〜</span>
                <v-text-field
                  :model-value="defRangeEnd ?? ''"
                  label="終了時刻"
                  variant="outlined"
                  readonly
                  placeholder="HH:mm"
                  hide-details
                  style="flex:1"
                />
                <v-btn icon="mdi-clock-start" variant="tonal" color="primary" class="ml-1" @click="openDefRange" />
              </div>
              <p class="text-caption text-medium-emphasis mt-2">
                {{ defRangeStart && defRangeEnd ? defRangeStart + ' 〜 ' + defRangeEnd : '未選択' }}
              </p>
            </v-card>

            <v-card variant="outlined" class="pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">自作パターン（ホイールピッカー）</p>
              <p class="text-caption text-medium-emphasis mb-4">
                CSS scroll-snap で実装したドラムロール型UI。iOS 標準の時刻選択に近い操作感。
                上下スワイプまたはアイテムタップで値を変更できます。
              </p>

              <p class="text-body-2 mb-2">単一時刻</p>
              <v-text-field
                :model-value="wheelTime ?? ''"
                label="時刻を選択"
                variant="outlined"
                readonly
                placeholder="HH:mm"
                class="mb-4"
              >
                <template #append-inner>
                  <v-btn icon="mdi-clock-outline" variant="text" density="compact" @click="openWheelSingle" />
                </template>
              </v-text-field>

              <p class="text-body-2 mb-2">時間範囲</p>
              <div class="d-flex align-center gap-2">
                <v-text-field
                  :model-value="wheelRangeStart ?? ''"
                  label="開始時刻"
                  variant="outlined"
                  readonly
                  placeholder="HH:mm"
                  hide-details
                  style="flex:1"
                />
                <span class="text-body-2 mx-1">〜</span>
                <v-text-field
                  :model-value="wheelRangeEnd ?? ''"
                  label="終了時刻"
                  variant="outlined"
                  readonly
                  placeholder="HH:mm"
                  hide-details
                  style="flex:1"
                />
                <v-btn icon="mdi-clock-start" variant="tonal" color="primary" class="ml-1" @click="openWheelRange" />
              </div>
              <p class="text-caption text-medium-emphasis mt-2">
                {{ wheelRangeStart && wheelRangeEnd ? wheelRangeStart + ' 〜 ' + wheelRangeEnd : '未選択' }}
              </p>
            </v-card>
          </section>

          <!-- 時刻ダイアログ: デフォルト単一 -->
          <v-dialog v-model="defSingleDialog" max-width="360">
            <v-card>
              <v-card-title class="pt-4 px-4">時刻を選択</v-card-title>
              <div class="d-flex justify-center py-2">
                <v-time-picker v-model="tempDefTime" format="24hr" color="primary" elevation="0" />
              </div>
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="defSingleDialog = false">キャンセル</v-btn>
                <v-btn color="primary" variant="elevated" @click="confirmDefSingle">OK</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- 時刻ダイアログ: デフォルト範囲 -->
          <v-dialog v-model="defRangeDialog" max-width="360">
            <v-card>
              <v-card-title class="pt-4 px-4">
                {{ defRangeStep === 'start' ? '開始時刻を選択' : '終了時刻を選択' }}
              </v-card-title>
              <div class="d-flex justify-center py-2">
                <v-time-picker
                  v-if="defRangeStep === 'start'"
                  v-model="tempDefRangeStart"
                  format="24hr" color="primary" elevation="0"
                />
                <v-time-picker
                  v-else
                  v-model="tempDefRangeEnd"
                  format="24hr" color="primary" elevation="0"
                  :min="tempDefRangeStart ?? undefined"
                />
              </div>
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="defRangeDialog = false">キャンセル</v-btn>
                <v-btn
                  v-if="defRangeStep === 'start'"
                  color="primary" variant="elevated"
                  :disabled="!tempDefRangeStart"
                  @click="defRangeStep = 'end'"
                >次へ</v-btn>
                <v-btn
                  v-else
                  color="primary" variant="elevated"
                  :disabled="!tempDefRangeEnd"
                  @click="confirmDefRange"
                >OK</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- 時刻ダイアログ: ホイール単一 -->
          <v-dialog v-model="wheelSingleDialog" max-width="320">
            <v-card>
              <v-card-title class="pt-4 px-4">時刻を選択</v-card-title>
              <v-card-text class="pb-0">
                <TimeWheelPicker v-model="tempWheelTime" />
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="wheelSingleDialog = false">キャンセル</v-btn>
                <v-btn color="primary" variant="elevated" @click="confirmWheelSingle">OK</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- 時刻ダイアログ: ホイール範囲 -->
          <v-dialog v-model="wheelRangeDialog" max-width="320">
            <v-card>
              <v-card-title class="pt-4 px-4">
                {{ wheelRangeStep === 'start' ? '開始時刻を選択' : '終了時刻を選択' }}
              </v-card-title>
              <v-card-text class="pb-0">
                <TimeWheelPicker
                  v-if="wheelRangeStep === 'start'"
                  v-model="tempWheelRangeStart"
                />
                <TimeWheelPicker
                  v-else
                  v-model="tempWheelRangeEnd"
                />
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="wheelRangeDialog = false">キャンセル</v-btn>
                <v-btn
                  v-if="wheelRangeStep === 'start'"
                  color="primary" variant="elevated"
                  :disabled="!tempWheelRangeStart"
                  @click="wheelRangeStep = 'end'"
                >次へ</v-btn>
                <v-btn
                  v-else
                  color="primary" variant="elevated"
                  :disabled="!tempWheelRangeEnd"
                  @click="confirmWheelRange"
                >OK</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

        </v-container>
      </v-window-item>

      <!-- ===== 表示制御 ===== -->
      <v-window-item value="display">
        <v-container class="pb-8">

          <section class="mb-8">
            <p class="text-overline text-medium-emphasis mb-2">表示制御パターン</p>

            <v-card variant="outlined" class="mb-4 pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">v-if — 条件付きレンダリング</p>
              <p class="text-caption text-medium-emphasis mb-3">
                条件が false のとき DOM から完全に除去されます。追加入力欄の出し入れなどに最適。
              </p>
              <v-checkbox v-model="showExtra" label="追加情報を入力する" color="primary" hide-details class="mb-2" />
              <v-expand-transition>
                <div v-if="showExtra">
                  <v-text-field label="会社名" variant="outlined" density="compact" class="mb-2" />
                  <v-text-field label="部署名" variant="outlined" density="compact" />
                </div>
              </v-expand-transition>
            </v-card>

            <v-card variant="outlined" class="mb-4 pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">v-show — 表示/非表示切り替え</p>
              <p class="text-caption text-medium-emphasis mb-3">
                DOM は残り visibility/display だけ切り替えます。頻繁に開閉する場合は v-if より高速。
              </p>
              <v-btn
                :prepend-icon="showDetail ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                variant="tonal"
                color="primary"
                size="small"
                class="mb-2"
                @click="showDetail = !showDetail"
              >{{ showDetail ? '詳細を隠す' : '詳細を表示' }}</v-btn>
              <div v-show="showDetail" class="pa-3 rounded bg-grey-lighten-4">
                <p class="text-body-2">v-show で表示制御されたコンテンツです。</p>
                <p class="text-body-2">DOM に残るため再表示が速いです。</p>
              </div>
            </v-card>

            <v-card variant="outlined" class="pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">v-menu — ポップアップメニュー</p>
              <p class="text-caption text-medium-emphasis mb-3">
                ボタン近くに小さいドロップダウンを出します。コンテキストメニューや操作メニューに使います。
              </p>
              <div class="d-flex align-center gap-3">
                <span class="text-body-2">操作対象アイテム</span>
                <v-menu>
                  <template #activator="{ props: menuProps }">
                    <v-btn icon="mdi-dots-vertical" variant="text" v-bind="menuProps" />
                  </template>
                  <v-list density="compact">
                    <v-list-item prepend-icon="mdi-pencil"       title="編集"   @click="menuResult = '編集を選択'" />
                    <v-list-item prepend-icon="mdi-content-copy" title="コピー" @click="menuResult = 'コピーを選択'" />
                    <v-divider />
                    <v-list-item prepend-icon="mdi-delete" title="削除" color="error" @click="menuResult = '削除を選択'" />
                  </v-list>
                </v-menu>
              </div>
              <p v-if="menuResult" class="text-caption text-medium-emphasis mt-2">→ {{ menuResult }}</p>
            </v-card>
          </section>

        </v-container>
      </v-window-item>

      <!-- ===== ダイアログ ===== -->
      <v-window-item value="dialog">
        <v-container class="pb-8">

          <section class="mb-8">
            <p class="text-overline text-medium-emphasis mb-2">ダイアログパターン</p>
            <p class="text-caption text-medium-emphasis mb-4">
              用途に応じて使い分けます。すべてユーザーの注意を集中させる目的で使います。
            </p>
            <div class="d-flex flex-column gap-3">

              <v-card variant="outlined" class="pa-4">
                <p class="text-subtitle-2 font-weight-bold mb-1">情報ダイアログ</p>
                <p class="text-caption text-medium-emphasis mb-3">メッセージの提示・内容の確認。閉じるボタンのみ。</p>
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-information" @click="infoDialog = true">
                  情報を表示
                </v-btn>
              </v-card>

              <v-card variant="outlined" class="pa-4">
                <p class="text-subtitle-2 font-weight-bold mb-1">確認ダイアログ（ConfirmDialog）</p>
                <p class="text-caption text-medium-emphasis mb-3">OK / キャンセルで分岐。削除・送信前の確認に。</p>
                <v-btn color="error" variant="tonal" prepend-icon="mdi-delete" @click="confirmDialog = true">
                  削除の確認
                </v-btn>
                <p v-if="confirmResult" class="text-caption text-medium-emphasis mt-2">→ {{ confirmResult }}</p>
              </v-card>

              <v-card variant="outlined" class="pa-4">
                <p class="text-subtitle-2 font-weight-bold mb-1">フォームダイアログ</p>
                <p class="text-caption text-medium-emphasis mb-3">入力フォームを内包。新規作成・編集に使います。</p>
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="formDialog = true">
                  新規追加
                </v-btn>
                <p v-if="formResult" class="text-caption text-medium-emphasis mt-2">→ 登録: {{ formResult }}</p>
              </v-card>

              <v-card variant="outlined" class="pa-4">
                <p class="text-subtitle-2 font-weight-bold mb-1">フルスクリーンダイアログ</p>
                <p class="text-caption text-medium-emphasis mb-3">画面全体を占有。複雑な編集フォームや詳細ページに。</p>
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-fullscreen" @click="fullscreenDialog = true">
                  フルスクリーンで開く
                </v-btn>
              </v-card>

            </div>
          </section>

          <!-- 情報ダイアログ -->
          <BaseDialog v-model="infoDialog" title="お知らせ">
            <p class="text-body-2">この操作は取り消せません。</p>
            <p class="text-body-2 mt-2">詳細については利用規約をご確認ください。</p>
            <template #actions>
              <v-spacer />
              <v-btn color="primary" variant="elevated" @click="infoDialog = false">閉じる</v-btn>
            </template>
          </BaseDialog>

          <!-- 確認ダイアログ -->
          <ConfirmDialog
            v-model="confirmDialog"
            title="削除の確認"
            message="このアイテムを削除しますか？この操作は取り消せません。"
            @confirm="confirmResult = 'OK を選択'; confirmDialog = false"
            @cancel="confirmResult = 'キャンセルを選択'; confirmDialog = false"
          />

          <!-- フォームダイアログ -->
          <BaseDialog v-model="formDialog" title="新規アイテムを追加" max-width="440px">
            <v-text-field v-model="formName"  label="名前"  variant="outlined" density="compact" class="mb-3" />
            <v-text-field v-model="formEmail" label="メール" variant="outlined" density="compact" type="email" />
            <template #actions>
              <v-spacer />
              <v-btn variant="text" @click="formDialog = false; formName = ''; formEmail = ''">キャンセル</v-btn>
              <v-btn
                color="primary" variant="elevated"
                :disabled="!formName || !formEmail"
                @click="formResult = formName + ' / ' + formEmail; formDialog = false; formName = ''; formEmail = ''"
              >登録</v-btn>
            </template>
          </BaseDialog>

          <!-- フルスクリーンダイアログ -->
          <v-dialog v-model="fullscreenDialog" fullscreen transition="dialog-bottom-transition">
            <v-card>
              <v-app-bar color="primary" elevation="0">
                <template #prepend>
                  <v-btn icon="mdi-close" @click="fullscreenDialog = false" />
                </template>
                <v-app-bar-title>フルスクリーン編集</v-app-bar-title>
                <template #append>
                  <v-btn variant="text" @click="fullscreenDialog = false">保存</v-btn>
                </template>
              </v-app-bar>
              <v-container class="pt-6">
                <v-text-field label="タイトル" variant="outlined" class="mb-4" />
                <v-textarea  label="本文"     variant="outlined" rows="6" />
              </v-container>
            </v-card>
          </v-dialog>

        </v-container>
      </v-window-item>

      <!-- ===== 通知 ===== -->
      <v-window-item value="notification">
        <v-container class="pb-8">

          <section class="mb-4">
            <p class="text-overline text-medium-emphasis mb-2">通知・オーバーレイパターン</p>

            <v-card variant="outlined" class="mb-4 pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">v-snackbar（トースト通知）</p>
              <p class="text-caption text-medium-emphasis mb-3">
                操作結果の短い通知。自動で消えます。コンテンツ入力には使いません。
              </p>
              <div class="d-flex gap-2 flex-wrap">
                <v-btn color="success" variant="tonal" size="small" prepend-icon="mdi-check-circle"
                  @click="showSnack('success', '保存しました')">成功</v-btn>
                <v-btn color="error"   variant="tonal" size="small" prepend-icon="mdi-alert-circle"
                  @click="showSnack('error', 'エラーが発生しました')">エラー</v-btn>
                <v-btn color="info"    variant="tonal" size="small" prepend-icon="mdi-information"
                  @click="showSnack('info', '処理中です...')">情報</v-btn>
              </div>
            </v-card>

            <v-card variant="outlined" class="pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">v-bottom-sheet（アクションシート）</p>
              <p class="text-caption text-medium-emphasis mb-3">
                画面下から出るオーバーレイ。スマホでの選択メニューやフィルタに最適。
              </p>
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-menu-up" @click="bottomSheet = true">
                アクションシートを開く
              </v-btn>
              <p v-if="sheetResult" class="text-caption text-medium-emphasis mt-2">→ {{ sheetResult }}</p>
            </v-card>
          </section>

          <v-snackbar v-model="snackbar" :color="snackColor" :timeout="2500" location="bottom">
            <v-icon start>{{ snackIcon }}</v-icon>{{ snackText }}
            <template #actions>
              <v-btn variant="text" @click="snackbar = false">閉じる</v-btn>
            </template>
          </v-snackbar>

          <v-bottom-sheet v-model="bottomSheet">
            <v-card rounded="t-xl">
              <v-card-title class="pt-4">操作を選択</v-card-title>
              <v-list>
                <v-list-item prepend-icon="mdi-share-variant" title="共有する"        @click="sheetResult = '共有'; bottomSheet = false" />
                <v-list-item prepend-icon="mdi-download"      title="ダウンロード"    @click="sheetResult = 'ダウンロード'; bottomSheet = false" />
                <v-list-item prepend-icon="mdi-heart-outline" title="お気に入りに追加" @click="sheetResult = 'お気に入り追加'; bottomSheet = false" />
                <v-divider />
                <v-list-item prepend-icon="mdi-delete" title="削除" color="error" @click="sheetResult = '削除'; bottomSheet = false" />
              </v-list>
              <div class="pa-4">
                <v-btn block variant="text" @click="bottomSheet = false">キャンセル</v-btn>
              </div>
            </v-card>
          </v-bottom-sheet>

        </v-container>
      </v-window-item>

      <!-- ===== スキャナー ===== -->
      <v-window-item value="scanner">
        <v-container class="pb-8">

          <section class="mb-8">
            <p class="text-overline text-medium-emphasis mb-2">バーコード スキャナー</p>
            <p class="text-caption text-medium-emphasis mb-4">
              カメラを使ってバーコード・QRコードをリアルタイムで読み取ります。
              <code>npm run dev</code> のブラウザ環境でもWebカメラで動作確認できます。
            </p>

            <v-card variant="outlined" class="mb-4 pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">フォーム入力補助（BarcodeInputField）</p>
              <p class="text-caption text-medium-emphasis mb-3">
                テキストフィールド右端のアイコンをタップするとカメラが起動します。
                読み取ったコードが自動入力されます。
              </p>
              <BarcodeInputField
                v-model="scannedCode"
                label="バーコード / QR"
                variant="outlined"
                clearable
              />
              <p v-if="scannedCode" class="text-caption text-medium-emphasis mt-1">
                入力値: {{ scannedCode }}
              </p>
            </v-card>

            <v-card variant="outlined" class="pa-4">
              <p class="text-subtitle-2 font-weight-bold mb-1">連続スキャン → テーブル追加（BarcodeScannerOverlay）</p>
              <p class="text-caption text-medium-emphasis mb-3">
                「連続スキャン」ボタンで複数のコードを続けて読み取り、完了するとテーブルに一括追加します。
              </p>
              <div class="d-flex align-center gap-3 mb-3">
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-barcode-scan"
                  @click="scannerStore.requestScan('continuous', r => scanTableRows.push(...r))"
                >連続スキャン</v-btn>
                <v-btn
                  v-if="scanTableRows.length"
                  variant="text"
                  color="error"
                  size="small"
                  @click="scanTableRows = []"
                >テーブルクリア</v-btn>
              </div>
              <v-data-table
                v-if="scanTableRows.length"
                :headers="[
                  { title: '読み取り値', key: 'text' },
                  { title: 'フォーマット', key: 'format' },
                  { title: '時刻', key: 'timestamp' },
                ]"
                :items="scanTableRows.map(r => ({
                  text: r.text,
                  format: r.format,
                  timestamp: new Date(r.timestamp).toLocaleTimeString(),
                }))"
                density="compact"
                class="elevation-0"
              />
              <p v-else class="text-caption text-medium-emphasis">
                スキャン結果がここに表示されます。
              </p>
            </v-card>
          </section>

        </v-container>
      </v-window-item>

    </v-window>
  </SubLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import TimeWheelPicker from '@/components/ui/TimeWheelPicker.vue'
import BaseDialog from '@/components/dialog/BaseDialog.vue'
import ConfirmDialog from '@/components/dialog/ConfirmDialog.vue'
import BarcodeInputField from '@/components/scanner/BarcodeInputField.vue'
import { useScannerStore } from '@/stores/scannerStore'
import type { ScanResult } from '@/types/scanner'

const activeTab = ref('input')

// ラジオボタン
const radioValue  = ref('standard')
const radioInline = ref('M')

// トグルボタン
const toggleSingle   = ref('list')
const toggleMultiple = ref<string[]>([])

// プルダウンリスト
const selectSingle   = ref<string | null>(null)
const selectMultiple = ref<string[]>([])

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ', '書籍', 'おもちゃ']

// カレンダー
const selectedDate = ref<Date | null>(null)
const rangeStart   = ref<Date | null>(null)
const rangeEnd     = ref<Date | null>(null)

const singleDialog = ref(false)
const rangeDialog  = ref(false)

const tempDate  = ref<Date | null>(null)
const tempRange = ref<Date[]>([])

function openSingle() {
  tempDate.value = selectedDate.value
  singleDialog.value = true
}

function confirmSingle() {
  selectedDate.value = tempDate.value
  singleDialog.value = false
}

function openRange() {
  tempRange.value = [rangeStart.value, rangeEnd.value].filter(Boolean) as Date[]
  rangeDialog.value = true
}

function confirmRange() {
  rangeStart.value = tempRange.value[0] ?? null
  rangeEnd.value   = tempRange.value[tempRange.value.length - 1] ?? null
  rangeDialog.value = false
}

function clearRange() {
  tempRange.value = []
}

// 表示制御
const showExtra  = ref(false)
const showDetail = ref(false)
const menuResult = ref('')

// ダイアログ
const infoDialog       = ref(false)
const confirmDialog    = ref(false)
const confirmResult    = ref('')
const formDialog       = ref(false)
const formResult       = ref('')
const formName         = ref('')
const formEmail        = ref('')
const fullscreenDialog = ref(false)

// 通知・オーバーレイ
const snackbar    = ref(false)
const snackColor  = ref('success')
const snackText   = ref('')
const snackIcon   = ref('mdi-check-circle')
const bottomSheet = ref(false)
const sheetResult = ref('')

const snackIconMap: Record<string, string> = {
  success: 'mdi-check-circle',
  error:   'mdi-alert-circle',
  info:    'mdi-information',
}

function showSnack(color: string, text: string) {
  snackColor.value = color
  snackText.value  = text
  snackIcon.value  = snackIconMap[color] ?? 'mdi-information'
  snackbar.value   = true
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// 時刻選択 — デフォルトパターン
const defTime       = ref<string | null>(null)
const defRangeStart = ref<string | null>(null)
const defRangeEnd   = ref<string | null>(null)

const defSingleDialog = ref(false)
const defRangeDialog  = ref(false)
const defRangeStep    = ref<'start' | 'end'>('start')

const tempDefTime       = ref<string | null>(null)
const tempDefRangeStart = ref<string | null>(null)
const tempDefRangeEnd   = ref<string | null>(null)

function openDefSingle() {
  tempDefTime.value = defTime.value
  defSingleDialog.value = true
}
function confirmDefSingle() {
  defTime.value = tempDefTime.value
  defSingleDialog.value = false
}
function openDefRange() {
  tempDefRangeStart.value = defRangeStart.value
  tempDefRangeEnd.value   = defRangeEnd.value
  defRangeStep.value = 'start'
  defRangeDialog.value = true
}
function confirmDefRange() {
  defRangeStart.value = tempDefRangeStart.value
  defRangeEnd.value   = tempDefRangeEnd.value
  defRangeDialog.value = false
}

// 時刻選択 — 自作パターン
const wheelTime       = ref<string | null>(null)
const wheelRangeStart = ref<string | null>(null)
const wheelRangeEnd   = ref<string | null>(null)

const wheelSingleDialog = ref(false)
const wheelRangeDialog  = ref(false)
const wheelRangeStep    = ref<'start' | 'end'>('start')

const tempWheelTime       = ref<string | null>(null)
const tempWheelRangeStart = ref<string | null>(null)
const tempWheelRangeEnd   = ref<string | null>(null)

function openWheelSingle() {
  tempWheelTime.value = wheelTime.value
  wheelSingleDialog.value = true
}
function confirmWheelSingle() {
  wheelTime.value = tempWheelTime.value
  wheelSingleDialog.value = false
}
function openWheelRange() {
  tempWheelRangeStart.value = wheelRangeStart.value
  tempWheelRangeEnd.value   = wheelRangeEnd.value
  wheelRangeStep.value = 'start'
  wheelRangeDialog.value = true
}
function confirmWheelRange() {
  wheelRangeStart.value = tempWheelRangeStart.value
  wheelRangeEnd.value   = tempWheelRangeEnd.value
  wheelRangeDialog.value = false
}

// バーコードスキャナー
const scannerStore  = useScannerStore()
const scannedCode   = ref('')
const scanTableRows = ref<ScanResult[]>([])
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

期待値: エラー 0。エラーが出た場合はメッセージを確認して修正する。

- [ ] **Step 3: コミット**

```bash
git add src/pages/ComponentSamplePage.vue
git commit -m "refactor(samples): reorganize component sample page with v-tabs, remove accordion"
```
