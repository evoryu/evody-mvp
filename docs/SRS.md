### Reaction Time 7d Trend (Phase 1.14)

目的: 認知負荷・集中の推移を視覚化し、速度低下兆候を早期に認識。

データ源:

- Episode.kind==='review' の `p50TimeMs` / `p90TimeMs`
- 日次加重平均: weight = (correct + incorrect)

計算:

```
DailyP50_d = Σ(p50_ep * weight_ep)/Σ(weight_ep)
DailyP90_d = Σ(p90_ep * weight_ep)/Σ(weight_ep)
```

UI:

- 7日分棒スパークライン (高さ: p50, 400ms 上限で正規化)
- p90 > p50 の範囲を半透明(赤系)オーバーレイで上積み (遅延の広がり)
- ヘッダ右側: 最新 p50 と初日 p50 の相対変化 (±10% 未満 →, 改善 ↓, 悪化 ↑)

しきい値設定:

- 初期上限 400ms (将来: 過去30日最大\*1.1 などに動的化)
- 欠損日は “--” 表示（棒なし透明）

拡張案:

- 動的スケール (外れ値除外 IQR ベース)
- Tail Index (p90/p50) ライン重ね表示
- Deck フィルタ時: デッキ限定反応時間トレンド切替
- 移動中央値 vs 単純平均オプション

### Deck Reaction Time 7d Trend (Phase 1.17)

目的: 特定デッキ(分野)ごとの想起スピード/集中度を把握し、難易度調整・導入ペース最適化・ボトルネック特定を支援。

データ源:

- `ReviewLog.reactionTimeMs` (各カードの Reveal→Grade 所要 ms)
- 0 <= t < 60000ms の値のみ採用 (外れ値除外はグローバルと同一)

算出手順 (日次 / deckId 指定):

1. ReviewLog を deckId でフィルタ
2. `dateKey(reviewedAt)` で日バケツへ push (reactionTimeMs が定義かつ有効なもののみ)
3. 日ごとに昇順ソート -> p50/p90 を百分位インデックス法で取得
4. 不足 (サンプル0) の日は `{p50:null, p90:null}`

擬似コード:

```ts
group: Map<string, number[]> // date -> samples
for log in logs(deck): if(valid) group[date].push(t)
for last N days:
  arr = group[date]; if !arr => nulls
  sort(arr)
  p50 = arr[floor((n-1)*0.5)]
  p90 = arr[floor((n-1)*0.9)]
```

UI:

- Profile 学習ステータス: Deck 選択時に `7d Reaction (<deckId>) p50/p90` スパークライン追加
- 表示仕様は全体版と同一 (棒= p50, 上部半透明赤= p90-p50)
- 右肩: 初日 vs 最新 p50 の相対 (%) 変化 (±10% 未満 →)

エッジケース:

- 直近7日にデータ日が 0 → セクション非表示
- n が 1–2 の小サイズ → p50=p90 になる日あり (ばらつき情報なしだが許容)
- 旧ログ (reactionTimeMs 無) の日は欠損として null

将来拡張案:

- Deck ごとの動的スケーリング (過去30日 p90 上限 + 10%)
- Hard/Again 多発カードのみ抽出した “difficult slice” reaction
- p75/p25 IQR と比較 (分布形状把握)

### Deck Tail Index (Phase 1.17)

目的: 特定デッキ内での反応時間分布ばらつき (集中/再現安定性) の変化を素早く察知。

定義:

```
DeckTailIndex_d = p90_d / p50_d  (p50_d>0 && 両方有効時)
```

UI:

- Deck Reaction スパークライン直下に `7d Tail Index (<deckId>)` を表示
- カラー閾値はグローバル Tail Index と同一 (<=1.3 緑 / <=1.6 黄 / >1.6 赤)
- 高さ正規化: 7日内最大値と 2.5 の小さい方を上限
- 右肩: 初日 vs 最新 TI 相対 (%) 変化 (|Δ|<5% →, 低下=↓, 上昇=↑)

エッジケース:

- p50 null/0 または p90 null → 当日 TI=null
- 7日全 null → セクション非表示

利用例 / 解釈:

- Deck TI が全体 TI より恒常的に高い → その分野は概念密度/難度高 or カード表現を調整すべき
- 突発的 Spike (1.3→1.7) → 直近導入カードが難しすぎる / セッション疲労

拡張案:

- Deck TI の 7d 移動平均ライン
- TI>1.6 且つ Retention 低下両立のデッキに “Deck Focus Alert” アイコン表示
- サンプル数 (日毎レビュー件数) バーを背景に薄表示

### Tail Index (p90/p50) (Phase 1.15)

目的: 反応時間分布の「裾の広がり (遅延ばらつき)」を簡潔に把握し、平均や中央値変化では捉えにくい集中度低下・不安定化を早期検知する指標を追加。

定義:

```
TailIndex_d = DailyP90_d / DailyP50_d
```

前提: DailyP50_d > 0, 両方が非 null。どちらか null / p50<=0 の場合 当日 TI=null。

算出手順:

1. 日次 p50 / p90 (Phase1.14 で導入) を取得。
2. p90/p50 を小数第2位で丸め (表示専用; 内部保持 float)。
3. 欠損は `null` としてスパークラインで "--" 表示。

UI:

- Profile 学習ステータス内に 7d Tail Index スパークライン (棒) を追加。
- 棒高さ: TI を動的最大値 (過去7日 TI の最大値と 2.5 の小さい方) で 0..1 正規化。
- カラーリング:
  - TI <= 1.30: success (安定)
  - 1.30 < TI <= 1.60: warn (軽度ばらつき上昇)
  - TI > 1.60: danger (集中低下 / 認知負荷増大の疑い)
- ヘッダ右: 初日 vs 最新 TI の相対変化 (|Δ| <5% →, 改善=↓ (低下), 悪化=↑ (上昇))

解釈ガイド:

| TI 範囲   | 状態                   | 推奨アクション                    |
| --------- | ---------------------- | --------------------------------- |
| 1.00–1.30 | 反応分布が締まっている | 継続 / 新カード導入OK             |
| 1.30–1.60 | 軽度ばらつき拡大       | セッション量/休憩を軽く意識       |
| >1.60     | 裾が重い (遅延増加)    | 休憩 / Hard/Again 分析 / 新規抑制 |

理由:

- p50 単体は中央値シフト、p90 は外れ方向。比率でスケールフリー化し一貫性低下を敏感に把握。
- 反応時間全体が速い/遅い日をまたいでも形状変化を把握可能。

フォールバック / エッジケース:

- p50 null/0, p90 null → TI=null。
- 有効データ 1 日のみ → Δ 表示は stable (→)。
- 7 日内全 null → UI セクション非表示。

アラート連携 (将来):

- Focus Alert 条件候補に `TailIndex_today >= 1.6 AND TailIndex_today >= TailIndex_yesterday * 1.05` を追加し “ばらつき急拡大” を別メッセージ化。

拡張案:

- TI の 7d 移動平均 / 7d 移動標準偏差オーバーレイ
- Deck フィルタとの連動 (特定デッキだけ散らばり増大検知)
- IQR ベース dispersion (p75/p25) との比較表示
- TI > 1.6 が 3 連日以上で新カード自動導入抑制フラグ

### Focus Alert (Phase 1.13)

目的: 集中低下 (想起品質劣化 + 認知速度低下) を初期段階でユーザーに通知し、過負荷による学習効率低下や無駄な新カード導入を防ぐ。

判定条件 (前日比):

```
p50Time_today >= p50Time_yesterday * 1.30   // 反応時間が30%以上悪化
Retention_today <= Retention_yesterday - 0.05 // Retention が5ポイント以上低下
```

両方満たした場合に発火。単発のノイズ (一方のみの変化) では表示しない。

データ源:

- p50Time: Episode 保存 p50TimeMs の日次加重平均 (weight = セッション回答数)
- Retention: `getDailyReviewRetention(2)` の 2日分 (mode=effective デフォルト)

表示:

- Profile 上部にバナー (Focus Alert) を表示。
- メッセージ: 「反応時間上昇 & Retention 低下。短い休憩かセッション量調整を検討。」

抑制:

- localStorage キー `evody:focusAlert:YYYY-MM-DD` を設定すると当日再表示なし。
- ユーザーが「閉じる」で suppress。

再発条件:

- 翌日条件が再び成立し suppress キーが無ければ再表示。

拡張候補:

- Hard/Again 比率を加えた 3 条件合意ルール (AND/OR 組み合わせ) 切替
- 連続2日アラート時に “新カード導入を一時抑制” ガイダンス分岐
- しきい値を個人ベースライン (過去7日p50平均) 比率に自動調整
- tail index (p90/p50) を追加検査して “ばらつき増大” アラート差別化

### 反応時間百分位 (Phase 1.11)

目的: 単純平均(avgTimeMs) だけでは外れ値(極端な停滞)で歪むため、中央値(p50) と上位遅延指標(p90) を併記し集中度/安定性を把握。

収集:

