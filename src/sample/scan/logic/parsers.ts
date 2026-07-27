/** 値の加工戦略。store には入れず、利用画面が import して使う */
export type ScanParser = (raw: string) => Record<string, string>

export const passthroughParser: ScanParser = () => ({})

export function createSplitParser(keys: string[], delimiter = ','): ScanParser {
  return (raw) => {
    const parts = raw.split(delimiter)
    return Object.fromEntries(keys.map((k, i) => [k, parts[i]?.trim() ?? '']))
  }
}
