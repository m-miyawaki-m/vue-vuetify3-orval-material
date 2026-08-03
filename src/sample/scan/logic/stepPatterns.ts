import type { ScanAcceptType, ScanSessionMode } from '../types'

/**
 * ステップ式読取のパターン定義。
 * 既存 patterns.ts(単一読取)とは独立したモジュールとして持つ。
 * steps は配列定義のため、3ステップ以上のパターンもここに足すだけで拡張できる。
 */
export interface ScanStepDef {
  key: string
  /** ステッパー表示名 */
  label: string
  /** カメラ上部に出す案内文 */
  guide: string
  /** このステップで受け付ける読取種別 */
  accept: ScanAcceptType
}

export interface StepScanPatternConfig {
  id: string
  title: string
  description: string
  icon: string
  mode: ScanSessionMode
  steps: ScanStepDef[]
  scanPath: string
  resultPath: string
}

/** ①バーコード → ②QR/バーコード の2ステップ(両パターン共通) */
const PAIR_STEPS: ScanStepDef[] = [
  {
    key: 'first',
    label: 'バーコード',
    guide: '1つ目のバーコードを読み取ってください',
    accept: 'barcode',
  },
  {
    key: 'second',
    label: 'QR/バーコード',
    guide: '2つ目のコードを読み取ってください(QR・バーコードどちらでも)',
    accept: 'qr-or-barcode',
  },
]

function paths(id: string) {
  return { scanPath: `/sample/scan/${id}`, resultPath: `/sample/scan/${id}/result` }
}

export const STEP_SCAN_PATTERNS: StepScanPatternConfig[] = [
  {
    id: 'pair-single',
    title: 'ステップ × 単発ペア',
    description: 'バーコード→QR/バーコードの2ステップで1組読み取り、結果画面に表示',
    icon: 'mdi-numeric-2-box-outline',
    mode: 'single',
    steps: PAIR_STEPS,
    ...paths('pair-single'),
  },
  {
    id: 'pair-list',
    title: 'ステップ × 連続ペア',
    description: '2ステップで1組を作り、リストに蓄積して一括確定',
    icon: 'mdi-format-list-numbered',
    mode: 'continuous',
    steps: PAIR_STEPS,
    ...paths('pair-list'),
  },
]

export function getStepPattern(id: string): StepScanPatternConfig {
  const p = STEP_SCAN_PATTERNS.find((x) => x.id === id)
  if (!p) throw new Error(`unknown step scan pattern: ${id}`)
  return p
}