- Reveal → Grade 間の経過 ms を各レビューで計測
- 0 <= t < 60000ms の値のみ採用 (>=60s は外れ値除外)
- セッション終了時 (バッチ完了時) にソートし p50/p90 を算出

算出:

```
samples = ソート済み配列 (昇順)
p50 = samples[floor((n-1)*0.5)]
p90 = samples[floor((n-1)*0.9)]
```

メモ: n が小さい (1~2) 場合は同一要素になるが許容 (初期学習段階のラベル付け自体を優先)。

保存フィールド (Episode.kind==='review'):
| フィールド | 型 | 説明 |
| ------------ | ------- | --------------------------------- |
| p50TimeMs | number | 反応時間中央値 |
| p90TimeMs | number | 反応時間90百分位 (遅延側指標) |

表示:

- Review Episodes モーダル: Avg / p50 / p90 の ms バッジ
- p50 が急上昇 & retention 低下同時発生時 → 休憩ガイダンス拡張候補

拡張アイデア:

- デッキ別 7d p50/p90 スパークライン
- p90/p50 比率 (tail index) > 2 で集中低下通知
- 外れ値閾値を動的 (p90 + 3\*IQR) に変更

# SRS (Spaced Repetition) 初期実装

本ドキュメントは MVP レベルの簡易 SRS ロギング/スケジューリング実装の仕様をまとめ、今後 SM-2 / FSRS など高度なアルゴリズムへ段階的に移行するための足場を示す。

## 目的 (Phase 1)

- 学習(Grade入力)を `ReviewLog` として記録
- 1枚ごとの `interval / ease / nextDue` を計算し、レビュー待ちを抽出
- Profile に基本統計 (今日レビュー / 待ち / 新カード) を表示

## データモデル

`src/lib/reviews.ts`

### Deck-Specific New Card Introduction (Phase 1.25)

目的: 新カード導入を特定デッキに集中/制御し、デッキ間の負荷バランス調整や重点学習を可能にする第一段階。

仕様概要:

- `introduceNewCards` シグネチャ拡張: `introduceNewCards(cardIds: string[], deckId?: string, now=Date.now())`
  - `deckId` 指定時、初期カード状態 (`CardState`) に `deckId` を保持。
  - 省略時は従来どおり `deckId` 未定義 (UI 上は "default" に吸収)。
- `CardState` に公式 `deckId?: string` フィールドを追加 (従来は内部推測)。
- デッキ別負荷分解 (`getUpcomingReviewLoadExtended`) は既存ロジックで自動反映 (次回ロードで day1 以降相当位置にカウント増加)。
- デッキ別導入上限は現段階で全体 adaptive limit を共有 (将来: deck-level quota)。

What-if シミュレーションとの関係:

- モーダル左カラムに Deck セレクタ: `All Decks` / 各 deckId。
- Phase 1.25 ではシミュレーションの増分は全体集計のみ (特定デッキの明日バケットだけに限定して反映する詳細モデルは未実装)。
- 注意書き: 「Deck 指定時も差分バーは全体合算 (Phase 1)。」

導入手順 (UI):

1. What-if モーダルを開く → 追加枚数と Deck を選択。
2. `Apply` で `introduceNewCards(ids, deckId?)` 呼び出し。
3. 更新イベント後、upcoming load を再フェッチしデッキ行の counts/backlog に反映。

エッジケース:

- デッキが 1 つも無い (まだ学習なし) → セレクタは `All Decks` のみ。
- 存在しない deckId を誤って指定 (ローカルストレージ手動編集等) → そのまま新規 deckId として集計（後続クリーンアップ対象）。
- Limit 超過分 cardIds は従来どおり無視。

将来拡張 (Phase 1.26+ アイデア):

- Deck 精度シミュレーション: 追加枚数を指定デッキ day1 にのみ加算し、peak/median 再計算する extended what-if。
- Deck ごとの adaptive limit (backlogRatio や flatten 指標を重み化)。
- 複数デッキへ重み付き自動配分 (e.g. backlogRatio の低いデッキへ優先導入)。
- Deck Local Difficulty (平均 difficulty / stability) 連動抑制。

既知の制約:

- 現在のシミュレーションは総量モデル (全体日次配列への一括加算) のため、特定デッキ集中リスクのプレビューはできない。
- 削除 / 移動 (デッキ間再割当) 機能は未実装。

品質検証観点:

- deckId 指定導入後、`getUpcomingReviewLoadExtended(7|14)` の `decks[].counts` 先頭以外 (index1 など) に期待通り +n される (明日出現モデル)。
- 既存カード/ログ読み込み互換: 旧 state に deckId 不在でもクラッシュなし。

### Deck-Precise What-if Simulation (Phase 1.26)

目的: Deck 指定導入時、対象デッキ局所の負荷 (Day1 / Peak / Week1 Total) 変化を即座に可視化し、導入判断をより細かく最適化。

追加 API:

```ts
simulateNewCardsImpactWithDeck(additional: number, deckId: string, horizonDays=7): WhatIfResult
```

`WhatIfResult.deckImpact` 追加フィールド:

| フィールド                                 | 意味                                                |
| ------------------------------------------ | --------------------------------------------------- |
| deckId                                     | 対象デッキ                                          |
| day1Before / day1After                     | 翌日 (index1) のそのデッキレビュー件数 Before/After |
| deckPeakBefore / deckPeakAfter             | デッキ内 horizon 中ピーク値 Before/After            |
| deckWeek1TotalBefore / deckWeek1TotalAfter | Week1 合計 (>=7日 horizon のみ)                     |

簡易モデル仮定 (Phase 1.26):

- 追加カードは Day1 に 1 回のみ出現 (学習直後再出現チェーン/失敗再注入なし)。
- Deck 内では明日バケット (index1) にのみ加算。他日分布/初回間隔推定なし。
- Peak/Week1 Total の再計算は「Day1 補正後配列」を再スキャンした単純結果。

UI 変更:

- What-if モーダル: Deck セレクタで特定デッキ選択時 `Deck Impact` ボックス表示。
- 表示: Day1 / Deck Peak / (必要なら W1 Total)。
- 免責行: "簡易モデル" ラベル (多段間隔未導入)。

制約 / 未対応:

- 14d Horizon 時も Day1 のみ加算 (Day4, Day7 などの第二回以降は未モデル化)。
- 複数デッキ同時配分シナリオ未対応 (将来: weight 配分)。
- deck flatten / backlogRatio 将来バージョンではシミュレーション後の再計算を検討。

将来拡張:

- 簡易初期間隔チェーン (Day1→Day3→Day7) 近似追加。
- deckImpact に flatten / backlogRatio 変化差分追加。
- 複数デッキへの重み付き自動配分探索 (最適化 / 勾配風探索)。

検証観点:

- 選択デッキ変更で deckImpact が正しく更新 (依存: whatIfDeck state)。
- additional=0 時 deckImpact day1After==day1Before。
- Peak 再計算: Day1 増分が元ピーク未満なら deckPeakAfter は変化なし。

### Chained What-if Simulation (Early Interval Approx) (Phase 1.27)

目的: Day1 単発モデルでは過小評価される初期再出現負荷を簡易チェーン (Day1 / Day3 / Day7) 近似で可視化し、新カード導入が Week1+序盤 (Week2 開始) に与える影響をより現実的に判断する。

背景: 多くの SRS (SM-2 系 / FSRS 推奨ステップ) は最初の 1 週間に複数回の短間隔レビュー (例: 1d→3d→7d) を挟む。従来の Phase 1.23/1.26 モデル (Day1 のみ) は 2 回目・3 回目レビューによる中期ピークを無視していた。

スコープ (v1):

- 固定オフセット {1,3,7} に同一枚数をそのまま加算 (確率分岐なし)
- Horizon=7 の場合 Day7 は除外 (14d 拡張前提)
- Deck 指定時は追加枚数すべてが選択デッキに属すると仮定し Day1/3/7 の比較を提示
- Backlog 不変 (新カード nextDue >= 今日00:00)

追加 API:

```ts
simulateNewCardsImpactChained(additional: number, horizonDays=7): WhatIfResult
simulateNewCardsImpactChainedWithDeck(additional: number, deckId: string, horizonDays=7): WhatIfResult
```

`WhatIfResult` 拡張:

- `chainDistribution: { dayOffset:number; added:number }[]`
- `deckChainImpact`: Day1/3/7 / Peak / Week1 Total の Before/After

アルゴリズム要点:

1. original = getUpcomingReviewLoad(h)
2. 有効オフセット集合 O = {o ∈ {1,3,7} | o < h}
3. days[o].count += additional (各 o に 1 回)
4. counts から Peak / Median / classification 再計算 (閾値既存流用)
5. chainDistribution = O を dayOffset 昇順で列挙
6. Deck 版: `getUpcomingReviewLoadExtended` で対象デッキ counts を同様に補正し Day1/3/7/Peak/W1 再算出

UI (Profile What-if モーダル):

