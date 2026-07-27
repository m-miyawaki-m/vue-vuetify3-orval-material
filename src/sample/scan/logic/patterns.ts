import type { ScanFieldDef, ScanSessionMode } from '../types'
import { createSplitParser, passthroughParser } from './parsers'
import type { ScanParser } from './parsers'

/**
 * パターン定義。parser(関数)を含むため store には入れない。
 * スキャン画面・結果画面の両方がここから import して共有する。
 */
export interface ScanPatternConfig {
  id: string
  title: string
  description: string
  icon: string
  mode: ScanSessionMode
  /** 空配列 = raw のまま扱う。非空 = 分割してこの項目定義で表示する */
  fields: ScanFieldDef[]
  parser: ScanParser
  resolve: 'raw' | 'api'
  scanPath: string
  resultPath: string
}

export const SPLIT_FIELDS: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]

const splitParser = createSplitParser(SPLIT_FIELDS.map((f) => f.key))

function paths(id: string) {
  return { scanPath: `/sample/scan/${id}`, resultPath: `/sample/scan/${id}/result` }
}

export const SCAN_PATTERNS: ScanPatternConfig[] = [
  {
    id: 'single-raw',
    title: '単発 × そのまま',
    description: '1件読み取り、値をそのまま結果画面に表示',
    icon: 'mdi-barcode-scan',
    mode: 'single',
    fields: [],
    parser: passthroughParser,
    resolve: 'raw',
    ...paths('single-raw'),
  },
  {
    id: 'single-split',
    title: '単発 × 分割',
    description: '1件読み取り、値を分割して複数項目へ自動代入',
    icon: 'mdi-format-columns',
    mode: 'single',
    fields: SPLIT_FIELDS,
    parser: splitParser,
    resolve: 'raw',
    ...paths('single-split'),
  },
  {
    id: 'single-lookup',
    title: '単発 × API照会',
    description: '1件読み取り、値を商品コードとして API 照会し詳細表示',
    icon: 'mdi-database-search',
    mode: 'single',
    fields: [],
    parser: passthroughParser,
    resolve: 'api',
    ...paths('single-lookup'),
  },
  {
    id: 'list-raw',
    title: '連続 × そのまま',
    description: '連続読み取りでリストに蓄積し、一括確定',
    icon: 'mdi-playlist-plus',
    mode: 'continuous',
    fields: [],
    parser: passthroughParser,
    resolve: 'raw',
    ...paths('list-raw'),
  },
  {
    id: 'list-split',
    title: '連続 × 分割',
    description: '連続読み取りで値を分割し、項目付きカードで蓄積',
    icon: 'mdi-view-list',
    mode: 'continuous',
    fields: SPLIT_FIELDS,
    parser: splitParser,
    resolve: 'raw',
    ...paths('list-split'),
  },
]

export function getPattern(id: string): ScanPatternConfig {
  const p = SCAN_PATTERNS.find((x) => x.id === id)
  if (!p) throw new Error(`unknown scan pattern: ${id}`)
  return p
}
