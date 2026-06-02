import type { Product } from '@/types/product'

export const mockProducts: Product[] = [
  // 食品 (1-10)
  { id: 1, name: 'オーガニック緑茶', category: '食品', price: 1200, inStock: true, description: '厳選された国産茶葉を使用した風味豊かな緑茶。', rating: 4, reviews: [{ id: 1, author: '田中太郎', rating: 5, comment: '香りが良く飲みやすいです。' }, { id: 2, author: '鈴木花子', rating: 3, comment: '普通です。値段の割に量が少ない。' }] },
  { id: 2, name: '天然蜂蜜', category: '食品', price: 2500, inStock: true, description: '国産百花蜜。添加物一切不使用の純粋蜂蜜。', rating: 5, reviews: [{ id: 3, author: '山田一郎', rating: 5, comment: '濃厚で美味しい！リピート確定。' }] },
  { id: 3, name: '玄米ご飯パック', category: '食品', price: 800, inStock: false, description: '無農薬栽培の玄米を使った電子レンジ対応パック。', rating: 3, reviews: [{ id: 4, author: '佐藤美咲', rating: 3, comment: '味は普通ですが便利です。' }] },
  { id: 4, name: 'プレミアムコーヒー豆', category: '食品', price: 3200, inStock: true, description: 'エチオピア産シングルオリジン。フルーティーな香り。', rating: 5, reviews: [{ id: 5, author: '伊藤健', rating: 5, comment: '香りが素晴らしい。' }, { id: 6, author: '渡辺直子', rating: 4, comment: '少し酸味が強いが美味しい。' }] },
  { id: 5, name: '有機オリーブオイル', category: '食品', price: 1800, inStock: true, description: 'スペイン産有機オリーブオイル。エクストラバージン。', rating: 4, reviews: [{ id: 7, author: '中村浩', rating: 4, comment: 'さらっとして料理に使いやすい。' }] },
  { id: 6, name: '国産蕎麦粉', category: '食品', price: 950, inStock: true, description: '北海道産100%蕎麦粉。石臼挽きで風味豊か。', rating: 4, reviews: [{ id: 8, author: '小林由美', rating: 4, comment: '手打ち蕎麦が美味しく作れました。' }] },
  { id: 7, name: '天然塩', category: '食品', price: 600, inStock: false, description: '沖縄の海水から作られたミネラル豊富な天然塩。', rating: 3, reviews: [{ id: 9, author: '加藤信二', rating: 3, comment: 'まろやかな塩味で良いです。' }] },
  { id: 8, name: 'ドライフルーツミックス', category: '食品', price: 1500, inStock: true, description: 'ノンオイル・ノンシュガーのドライフルーツ詰め合わせ。', rating: 4, reviews: [{ id: 10, author: '松本早紀', rating: 5, comment: 'おやつに最適。' }, { id: 11, author: '井上剛', rating: 3, comment: '量が少し少ない。' }] },
  { id: 9, name: '玄米茶', category: '食品', price: 900, inStock: true, description: '香ばしい玄米と緑茶のブレンド。ほうじ茶感覚で飲める。', rating: 4, reviews: [{ id: 12, author: '木村奈緒', rating: 4, comment: '香ばしくて飲みやすい。' }] },
  { id: 10, name: '手作りジャムセット', category: '食品', price: 2200, inStock: false, description: 'いちご・ブルーベリー・マーマレードの3本セット。', rating: 5, reviews: [{ id: 13, author: '林美子', rating: 5, comment: '贈り物に最適。とても喜ばれました。' }] },

  // 電子機器 (11-20)
  { id: 11, name: 'ワイヤレスイヤホン', category: '電子機器', price: 8900, inStock: true, description: 'Bluetooth 5.3対応。最大30時間再生。IPX5防水。', rating: 4, reviews: [{ id: 14, author: '田中誠', rating: 5, comment: '音質が良くてコスパ最高。' }, { id: 15, author: '鈴木良子', rating: 3, comment: 'フィット感がもう少し欲しい。' }] },
  { id: 12, name: 'モバイルバッテリー20000mAh', category: '電子機器', price: 5500, inStock: true, description: 'PD対応65W急速充電。薄型コンパクト設計。', rating: 4, reviews: [{ id: 16, author: '山本隆', rating: 4, comment: '軽くて持ち歩きやすい。' }] },
  { id: 13, name: 'スマートウォッチ', category: '電子機器', price: 15800, inStock: false, description: '健康管理・GPS搭載。防水仕様で日常使い最適。', rating: 4, reviews: [{ id: 17, author: '中島直美', rating: 5, comment: '毎日使っています。' }, { id: 18, author: '佐々木明', rating: 3, comment: 'バッテリーの持ちが悪い。' }] },
  { id: 14, name: 'USBハブ 7ポート', category: '電子機器', price: 3200, inStock: true, description: 'USB-A×4 + USB-C×2 + HDMI×1。アルミ製。', rating: 4, reviews: [{ id: 19, author: '高橋俊介', rating: 4, comment: 'MacBookで問題なく使えています。' }] },
  { id: 15, name: 'メカニカルキーボード', category: '電子機器', price: 12000, inStock: true, description: '赤軸採用。RGBバックライト搭載のコンパクト65%キーボード。', rating: 5, reviews: [{ id: 20, author: '岡田博', rating: 5, comment: '打鍵感が最高。' }] },
  { id: 16, name: 'ウェブカメラ4K', category: '電子機器', price: 7800, inStock: true, description: '4K@30fps対応。ノイズキャンセリングマイク内蔵。', rating: 4, reviews: [{ id: 21, author: '藤田恵', rating: 4, comment: '画質が良くてZoom会議で重宝。' }] },
  { id: 17, name: 'SSDポータブル 1TB', category: '電子機器', price: 9800, inStock: false, description: 'USB3.2 Gen2対応。読込1050MB/s。耐衝撃設計。', rating: 5, reviews: [{ id: 22, author: '川口達也', rating: 5, comment: '爆速で驚き。コンパクトで持ち運びやすい。' }] },
  { id: 18, name: '液晶モニター 27インチ', category: '電子機器', price: 32000, inStock: true, description: '4K IPS。リフレッシュレート144Hz。HDR対応。', rating: 4, reviews: [{ id: 23, author: '石川雄太', rating: 4, comment: '発色が良い。' }, { id: 24, author: '坂本彩', rating: 4, comment: 'スタンド調整範囲が広くて使いやすい。' }] },
  { id: 19, name: 'スピーカー Bluetooth', category: '電子機器', price: 6500, inStock: true, description: '360度サウンド。防水IPX7。最大12時間再生。', rating: 4, reviews: [{ id: 25, author: '杉山雅人', rating: 4, comment: '音が迫力あって満足。' }] },
  { id: 20, name: 'ゲームパッド', category: '電子機器', price: 4900, inStock: false, description: 'PC/スマートフォン対応。有線/無線切り替え可能。', rating: 3, reviews: [{ id: 26, author: '前田光一', rating: 3, comment: 'ボタンの反応が少し遅い気がする。' }] },

  // ファッション (21-30)
  { id: 21, name: 'コットンTシャツ', category: 'ファッション', price: 2800, inStock: true, description: '100%オーガニックコットン。シンプルなクルーネック。', rating: 4, reviews: [{ id: 27, author: '吉田真由美', rating: 4, comment: '肌触りが良くて気持ちいい。' }] },
  { id: 22, name: 'デニムジャケット', category: 'ファッション', price: 9800, inStock: true, description: 'ヴィンテージウォッシュ加工。M〜XLサイズ展開。', rating: 4, reviews: [{ id: 28, author: '服部大輔', rating: 5, comment: 'デザインが気に入っています。' }, { id: 29, author: '西村亮', rating: 3, comment: 'サイズ感が少し小さめ。' }] },
  { id: 23, name: 'ウールマフラー', category: 'ファッション', price: 4500, inStock: false, description: '上質なメリノウール100%。柔らかく暖かい。', rating: 5, reviews: [{ id: 30, author: '村田悠', rating: 5, comment: '肌触りが素晴らしい。毎冬使っています。' }] },
  { id: 24, name: 'スニーカー', category: 'ファッション', price: 12000, inStock: true, description: 'キャンバス素材。クラシックなデザイン。', rating: 4, reviews: [{ id: 31, author: '橋本さやか', rating: 4, comment: '軽くて歩きやすい。' }] },
  { id: 25, name: 'カシミヤセーター', category: 'ファッション', price: 18000, inStock: true, description: 'モンゴル産カシミヤ100%。繊細で軽く暖かい。', rating: 5, reviews: [{ id: 32, author: '長谷川純', rating: 5, comment: '高級感があって着心地抜群。' }] },
  { id: 26, name: 'レインコート', category: 'ファッション', price: 7200, inStock: true, description: '完全防水・透湿性素材。コンパクトに収納可能。', rating: 4, reviews: [{ id: 33, author: '清水健二', rating: 4, comment: '折りたたんでカバンに入れられて便利。' }] },
  { id: 27, name: 'ストレッチスラックス', category: 'ファッション', price: 6800, inStock: false, description: 'ストレッチ素材。ビジネスにもカジュアルにも。', rating: 3, reviews: [{ id: 34, author: '近藤雄介', rating: 3, comment: 'シルエットが思ったより太め。' }] },
  { id: 28, name: 'レザーベルト', category: 'ファッション', price: 3500, inStock: true, description: '本革製。35mmワイド。ビジネス・カジュアル兼用。', rating: 4, reviews: [{ id: 35, author: '和田亮太', rating: 4, comment: '質感が良く値段以上の品質。' }] },
  { id: 29, name: 'キャップ', category: 'ファッション', price: 2200, inStock: true, description: 'コットンツイル素材。アジャスタブルストラップ付き。', rating: 4, reviews: [{ id: 36, author: '福田彩香', rating: 4, comment: 'どんな服にも合わせやすい。' }] },
  { id: 30, name: 'サングラス', category: 'ファッション', price: 8500, inStock: false, description: 'UV400カット。軽量チタンフレーム。偏光レンズ。', rating: 4, reviews: [{ id: 37, author: '池田賢一', rating: 4, comment: 'レンズが見やすく目が疲れにくい。' }] },

  // 家具 (31-40)
  { id: 31, name: 'ワークデスク 120cm', category: '家具', price: 24000, inStock: true, description: '在宅ワークに最適。引き出し2杯付きで収納充実。', rating: 4, reviews: [{ id: 38, author: '斎藤翔太', rating: 4, comment: '組み立てやすく安定感がある。' }, { id: 39, author: '吉川恵美', rating: 4, comment: '広くて使いやすい。' }] },
  { id: 32, name: 'アームチェア', category: '家具', price: 38000, inStock: true, description: '高反発ウレタン使用。腰への負担を軽減。ランバーサポート付き。', rating: 5, reviews: [{ id: 40, author: '内田卓也', rating: 5, comment: '腰痛が改善されました。' }] },
  { id: 33, name: '本棚 5段', category: '家具', price: 15000, inStock: false, description: '棚板高さ調整可能。スリムなA4対応本棚。', rating: 4, reviews: [{ id: 41, author: '大野裕子', rating: 4, comment: 'シンプルで使いやすい。' }] },
  { id: 34, name: 'ソファ 2人掛け', category: '家具', price: 55000, inStock: true, description: 'ファブリック素材。コンパクトで1Kにも置ける。', rating: 4, reviews: [{ id: 42, author: '中川誠', rating: 5, comment: '座り心地が良い。' }, { id: 43, author: '田中恵', rating: 3, comment: '組み立てが一人では大変。' }] },
  { id: 35, name: 'コーヒーテーブル', category: '家具', price: 18000, inStock: true, description: '天板：天然木突板。脚部：スチール。北欧テイスト。', rating: 4, reviews: [{ id: 44, author: '山口達夫', rating: 4, comment: 'デザインがおしゃれ。' }] },
  { id: 36, name: 'テレビボード 140cm', category: '家具', price: 28000, inStock: false, description: '扉付き収納×2。配線隠し機能付き。', rating: 4, reviews: [{ id: 45, author: '小川薫', rating: 4, comment: '収納力があって部屋がすっきりした。' }] },
  { id: 37, name: '折りたたみベッド', category: '家具', price: 19000, inStock: true, description: 'シングルサイズ。使わないときはコンパクトに収納可能。', rating: 3, reviews: [{ id: 46, author: '石原大樹', rating: 3, comment: '来客用に購入。使い勝手は普通。' }] },
  { id: 38, name: 'キャビネット 引き出し6杯', category: '家具', price: 22000, inStock: true, description: 'A4書類対応。スチール製で耐久性高い。', rating: 4, reviews: [{ id: 47, author: '河野真一', rating: 4, comment: '引き出しの動きが滑らかで良い。' }] },
  { id: 39, name: 'フロアランプ', category: '家具', price: 8500, inStock: true, description: '3段階調光。スリムなポール型。読書灯として最適。', rating: 4, reviews: [{ id: 48, author: '中西美穂', rating: 4, comment: '明るさ調整ができて便利。' }] },
  { id: 40, name: 'ラグ 185×185cm', category: '家具', price: 12000, inStock: false, description: 'ふわふわのマイクロファイバー素材。洗濯機OK。', rating: 4, reviews: [{ id: 49, author: '青木裕樹', rating: 4, comment: '肌触りが良く子どもが喜んでいます。' }] },

  // スポーツ (41-50)
  { id: 41, name: 'ヨガマット 6mm', category: 'スポーツ', price: 3800, inStock: true, description: '滑り止め加工。軽量&収納袋付き。環境配慮素材。', rating: 4, reviews: [{ id: 50, author: '村上祐子', rating: 5, comment: 'クッションがちょうど良い厚さ。' }, { id: 51, author: '福島勝', rating: 3, comment: '折り目がつきやすい。' }] },
  { id: 42, name: 'ダンベルセット 20kg', category: 'スポーツ', price: 9800, inStock: true, description: '可変式ダンベル。2.5kg〜20kgまで調整可能。', rating: 4, reviews: [{ id: 52, author: '金子俊也', rating: 4, comment: '調整が簡単でスペースを取らない。' }] },
  { id: 43, name: 'ランニングシューズ', category: 'スポーツ', price: 11000, inStock: false, description: '軽量メッシュアッパー。反発性の高いミッドソール。', rating: 5, reviews: [{ id: 53, author: '木下浩介', rating: 5, comment: '走りやすくてPBが出ました。' }] },
  { id: 44, name: 'プロテインシェイカー', category: 'スポーツ', price: 1500, inStock: true, description: '700ml。目盛り付き。食洗機OK。BPAフリー。', rating: 4, reviews: [{ id: 54, author: '池上達彦', rating: 4, comment: '蓋が漏れず使いやすい。' }] },
  { id: 45, name: 'トレーニングバンドセット', category: 'スポーツ', price: 2800, inStock: true, description: '5段階の強度。全身トレーニングに対応。', rating: 4, reviews: [{ id: 55, author: '上田美樹', rating: 4, comment: '家でのトレーニングに重宝。' }] },
  { id: 46, name: 'バドミントンセット', category: 'スポーツ', price: 4500, inStock: true, description: 'ラケット2本・シャトル6個・ネットのセット。', rating: 3, reviews: [{ id: 56, author: '永田浩二', rating: 3, comment: 'シャトルがすぐに壊れた。ラケットは良い。' }] },
  { id: 47, name: 'スポーツタオル速乾', category: 'スポーツ', price: 1800, inStock: true, description: 'マイクロファイバー素材。速乾・抗菌加工。', rating: 4, reviews: [{ id: 57, author: '浜田恭子', rating: 4, comment: '乾きが早くジムで重宝。' }] },
  { id: 48, name: 'ジャンピングロープ', category: 'スポーツ', price: 2200, inStock: false, description: 'ベアリング入りで絡まりにくい。長さ調節可能。', rating: 4, reviews: [{ id: 58, author: '田村進一', rating: 4, comment: 'スムーズに回せて跳びやすい。' }] },
  { id: 49, name: 'プッシュアップバー', category: 'スポーツ', price: 1900, inStock: true, description: '回転式で手首に優しい。ゴム製非滑り底。', rating: 5, reviews: [{ id: 59, author: '中田勇気', rating: 5, comment: '胸への刺激が増えました。コスパ最高。' }] },
  { id: 50, name: 'フォームローラー', category: 'スポーツ', price: 3200, inStock: true, description: '高密度EPE素材。筋膜リリース・ストレッチに最適。', rating: 4, reviews: [{ id: 60, author: '長田美奈子', rating: 4, comment: '運動後のケアに使っています。' }] },
]