- `Chained (1/3/7)` チェックボックスで切替 (デフォルト: OFF)
- 有効時 Dist: D1:10, D3:10 … の簡易タグ表示
- Deck 指定 + Chained ON: `Deck Chain Impact` ボックス表示 (単発版 deckImpact を置換)
- Chained OFF: 従来 Day1 のみ加算モデル (後方互換)

解釈ガイド:

- Peak が単発モデルより顕著 (≥+10%) → 導入の分割 / 翌日抑制検討
- Week1 Total 増分 (Day1+3) が過去7日平均レビュー数を超える → 近い将来負荷上振れリスク
- day3After ≈ day1After \* 0.6–0.8: 連続集中的再出現 → 休憩スケジューリング余地確認

既知制約 / 簡略化:

- 失敗 (Again) 再注入確率 0 扱い (実負荷より低め)
- 個別 difficulty/stability 非利用 → 一律 1/3/7
- Day7 を horizon=7 でカバーしない (14d 対応後に表示)
- Week1 Total は Day1/3 のみ追加 (Day7 は Week2)

将来拡張 (案):

1. 14d チェーン対応 (Day7 影響 / Week2 指標連動)
2. AgainRate 推定による期待値 E[reviews] = Σ( deterministics + failures ) 近似
3. FSRS baseline (stability) から初期間隔サンプリング (log / exp 分布)
4. Deck 複数配分最適化 (flatten/backlogRatio/peakShift 最小化)
5. シナリオ比較パネル (Single vs Chained vs Probabilistic)

テスト観点:

- additional=0 → chainDistribution=[] / deltas=0
- horizon=7 で day7 不在 / horizon>=8 で出現
- deckChainImpact.day7Before==day7After (horizon<8)
- チェーン ON/OFF 切替で original.\* が変化しない (派生のみ更新)

リスク / 注意:

- 固定分布のため極端に易/難カードで過大/過小評価
- 7d モードは第2週頭 (Day7) の負荷を未表示 → 14d 切替周知必要
- 大量追加 (≥300) でも O(days) 処理だが将来確率分岐拡張時コスト増懸念

撤退条件:

- 利用率低 / 誤解多数 → Advanced オプション化
- 実測 vs 予測 Day3/7 差異が継続高 (>30%) → 分布学習型へ移行

関連コード: `reviews.ts#simulateNewCardsImpactChained*`, Profile What-if モーダル toggle。

### 14d Chained Enhancement (Phase 1.28)

目的: 14d Horizon 時に Day7 連鎖レビュー (第2週冒頭) をチェーンモデルへ組み込み、Week2 立ち上がりピークの過小評価を是正。Week1 と Week2 への初期導入負荷分布 (W1+/W2+) を即時把握できるようにする。

変更点:

- `WhatIfResult` に `chainWeek1Added` (DayOffset<=6), `chainWeek2Added` (7<=DayOffset<=13) を追加。
- horizon>=8 の場合 chainDistribution に dayOffset:7 を自然に含む (既存フィルタ `<horizonDays` により条件を満たすため追加計算不要)。
- horizon>=14 & Chained ON 時 UI で Chain Summary (W1+/W2+) を表示。
- Deck Chain Impact: Week1 Total は Day1+3 のみ (Day7 は Week2 側へ分類)。

仕様要約:
| 条件 | Day7 加算 | W1+ 表示 | W2+ 表示 |
|------|-----------|----------|----------|
| h=7 | なし | なし | なし |
| 8<=h<14 | あり (内部) | 非表示 (簡素化) | なし |
| h>=14 | あり | 表示 | 表示 |

解釈ガイド:

- W1+ が過去7日平均レビュー数を超える → 短期過負荷リスク。
- W2+ が W1 Peak の ≥70% → 第2週冒頭二峰化ピーク注意。

制約 / 簡略化:

- 早期 Week2 (Day8/9) の追加レビューは未モデル化 (固定 1/3/7 のみ)。
- Again (失敗) 再注入確率は 0 扱い。
- Horizon 8–13 の中間レンジでは W2+ 不完全のため UI サマリ非表示。

将来拡張:

1. 可変プリセット (Short:1/2/5, Standard:1/3/7, Gentle:2/5/9)
2. AgainRate 学習による期待再注入 (確率分岐) モード
3. FSRS stability 由来初期間隔サンプリング (個別 difficulty/stability)
4. Multi-deck weighted introduce シミュレーション (最適化)
5. Single vs Chained vs Probabilistic 比較 UI

テスト観点追加:

- horizon=14, additional>0, chained ON → chainWeek1Added = additional*2, chainWeek2Added = additional*1。
- horizon=14, chained OFF → 両フィールド undefined。
- horizon=7 → chainWeek2Added undefined。
- horizon=10 → chainDistribution に day7 あり / サマリ非表示。

関連コード: `reviews.ts#simulateNewCardsImpactChained`, `profile/page.tsx` Chain Summary UI。

既知リスク:

- W1+/W2+ 指標が大量導入時に心理的抑制過多 → 将来は時間見積もり (分/日) 併記でバランス予定。

### Chain Presets (Phase 1.29A)

目的: 固定 1/3/7 モデルを複数プリセット化し、初期再出現間隔を学習状況 (集中度/空き時間/許容負荷) に合わせ柔軟に選択。導入→14d のピーク / Week1 / Week2 分布トレードオフ比較を高速化。

プリセット:

- Standard: 1/3/7 (従来デフォルト)
- Fast: 1/2/5 (初期密度を前倒し→後半緩和)
- Gentle: 2/5/9 (初期負荷軽減 / Week2 初頭集中リスク)
- Minimal: 3/7 (2 ステップ / 忙しい日用 / 忘却リスク高)

ロジック:

```
simulateNewCardsImpactChained(additional, horizon, now, offsets?)
```

- offsets 省略時 Standard
- sanitizeOffsets: 正数 / 重複除去 / 上限(365) / 昇順 / fallback
- chainDistribution = offsets かつ dayOffset < horizon
- chainWeek1Added = Σ(o∈offsets | o<=6 且つ o<horizon) \* additional
- chainWeek2Added = Σ(o∈offsets | 7<=o<=13 且つ o<horizon) \* additional

UI:

- Chained ON: プリセット select + D{offset} チップ (horizon 超過は line-through + 淡色)
- ラベル: Chained (1/2/5) など動的
- Chain Summary: (W1+/W2+) と使用オフセット列挙

解釈指針:

- Fast: W1+ 増 → 集中トレーニング / 余裕ある時間帯向け
- Gentle: W1+ 抑制 ↔ W2+ 増加 → 来週の負荷許容量が高い場合
- Minimal: Retention が低下する期間は避ける (間隔空きすぎ)

非目標 (本フェーズ):

- 任意カスタム入力 / 永続プリセット管理
- 確率分布 / AgainRate 期待値連動
- Deck 個別別プリセット選択

テスト観点:

- horizon=7 + Gentle → D9 無効 (line-through) / chainWeek2Added undefined
- horizon=14 + Minimal → chainWeek1Added=0, chainWeek2Added=additional (D7 のみ)
- additional=0 → chainDistribution=[] / aggregates undefined
- プリセット切替: original 不変 / simulated が期待どおり (Peak/Median 差異)

将来拡張:

1. カスタムプリセット保存 (localStorage) / Import/Export
2. AgainRate / Retention 予測に基づく確率チェーン (期待値負荷)
3. 時間換算 (平均秒 \* 枚数 → 分/日)
4. “最適プリセット提案” (制約: W1 Peak <= X かつ W2 Peak <= Y など)

関連コード: `reviews.ts (CHAIN_PRESETS / simulateNewCardsImpactChained*)`, `profile/page.tsx` What-if モーダル (プリセット select / チップ / Chain Summary)。

```ts
export type ReviewLog = {
  id: string
  cardId: string
  deckId?: string
  grade: 'Again' | 'Hard' | 'Good' | 'Easy'
  reviewedAt: number
  interval: number // days (0 は即/短時間)
  ease: number // *1000 (例: 2500 => 2.5)
  nextDue: number // epoch ms
}
```

内部 state とは別に per-card 状態 `CardState` を localStorage に保持:

```ts
{
  ;(cardId, interval, ease, nextDue)
}
```

## スケジューリング (暫定ロジック)

| Grade | Ease変化           | Interval計算                        | nextDue            |
| ----- | ------------------ | ----------------------------------- | ------------------ |
| Again | ease -200 (>=1300) | 0 (10分後再出現扱い)                | now + 10m          |
| Hard  | ease -50 (>=1300)  | max(0.007, interval\*1.25 or 0.007) | now + intervalDays |
| Good  | ease +20           | interval>0 ? \*2 : 1                | now + intervalDays |
| Easy  | ease +40           | interval>0 ? \*2.5 : 2              | now + intervalDays |

簡易目的: 直感的に“良い評価ほど次回が遠くなる”感覚を作る。後で正統化する。interval=0 は 10分後に再出現（再学習 / 直後復習枠）。

## 公開API

```ts
logReview(cardId, deckId, grade): ReviewLog | null
getReviewLogs(): ReviewLog[]               // 新しい順
getCardState(cardId): CardState | null
getDueReviews(now?): string[]              // nextDue <= now の cardId
getReviewStats(now?): { today; due; newCards }
```

イベント: `window.dispatchEvent(new CustomEvent('evody:reviews:changed', { detail:{ cardId } }))`

## UI 統合点

- Quick 学習: 仮想 deckId "quick" で `logReview`
- Deck 学習: 対象 `card.id` + `deckId`
- Profile: `getReviewStats()` + イベントでリアルタイム更新

## 制限 / 借り

- 同日複数レビューの間隔短縮/拡張への効果を未調整
- ease 上限/下限チューニングなし (下限 1300 のみ)
- 学習失敗(Again) 連続時の特別処理なし
- リーク防止: localStorage 無制限増加 (将来 truncate/compaction)
- 同期 / マルチデバイス未対応

## 移行計画 (Phase 2+)

1. 早期ステップ (Learning Steps) の明示 (例: 10m / 1d / 3d / 7d)
2. FSRS もしくは SM-2 派生モデル導入 (stability, difficulty 推定)
3. 忘却率を 90% 信頼境界でターゲットする adaptive scheduling
4. リビューセッション UI (`/review`) で due card キュー消化フロー
5. 休眠カード (長期間未レビュー) の decay 処理
6. ユーザー別パラメータチューニング (ease drift 個別最適化)

## メトリクス追加案

- 累計レビュー数 / 1日平均
- 平均再学習回数 (Again率)
- Retention (Good+Easy) / (総レビュー - Again)

## パフォーマンス指標 (Phase 1.7)

`getReviewPerformance()` を追加し当日内レビューの品質を算出:

計算式:

- total = 今日のレビュー総数
- againRate = Again / total
- retention = (Good + Easy) / (total - Again) (分母0なら0)

理由:

- Again を除いた残り集合は「想起できた/ほぼできた」候補なのでそこの Good+Easy 割合を retention として簡易保持
- Hard は “成功だが低信頼” と見なし retention 分子に含めない（後で加重平均や difficulty 係数化を検討）

表示:

- Profile 学習ステータスに Retention%, Again率% を追加

将来拡張案:

- rolling 7d retention (移動平均)
- deck 別/タグ別の retention breakdown
- FSRS 移行後は stability との相関表示

## 次のアクション候補

- `/review` ページで due カードのみを連続提示 (既存学習ページ再利用)
- 新しい Good/Easy 連続コンボによるボーナスポイント
- ログ圧縮: 直近 N 回以外は集計スナップショットへ

### 14d Deck Breakdown (Phase 1.24 Extension)

目的: 14日先までのレビュー予測をデッキ単位で可視化し、どのデッキが第2週ピークや偏重の原因になっているかを即座に特定。新カード導入配分の意思決定精度を高める。

API 拡張:

`getUpcomingReviewLoadExtended(horizon)` 戻り値に optional `decks?: { deckId: string; counts: number[]; backlog: number }[]` を追加 (horizon <=14 の場合のみ計算)。

定義:

- `counts[i]`: i日後 (0=Today) のそのデッキの予定レビュー件数 (backlog を除く)
- `backlog`: Today 時点で期限超過 (nextDue < 今日0時) の該当デッキ件数
  - 表示ではバー最下層に backlog (赤系)、その上にデッキ別セグメント (HSL ローテーション) を積み上げ。

計算手順 (reviews.ts `computeBaseUpcoming`):

1. horizon<=14 のときのみ deckMatrix を初期化 (パフォーマンス軽量化)
2. 1パス目: due>=today0 のカードを diff バケツへ加算し deckMatrix.counts[diff]++
3. backlog カウント確定後、backlog カードを deckMatrix.backlog++ (2パス目) で帰属
4. 返却時に `Map` -> 配列 (`extended.decks`) へ変換

UI:

- Profile > Upcoming Review Load (14d) に Stack トグルボタン (localStorage: `evody:profile:deckStack14`)
- Stack 有効時: 各日バーを backlog + Σ(deck segments) で積層。バー高さは (Total / PeakWithBacklog) 基準。
- 凡例: 上位12デッキ (HSL((i\*47)%360,70%,55%)) + backlog (赤)。
- ‘Raw’ ボタンで非スタック (従来単一バー) に戻す。

利用例:

- 2週目ピークシフトが一部デッキ (例: grammar) に集中している場合、そのデッキへの新カード導入を一時減速。
- Backlog が特定デッキで多い → 先にそのデッキの既存復習を優先する戦略に切替。

制約 / メモ:

- horizon>14 未対応 (計算・UI とも)。必要になれば lazy grouping を検討。
- Deck ID 未設定カードは 'default' グループに集約。
- 追加計算コストを抑えるため 14d 超は計測しない (第二週分析が主目的なので十分)。

将来拡張案:

- What-if シミュレーションを Deck 別導入配分に対応 (vector input)
- Deck Backlog Alert (backlog 比率閾値超過検知)
- Deck mini-metrics の平滑化/トレンド線 (7d移動平均)
- Deck Flatten のトレンド推移 (履歴比較) ※ Flatten 本体は実装済

#### Deck Week Mini-Metrics (実装済 Phase 1.24+)

各デッキに対し week1/week2 (0-6日, 7-13日) の Peak / Total を算出し `extended.decks[i].w1 / w2` に格納。

計算:

```
w1Counts = counts[0..6]; w1 = { peak: max(w1Counts), total: sum(w1Counts) }
w2Counts = counts[7..13]; w2 同様 (horizon>=14 かつ配列長>=8)
shift = w2.peak - w1.peak
balance = w1.total>0 ? w2.total / w1.total : null
```

UI: Profile 14d 表示時に “Deck Week Metrics” テーブル (上位12デッキ: ソート順 w2Peak desc -> w1Peak desc -> backlog desc)。列: Deck / W1 P/T / W2 P/T / Shift / Balance / Bkg。

カラーリング:

- Shift: <=0 緑, <=3 黄, >3 赤
- Balance: <=1.15 緑, <=1.4 黄, >1.4 赤

活用例: 2週目特定デッキのピーク増加 (Shift>3 かつ Balance>1.4) を検出し導入ペース調整。

#### Deck Local Flatten Metrics (実装済 Phase 1.24+)

目的: 各デッキ内で特定少数日へのレビュー集中 (尖り) がどの程度かを把握し、過度な一極集中を早期に是正 (学習配分 / 新カード導入日の分散) する判断材料を提供する。

API 拡張: `getUpcomingReviewLoadExtended()` の `extended.decks[i]` に `flatten?: number` と `top3Avg?: number` を条件付き付与。

定義:

- `deckPeak`: そのデッキ counts[] (0..horizon-1) の最大値。
- `top3Avg`: counts を降順ソートした上位最大3日 (要 counts>=3 かつ 合計>0) の平均値 (小数2桁)。
- `flatten`: `deckPeak / top3Avg` (top3Avg>0 のとき)。1.00 に近いほど平準化され、値が小さいほど 1～2 日へ依存集中している。

計算手順 (簡略):

1. デッキごとの counts[] を取得 (既存 Deck Breakdown ロジック)。
2. counts 降順で 3 要素まで抽出し平均 → top3Avg。
3. deckPeak を取得し `flatten = round(deckPeak / top3Avg, 2)`。
4. counts 長 <3 または top3Avg==0 → 両フィールド null (未評価)。

UI (Profile / 14d 表示時 Deck Week Metrics テーブル):

- 列 `Flat` として表示。ツールチップ: `Flatten = deckPeak / top3Avg (デッキ内尖り)`。
- カラー閾値: `>=0.92` 緑 (良好) / `>=0.75` 黄 (要観察) / `<0.75` 赤 (尖り強)。
- 値が `--` の場合: データ不足 (counts<3) または全0。

活用例:

- Flat が赤のデッキ: 近接2～3日にピーク集中 → 新カード追加を他デッキへ分散 / 尖った日へ向かう前に backlog 消化を優先。
- Flat が黄: 軽度集中。増分導入時に当該デッキは控えめにして均一化を観測。
- 全デッキ Flat 緑だがグローバル flattenIndex が黄/赤 → 集中原因は特定デッキ単独ではなく複数デッキの同日重なり (別軸調整検討)。

エッジケース / 注意:

- counts=全0 → top3Avg/flatten 共に null。
- horizon=7 でも内部計算は可能だが UI では 14d 分析主眼のため 14d テーブル表示時に主利用。
- top3Avg==deckPeak (上位3日が同値) の場合 flatten は 1.00 となり微小変動に鈍感 → 将来 top5Avg などの比較指標検討余地。

将来拡張:

- デッキごとの flatten 推移 (過去 n 期間) チャート化で漸進的平準化成果の可視化。
- top3Avg に代わるロバスト指標 (例: 上位 q 分位平均, trimmed mean) の実験。

#### Deck Backlog Alert (一部実装 Phase 1.24+)

目的: 各デッキの滞留 (期限超過) 割合を即座に把握し、復習優先順位や新規投入抑制をデッキ粒度で判断できるようにする。

指標定義:

- `backlog` (既存): 今日時点で nextDue < 今日0時 の件数。
- `futureSum`: horizon 内 (0..h-1 予定) counts の合計。
- `backlogRatio = backlog / (backlog + futureSum)` (分母0 → null)。小さいほど健全。

カラー閾値 (初期):

- `>=0.40` 赤 (高滞留: 即介入)
- `>=0.25` 黄 (注意: backlog 消化優先検討)
- `<0.25` 緑 (概ね健全)

UI 変更 (Profile / 14d Deck Week Metrics):

- 列 `Bkg%` を追加。`Bkg%` は 0–100% 表示 (四捨五入整数)。
- ソートロジックは従来 (w2peak→w1peak→backlog) のまま。表示対象は (w1.peak>0) もしくは backlog>0 のデッキ。
- ツールチップ: `Backlog Ratio = backlog / (backlog + future counts)`。

活用例:

- Bkg% が赤のデッキ: その日の新規追加を他デッキへ回す / 先に backlog 消化セッション。
- Bkg% 黄: Flatten や Shift が悪化していないなら短期的 backlog 集中セッションを 1 回挟む。
- Flatten 良好かつ Bkg% 高: 一時的な停滞 (直近休止) の可能性 → 今日重点投入で早期正常化。

エッジケース:

- futureSum=0 & backlog>0 → backlogRatio=1.00 (全て滞留) → 赤。
- backlog=0 & futureSum>0 → 0.00 (緑)。
- backlog=futureSum=0 → null 表示 (`--`)。

将来拡張:

- Bkg% 高デッキに対し adaptive new limit の deck-specific 減算 (soft cap) を組み込む。
- 過去 n 日 Bkg% 推移スパークライン。

### Rolling Quality Trend (Retention / Again 7d) (実装済 Phase 1.25)

目的: 日次の記憶品質 (Retention) と負荷/失敗指標 (Again率) の短期推移を簡潔に可視化し、新カード導入や難易度調整の判断を高速化する。

指標定義:

- 日次集計: total, Again, Hard, Good, Easy。
- Retention 日次 = (Good + Easy) / (total - Again) （分母<=0 → null)。
- AgainRate 日次 = Again / total （total=0 → null)。

データ取得:

- `getRecentDailyPerformance(days=14)` で直近 n 日 (デフォルト 14) を構築し UI 側は 7 日分を表示。
- 欠損 (レビューゼロ) 日は retention, againRate 共に null。

UI:

- 「Quality Trend (7d)」カード内に Retention, Again Rate の 7 本ミニ棒グラフ (最小高さ 2px)。
- カラー閾値:
  - Retention: >=85% 緑 / >=70% 黄 / 他 赤
  - AgainRate: <=10% 緑 / <=20% 黄 / 他 赤
- Today 値を右上に表示。欠損日は '--'。
- 手動更新ボタン (↻) で即再取得。

活用例:

- Retention が黄→赤へ低下し AgainRate が悪化傾向: 新規導入抑制や再学習タイミング見直し。
- Retention 緑安定 & AgainRate 低: Adaptive Limit の正の調整 (既存ルール) が発火しやすい環境。

エッジケース:

- 連続ゼロ日が多い場合全棒 '--' (利用者が離脱)。改善後最初の活動日棒のみ着色。
- 極端な少量 (total=1 等) は統計ノイズ。将来: weight (min threshold) 導入検討。

将来拡張:

- 14d / 30d スイッチ
- 平滑 (EMA) 線オーバーレイ
- Deck 別品質トレンド (small multiples)

## Review セッション UI (`/review`)

Phase 1.5 で導入。

### 目的

- `getDueReviews()` が返す期限到来カードを 1 枚ずつ提示し集中処理
- Reveal → Grade(Again/Hard/Good/Easy) → 次へ の最短操作ループ
- キーボード操作で高速化 (Space/Enter Reveal, 1..4 でグレード)

### 画面構造

| セクション | 内容                                                  |
| ---------- | ----------------------------------------------------- |
| ヘッダ     | タイトル / 進捗バー (index / total)                   |
| カード     | 表面(front) → Reveal 後に裏面(back) + Grade ボタン    |
| 補助       | 現在カードの内部状態(interval/ease/next) デバッグ表示 |
| フッタ指標 | セッション獲得ポイント / 残カード数                   |

### 流れ

1. マウント時に `getDueReviews()` で cardId リストを取得
2. 表示前は front のみ。Space/Enter か Reveal ボタンで裏面を表示
3. Grade ボタン or ショートカット (1..4) で `logReview()` 呼び出し
4. スケジュール更新 → `evody:reviews:changed` 受信により他画面も同期
5. 次カードへ (末尾に到達したら最新 due を再取得し、残が 0 なら空状態へ)

### キーボードショートカット

| Key           | Action            |
| ------------- | ----------------- |
| Space / Enter | Reveal (未表示時) |
| 1             | Again             |
| 2             | Hard              |
| 3             | Good              |
| 4             | Easy              |

### ポイント付与 (暫定)

| Grade | Point |
| ----- | ----- |
| Again | 0     |
| Hard  | 2     |
| Good  | 5     |
| Easy  | 7     |

期限カード無しの場合: 「期限が来ているカードはありません。」のみ表示 (行動: 他デッキ学習へ戻る想定)。

### 今後の拡張候補

- バッチサイズ調整 (大量 due を動的分割)
- 並べ替え戦略 (最短間隔 / 重要度 / deck ミックス)
- Undo (直前 Grade 取り消し)
- Audio / イメージサポート
- セッション Episode と紐付け (後続: EpisodeId を ReviewLog に格納)

### Undo 機能 (Phase 1.6)

`undoLastReview()` により直前の 1 件の ReviewLog を取り消し:

- 最終ログを除去
- 全ログを時系列で再適用し `CardState` を再構築
- イベント `evody:reviews:changed` で UI 同期
- `/review` ページ: Undo ボタン表示時のみ活性 (過去セッション越え連打による多段 Undo は今回 1 ステップずつ)

制限:

- 取り消し後の再実行は新規ログとして付与 (完全な履歴ツリーは保持しない)
- ポイント: 当該レビューで加算した分を減算 (0 未満にはならない `PointsProvider` 側で clamp)
- 過去に遡って N 件まとめて戻す機能は未対応 (必要ならスタック/redo 拡張)

### Review Episode 連携

- `/review` バッチ完了時に Episode 保存 (kind 暫定 'deck')
- ポイント/正誤が streak, heatmap, 今日統計に反映
- 次バッチ開始時に内部カウンタリセット

### Review Episode 種別

- Episode.kind に 'review' を追加
- 旧データ: kind 'deck' かつ deckId なしのエピソードは過去レビューとみなせる (オプションで変換)

---

改善提案は `docs/TODO.md` に追記してください.

### Focus / Variability Alert (Phase 1.13 → 1.16 Baseline Adaptation)

BaselineTI = 過去6日の TailIndex (p90/p50) 有効値平均 (>=3日)

```


追加フィールド:

| 対象      | フィールド  | 型     | 初期値 | 意味 (暫定)                                        |
| --------- | ----------- | ------ | ------ | -------------------------------------------------- |
ヒューリスティック更新 (暫定 v1):

```

Grade=Again: difficulty += 0.05 (<=2.0), stability _= 0.6 (>=0.5)
Grade=Hard : difficulty += 0.02, stability _= 0.9
Grade=Good : difficulty += 0, stability _= 1.25
Grade=Easy : difficulty -= 0.03 (>=0.5), stability _= 1.4
補正: intervalDays>0 -> stability = max(stability, intervalDays\*0.8)
丸め: difficulty 小数3桁, stability 小数2桁

```

導入理由:

- 早期から “カードごとの差異” を蓄積し、後段で FSRS の難度/安定度初期化を高速化。
- 係数は経験的であり、後で回帰またはベイズ更新に置換。

後方互換:

- 既存ログ/状態: 読み込み時 difficulty 未定義なら 1.0, stability 未定義はそのまま (初回レビューで付与)。

今後の移行ステップ案:

1. ログ全体から difficulty 分布正規化 (平均=1.0) 再スケール
2. stability を (次回実際間隔 / 想定再現率) でフィードバック補正
3. FSRS ライクモデル: S (stability), D (difficulty) 動的更新式へ切替
4. 予測忘却率 p(recall) = exp(-t / S) 仮定で期待 retention と比較 -> 誤差最小化学習

追加 API:

- `getCardExtendedState(cardId)` : CardState + 新フィールド
- `getCardDifficulty(cardId)` : number | null
- `listDifficultCards(threshold)` : 難カード一覧 (降順)

UI (開発用): `/review` カード情報枠に diff/stab を表示。

拡張候補:

- difficulty の更新に reactionTime p50 を組み込み (遅延多→上方調整)
- stability の指数平滑化 (最近レビューを重み付け)
- 線形ではなくロジスティック更新 (飽和挙動)
- Deck 別平均難度ヒートマップ / 難カード抽出 UI

判定 (当日値: p50_now, ret_now, ti_now):

Focus 条件:

```

Undo は分布・正誤カウンタを巻き戻し、反応時間は巻き戻さない (軽量設計)。
AND
ret_now <= BaselineRet - 0.04 // Retention 4ポイント (4%) 以上低下

```

Variability 条件:

```

```

両方成立すればメッセージを結合し、単独成立でも該当メッセージを表示。ベースライン未確定(有効日<3)ならアラート抑制。

メッセージ例:

```

集中度低下: p50 320ms (基準 250ms) / Retention 78% (基準 83%) / ばらつき増大: TI 1.72 (基準 1.45)。短い休憩や新カード導入抑制を検討。

```

抑制:

- localStorage: `evody:focusAlert:YYYY-MM-DD` 設定で当日再表示なし。
- バナーボタン「閉じる」で当日 suppress。

再評価タイミング:

- Profile マウント/更新 (episodes, reviews 変更イベント) 時に計算。

データ源:

- p50/p90: Episode `p50TimeMs` / `p90TimeMs` 日次加重平均 (weight = セッション回答数)
- Retention: `getDailyReviewRetention(7)` (weight mode 現在選択に依存せず対照: effective モード基準) ※ 実装では既存 API の値をそのまま利用
- TailIndex: Reaction 日次集計から派生 (p90/p50)

エッジケース:

- ベースライン未確定 (有効日 <3) → アラートなし
- 当日 p50 もしくは retention 無効値 → 該当条件スキップ
- TI ベースライン未確定→ Variability 条件スキップ

今後の拡張候補:

- Hard/Again の急増 ( (hard+again)/total ) を第3条件として複合ルール (2 of 3)
- Z-score (過去標準偏差) による統計的異常判定
- 連続発火日数に応じた `cooldown` や自動新カード上限縮小
- Deck 別アラート (特定デッキのみ集中低下)

### Hard/Again ガイダンス (Adaptive Hint)

1 セッション中に以下条件を初めて満たした時ヒント表示:

- Again率 > 25% → 「記憶が不安定」
- (Hard+Again)/総数 > 40% → 「負荷/集中低下か難度過多」

### 7日間 Retention トレンド (Profile)

API: `getDailyReviewRetention(days=7)`

計算:

```

weight = (grades あり) ? (total - again) : (correct + incorrect)
dailyRetention = Σ(retention_i \* weight_i) / Σ(weight_i)

```

UI:

- 7日分の棒スパークライン (欠損日は半透明)
- 最新値と初日との差分 (±2% 未満は → )

拡張アイデア:

- deckId フィルタ / rolling 平均 / p50 反応時間併記
- 重み方式切替 (cards, (total-again), (good+easy))

### Deck 別 7日間 Retention トレンド (Phase 1.10)

目的: 全体トレンドに加えて特定デッキの定着度 (retention) 推移を把握し、難度調整や導入ペース変更の判断材料を提供。

API 拡張: `getDailyReviewRetention(days=7, now?, deckId?)`

分岐仕様:

1. `deckId` 指定なし (従来):

- 対象: `Episode.kind === 'review'`
- 各 Episode の `retention` を weight=(total-again) もしくは grade 分布未保存時は (correct+incorrect) で加重平均。

2. `deckId` 指定あり:

- `ReviewLog` を直接フィルタ (該当 deck のみ)
- 日単位に grade 集計 `{ again, hard, good, easy, total }`
- `retention_d = (good + easy) / (total - again)` (分母0なら null)
- Episode 経由しない理由: deck 粒度で純粋な生ログに基づく日次品質を即時計算・将来 Episode 生成不要化を想定。

戻り値 (共通): `DailyRetention[]` `{ date: 'YYYY-MM-DD'; retention: number | null }` (null=データなし)

UI:

- Profile「学習ステータス」カード右上に Deck セレクト (All Decks / 各 Deck)
- All Decks 選択時: 全体 7d トレンド + (選択無)
- Deck 選択時: 全体トレンドに加え下段に `7d Retention (<deckId>)` スパークラインを追加表示
- 差分表示 (→ / ↑ / ↓) ロジックは全体と同一 (初日 vs 最新 / ±2% 未満は →)
- 欠損日は半透明 (opacity 0.35) 棒。

今後の拡張候補:

- Deck 別・全体同時比較 (ミニライン重ね描画)
- Deck フィルタ選択状態を localStorage 永続化
- (total-again) 以外の weight 選択 UI (スイッチ: card count / (total-again) / correct-only)
- p50/p90 反応時間 (avgTimeMs に加えログから算出) のデッキ別トレンド併記
- Hard 比率急上昇デッキの自動ハイライト

### Retention Weight Modes (Phase 1.12)

目的: Retention 日次集計で “どの量を重みとみなすか” を切替え、学習戦略 (量 vs 品質 vs 定着) の視点を変える。

モード:
| mode | 重み定義 | 目的 / 解釈 | 欠点 |
|------------|-----------------------------|-------------------------------------------|------|
| effective | (total - again) | 既定: 想起(Again除外)ベースの安定度 | Again 多発日で分母縮小揺らぎ |
| cards | total | 純粋な処理量で平均 (量の偏りを反映) | Again を多く含むセッションが軽視されない |
| goodEasy | (good + easy) | 高品質成功量を重視 | 低品質日 (good+easy 極小) で重みゼロ化 |

表示する retention 値自体は一貫して `(good+easy)/(total-again)` を採用し、違いは日別加重平均時の weight にのみ影響。

Episode ベース (deckId 無) 計算:

```

weight = switch(mode){
cards -> totalCards (=correct+incorrect)
effective -> (grades? total-again : totalCards)
goodEasy -> (grades? good+easy : totalCards) // grades無い古いEpisodeは代替 (再構築不可)
}
dailyRetention = Σ(ep.retention \* weight)/Σ(weight)

```

Deck 指定 (ReviewLog ベース) は day 集計時に同様:

```

effectiveWeight = total - again
weight = mode=='cards'? total : mode=='goodEasy'? (good+easy) : effectiveWeight
retention(表示) = (good+easy)/(effectiveWeight>0?effectiveWeight:1)

````

フォールバック:

- 古い Episode に grades 無 → goodEasy モード時も cards 重みにフォールバック。
- 分母0 (total==again 等) → retention=0, weight=0 → 日次 null (透明バー)。

UI:

- Profile 学習ステータス右上にモードセレクト (Eff / Cards / G+E) を Deck セレクト左に配置。
- 選択状態 localStorage key `evody:profile:retWeight` で永続化。

今後の拡張案:

- モード毎の説明ツールチップ (hover で上表簡易表示)
- 複数モード比較 (スパークラインを横並びミニ表示)
- “安定度 vs 量” 二軸チャート (effective vs cards)

### Adaptive New Card Limit (Phase 1.19)

目的: 毎日の新カード導入量を学習品質と集中度指標に基づき自動調整し、過負荷 (Retention 低下 / Again 多発 / 反応時間悪化 / ばらつき拡大 / 難カード蓄積) を未然に抑制しつつ、好調時は適度にペースを引き上げる。

ベース:

- Base Limit = 5 (既存 `DAILY_NEW_LIMIT` を再利用)
- 上限 8 / 下限 0
- 前日比スムージング: 1日あたり ±2 まで (急減/急増を防止)
- localStorage 永続: `evody:adaptiveNew:lastLimit`, 日別 `evody:adaptiveNew:limit:YYYY-MM-DD`
- オーバーライド: `evody:adaptiveNew:override = 'fixed'` で動的計算停止 (Base を採用)

入力指標 (直近7日 / 当日):

| 指標            | 説明                           | 使用形                         | しきい値例            |
| --------------- | ------------------------------ | ------------------------------ | --------------------- |
| Retention       | 日次 (Good+Easy)/(total-Again) | 当日 vs 過去6日平均            | -5pt / +4pt           |
| Tail Index      | p90/p50 (反応ばらつき)         | 当日 vs baseline               | >=1.6 or +5% 悪化     |
| AgainRate       | 当日 Again / total             | 単独                           | >30% 悪化 / <10% 改善 |
| StruggleRate    | (Again+Hard)/total             | 追加負荷指標                   | >45% 悪化             |
| Reaction p50    | 中央反応時間                   | 当日 >= baseline \*1.25 で遅延 |
| Difficult Ratio | difficulty>=1.3 のカード割合   | 蓄積負債                       | >25% 悪化 / <10% 改善 |

調整ルール (順不同で加算、net に対して後で clamp+smooth):

負方向 (-1 ずつ):

- Retention <= baseline - 0.05
- TailIndex >= 1.6 OR TailIndex >= baseline \*1.05
- AgainRate > 0.30
- StruggleRate > 0.45
- p50 >= baselineP50 \*1.25
- DifficultRatio > 0.25

正方向 (+1 ずつ):

- Retention >= baseline + 0.04
- AgainRate < 0.10 AND TailIndex <= 1.30
- DifficultRatio < 0.10

計算フロー擬似コード:

```ts
limit = base(5)
for rule in negatives: if(cond) { limit -=1; adjustments.push }
for rule in positives: if(cond) { limit +=1; adjustments.push }
computed = limit
limit = clamp(limit, 0, 8)
if (prevLimit exists && |limit-prevLimit|>2) limit = prevLimit ±2
persist(limit)
return { base, computed, final: limit, adjustments }
````

難度計測:

```
diffRatio = cards(filter difficulty>=1.3) / totalCards
```

表示 (Profile 学習ステータス):

- "新カード枠" 行で `remainingToday/dailyLimit`
- 情報アイコン tooltip: `Base -> Computed => Final` と理由一覧 (+/-1 reason)
- 固定化チェックボックス: ON で override 設定し Base に固定 / OFF で再計算。

オーバーライド仕様:

```
localStorage.setItem('evody:adaptiveNew:override','fixed') // 有効
removeItem で解除
```

フォールバック:

- ベースライン (過去有効日>=3) 未確立指標は対応ルールスキップ
- 例外/計算エラー発生時は Base をそのまま返す (安全側)

将来拡張案:

- 新カード導入を “半日” 粒度 (午前/午後) に分割
- 期待ワークロード (復習時間推定) から残可処理時間ベース上限計算
- FSRS 予測忘却率 (p(recall)) を用いた最適化 (target retention 目標逆算)
- 難カード比率に応じた段階調整 (-2, +2 など) と複合条件 (2 of N)
- 週次クールダウン: 過去3日連続 Negative > Positive なら上限-1 維持

関連コード: `src/lib/reviews.ts#getAdaptiveNewLimit`, `getNewCardAvailability` (dailyLimit 差し替え) / Profile UI tooltip & override toggle。

エッジケース:

- 1 日目 (履歴薄い) → 調整 0 (Base 使用)
- 前日 limit 不明 (初回) → smoothing スキップ
- override 中でも `remainingToday` は導入消費で減少

### FSRS Baseline Parameters (Phase 1.22)

目的: 将来 FSRS / 忘却確率モデルへの移行を見据え、カードごとに `difficulty` と `stability` をレビュー毎に漸進更新し観測データを蓄積。現行スケジューラを壊さず並走させる。

フィールド:

- difficulty: 0.8 (易) ~ 2.5 (難) 初期 1.0
- stability: 0.5 ~ 120 (日相当) 初期 1.0

更新タイミング: `logReview` 内 `scheduleNext` 結果後に `applyFsrsBaseline(prev, scheduled, grade)` を適用。

Difficulty 更新式:

```
shift: Again +0.15 / Hard +0.05 / Good -0.02 / Easy -0.06
difficulty' = clamp(0.8,2.5, difficulty + shift * 0.6)  // damping=0.6
```

Stability 更新式:

```
Again: S' = S * 0.4
Hard:  S' = S * 1.05 + 0.2
Good:  S' = S * 1.25 + 0.4
Easy:  S' = S * 1.35 + 0.6
clamp(0.5, 120)
```

スケジューラとの関係:

- `scheduleNext` の interval / ease / nextDue はそのまま。
- 本フェーズでは FSRS 値を単に保存し、間隔計算へ未反映。

除外/保留:

- proposedInterval の保存 (lint 未使用警告回避のため削除)
- 忘却確率 p(recall)=exp(-t/S) 的利用は次フェーズ候補

エッジケース:

- 既存 state に difficulty 無 → 1.0 注入
- stability 無 → 初回更新式で生成
- Undo 再計算は未対応 (後でログリプレイ導入)

将来拡張:

- proposedInterval と現行 interval の diff 可視化
- 難度 drift 抑制 (EMA) / 成長式を logistic 化
- ユーザ固有パラメタ学習 (最適 fit)
- stability による忘却確率から限界ワークロード推定

関連コード: `src/lib/reviews.ts#applyFsrsBaseline`, `logReview`。

### Upcoming Review Load (Phase 1.20)

目的: 直近7日 (当日含む) の予定レビュー負荷 (nextDue 到来予定 + backlog) を可視化し、過負荷兆候を早期把握して導入ペース判断材料を提供。

データ: `CardState.nextDue` 全カード。

集計:

```
day0 = 今日00:00
for each card:
  if nextDue < day0 -> backlog++
  else diff=floor((nextDue-day0)/dayMs); 0<=diff<7 なら buckets[diff]++
counts = 各日の count (day0 は backlog を含まない)
peak = max(counts)
median = 中央値(counts)
avg = 平均(counts)
classification: high if peak>=15 OR avg>=10; medium if peak>=8 OR avg>=5; else low
today.projected = counts[0] + backlog
```

戻り値: `UpcomingLoadSummary { days[], total, peak, median, classification, today:{dueToday,backlog,projected} }`

UI: Profile "Upcoming Review Load (7d)" バー。day0 は backlog(赤) + 当日残(アクセント) の積層。指標: Peak / Median / Today projected + classification バッジ (low 緑 / medium 黄 / high 赤)。backlog>10 警告表示。

エッジケース: 全0 → peak=null classification=low。カード0 → 空表示。

拡張案: 14日 horizon / デッキ別内訳 / シミュレーション (導入枚数変更影響) / トレンド矢印。

### Load-aware Adaptive New Limit (Phase 1.21)

目的: 7日先負荷と backlog を取り込み、新カード上限を自動増減 (過負荷抑制 + 低負荷回復)。

適用条件: カード総数>=50 且つ ReviewLog>=50。未達時は workload 調整スキップ。

入力: classification / peak.count / backlog / avg。

抑制:

- high: -2 (workload:high-peak) + backlog>20 で -1 (high-backlog)
- medium: -1 (workload:medium) + backlog>10 で -1 (medium-backlog)

回復:

- low & backlog==0 & peak<=6: +1 (low-recover) 前日も low なら +1 (low-sustained)
- backlog==0 & avg<=3: +1 (avg-low) ※総回復 +2 を超えないよう制御

クールダウン:

- 連続日で base 乖離 |delta|>=2 同方向 → 2日目は ±1 に緩和 (workload:cooldown)
- lastChange / lastDelta localStorage

保持キー: `evody:adaptiveNew:prevLoadClass`, `lastChange`, `lastDelta`。

統合手順:

1. 既存指標調整 (Phase 1.19) で limit
2. Workload ルール適用 → workloadDelta
3. 大幅連続方向なら cooldown 緩和
4. clamp & smoothing(±2/day)
5. persist & classification 保存

adjustments.reason 追加: high-peak / high-backlog / medium / medium-backlog / low-recover / low-sustained / avg-low / cooldown。

エッジケース: 7日全0 + backlog0 → classification=low (初期保護により調整無し)。backlog 大量かつ future 0 → avg 高くなければ peak 閾値未満で medium/low 判定。

拡張案: peak トレンド抑制 / 14日 horizon / FSRS 仮想 due 合成 / target retention 逆算導入。

### What-if 新カード導入シミュレーション (Phase 1.23)

目的: 「今日さらに N 枚新カードを導入した場合」、直近 7 日間レビュー負荷 (件数ピーク/中央値/分類) がどう変化するか即時可視化し、過負荷回避と導入判断を支援。

スコープ (v1):

- Horizon = 7 日 (既存 Upcoming Review Load と同一)
- 追加カードは Day1 (明日) に 1 回だけ再出現する (初回復習) と仮定
  - Day0 (今日) のバーには加算しない (初回学習当日の即時再出現/再学習ステップは負荷試算対象外)
  - 失敗 (Again) による再注入や各カードの分散は未考慮
  - Backlog は変化しない (新カード nextDue は >= 今日 00:00)

入力:

```
additional (number >=0)
```

出力 (WhatIfResult):

```
{
  additional: number
  original: UpcomingLoadSummary // 現状
  simulated: UpcomingLoadSummary // 追加後再計算 (Day1 に additional 反映)
  deltas: { peak: number; median: number; peakIncreasePct: number; classificationChanged: boolean }
}
```

アルゴリズム:

1. original = getUpcomingReviewLoad(7)
2. days をディープコピー → index=1 (明日) の count += additional
3. counts[] から peak / median / avg 再計算 (ロジック original と同一)
4. classification (low/medium/high) を同一閾値で再判定
5. deltas:
   - peak = simulated.peak.count - original.peak.count (peak 不在は 0 扱い)
   - median = simulated.median - original.median
   - peakIncreasePct = (peakΔ / original.peak.count) \*100 (0 guard)
   - classificationChanged = original.classification != simulated.classification

制約 / 簡略化:

- 2 回目以降 (Day2+) の再出現は無視 (FSRS 反映前のため単純化)
- Again/HARD 再学習増は未モデル化 (Fail 分布は後続フェーズで確率近似導入予定)
- Deck 配分なし (今後: デッキ選択 / 均等配分 / 比率指定)
- Horizon <2 の場合 or additional=0 → 差分 0 を返却

UI (Profile):

- Upcoming Review Load カード右肩に "What-if" ボタン
- モーダル内:
  - スライダー + 数値入力 (0..max) max= max(10, currentDailyLimit\*2) で上限簡易設定
  - Before / After 指標 (Peak / Median / Classification / Peak Δ%)
  - 7d バー差分表示: Before (淡) / After (濃) / +増分ラベル
  - Apply: 実際に introduceNewCards(ids) を呼び出し新カード導入 (日残枠超過分は無視) → モーダル閉じ/再計算
  - Close: 影響なし

アクセシビリティ / UX:

- 数値直接入力で細かい枚数調整
- Peak Δ が正かつ classification 変化 (medium→high 等) の場合 After Peak 数字を赤系表示
- Δ% 表示は 2 桁小数 (内部計算→丸め)

エッジケース:

- original.peak=null (全0) で additional>0 → peakIncreasePct=0 (除算回避) だが After peak は正数 → Δ% は 0 と表示 (後続改善余地)
- Day1 バケット不足 (horizonDays<2) → そのまま原状返却
- additional が極端に大 (200 など) → 正常に計算 (UI 上限で抑制)

将来拡張案:

- 追加カードを初回学習→(10m)→同日再出現→(1d)→... の簡易ステップに展開し Day0/Day1/Day2 分散
- FSRS stability 初期値と difficulty から予測間隔サンプリング (指数/対数分布近似)
- 失敗確率 (想定 AgainRate) を掛けた期待追加レビュー件数の期待値 (E[future reviews]) 表示
- Deck 別割り当て (UI: デッキ選択 / 比率スライダー)
- 14日/30日 horizon オプション & Peak flatten シナリオ比較

関連コード:

- `simulateNewCardsImpact` (`src/lib/reviews.ts`)
- Profile: What-if モーダル (スライダー/差分/Apply) 実装

リスク / 注意:

- 単純モデルのため実際のピーク上昇を過小評価 (2回目以降復習省略) する傾向 → UI ツールチップで明示化検討
- 新カード導入後、即座に再度シミュレーションする際は最新 load へ更新 (イベント受信で自動 refresh)

撤退戦略:

- 利用率低 or 誤解招く場合: モーダルをデフォルト非表示 (設定で有効) に格下げ。

テスト観点:

- additional=0 → deltas 全 0
- peak 増加なし (Day1 既に最大で additional 小) → peak Δ=0 / median 変動あり得る
- classification 変化 (low→medium / medium→high) が正しくフラグ
- horizonDays=1 呼び出し時ガード (結果オリジナル)

### 14日 Horizon 拡張 & 平準化指標 (Phase 1.24)

目的: 7日先だけでは検知が遅れる「第2週集中 (負荷の山)」リスクを早期に把握し、新カード導入ペースや休息計画を前倒し調整できるようにする。加えて負荷分布の形状 (集中 vs 平準化) を簡易指標化して、レビュー量の偏り是正判断を支援する。

変更点概要:

- 既存 `getUpcomingReviewLoad(7)` は後方互換のまま維持。
- 新関数 `getUpcomingReviewLoadExtended(days=7|14)` を追加。7日指定時も同一処理で拡張フィールドを返す (UI は利用任意)。
- 14日選択時に Week1 / Week2 の統計と形状指標を計算。

追加フィールド (UpcomingLoadSummaryExtended):

| フィールド        | 型      | 説明                                             |
| ----------------- | ------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| horizon           | number  | 要求 horizon (7 or 14)                           |
| week1.peak        | number  | Day0~Day6 の最大予定レビュー数                   |
| week1.total       | number  | Week1 合計 (backlog を除く future counts の合計) |
| week2.peak        | number  | Day7~Day13 の最大 (14日未満の場合欠落)           |
| week2.total       | number  | Week2 合計 (14日未満の場合欠落)                  |
| globalPeak        | number  | 全 horizon 内最大 (peak?.count fallback 0)       |
| peakShift         | number  | week2.peak - week1.peak (14日時のみ)             |
| loadBalanceRatio  | number  | null                                             | week2.total / week1.total 両方>0 のとき (14日時のみ) 小数2桁                  |
| flattenIndex      | number  | null                                             | globalPeak / (top3Avg) (counts>=3 のとき) 小数2桁。1.00 に近いほど平坦 (均一) |
| top3Avg           | number  | null                                             | 最大上位3日平均 (counts>=3 のとき)                                            |
| secondWeekWarning | boolean | Week2 集中警告 (条件下記)                        |

計算ロジック要点:

1. 基本 0 時起点で per-day バケツ作成 (Phase 1.20 と同一) -> counts[]。
2. Week1 = counts[0..6], Week2 = counts[7..13]。
3. flattenIndex: counts を降順ソートし上位3件平均 top3Avg を計算 (>=3 件)。`flattenIndex = globalPeak / top3Avg` (1 に近い=均一 / 小さい=特定日突出)。
4. peakShift: week2.peak - week1.peak。
5. loadBalanceRatio: week2.total / week1.total (week1.total>0)。
6. secondWeekWarning 条件:
   - cond1: week2.peak >= max(8, week1.peak \* 1.25) (ピークが明確に後ろへ高騰)
   - OR cond2: loadBalanceRatio >= 1.40 (合計でも 2 週目が 40% 以上重い)

UI 仕様 (Profile / Upcoming Review Load カード):

- 7d ↔ 14d トグルボタン (localStorage: `evody:profile:loadHorizon`).
- 14d 選択時: 下部にミニ指標カード群を表示:
  - Week1: Peak / Total
  - Week2: Peak / Total (14日時のみ)
  - Balance: Shift (week2.peak-week1.peak) / W2/W1 (loadBalanceRatio)
  - Shape: Flatten (flattenIndex) / Top3Avg
  - Warning バナー (secondWeekWarning=true) → 背景 warn 色。文言: 「2週目に負荷集中の兆候…」
- What-if モーダルは初期スコープ通り 7d 想定のまま (14d 選択でも 7d で計算) — テキストで明示。

指標解釈ガイドライン:

- peakShift > 0 且つ loadBalanceRatio>=1.4 → 新カード導入を一時抑えて backlog 消化か復習時間確保。
- flattenIndex ≈ 1.0〜1.15 → 均一 (良好) / 1.15〜1.35 → 中程度集中 / >1.35 → ピーク依存が強い。
- top3Avg が daily limit や処理スループット (過去実績) を大きく上回る場合 → 先回り調整対象。

エッジケース / フォールバック:

- counts 長 <8 → week2 メトリクス欠落 (オブジェクト非生成)。
- week1.total==0 → loadBalanceRatio=null。
- counts 長 <3 → flattenIndex/top3Avg = null。
- horizon=7 でも API は Flatten 等計算 (UI では非表示許容)。

後方互換性:

- 既存 UI / 呼び出しは `getUpcomingReviewLoad` 継続利用可能 (拡張フィールド非依存)。
- 内部実装: wrapper が extended から抜粋して旧 shape を返すため重複計算なし。

将来拡張候補:

- Deck 別 14d 負荷内訳 (stacked bars)。
- secondWeekWarning 発火時に adaptive new limit 自動 -1 (cooldown) 連携。
- flattenIndex トレンド (過去 n 期間比較)。
- 期待レビュー所要時間 (反応時間 p50 \* 件数) での時間換算ピークトラッキング。
- What-if を 14d 対応し Day1 以降増分拡散モデル (初回/再復習を近似) へ拡張。

関連コード: `src/lib/reviews.ts#getUpcomingReviewLoadExtended`, `profile/page.tsx` horizon トグル & 指標表示。

テスト観点:

- horizon=14 で week2.\* と extended 指標が取得される。
- counts=全0 → flattenIndex/top3Avg=null, warning=false。
- week2Peak>=max(8, week1Peak\*1.25) で warning=true。
- loadBalanceRatio>=1.4 単独でも warning=true。
- horizon=7 選択 → UI に week2/shape セクション非表示、既存挙動維持。

Adaptive New Limit 連携 (実装済み追加ルール):

```
if (secondWeekWarning) limit -= 1  // adjustments.push({ reason: 'second-week-warning', delta: -1 })

// Deck backlog penalties (Phase 1.24+ backlog integration)
if (maxDeckBacklogRatio >= 0.40) limit -= 2 // adjustments.push({ reason: 'deck-backlog-high', delta: -2 })
else if (maxDeckBacklogRatio >= 0.25) limit -= 1 // adjustments.push({ reason: 'deck-backlog-warn', delta: -1 })
```

意図: 2週目に顕著な負荷シフト兆候が出た日に新規導入数をソフトに抑制し、第2週ピークのさらなる上昇を予防。既存 negative ルール (retention drop / variability high など) と同列に加算され、後段の clamp / smoothing フェーズを経由。

設計メモ:

- 14d 拡張負荷予測が取得できない（エラー）場合は無視 (フォールバック安全側)。
- 一過性: warning が翌日解消されれば自動で影響は消える (状態保持なし)。
- 他 negative と合算で大きく下がりすぎる場合でも 1 日変動 ±2 smoothing が緩和。

リスク / 注意:

- flattenIndex が極端 (top3Avg==globalPeak) のとき 1.00 固着し変化感度が低い → 将来 top5Avg など比較検討。
- 第二週データが少数 (例: 2 日分) の時早期警告過敏になる可能性 → 実績日数 <3 の場合 warning を遅延させる緩和オプション検討余地。
