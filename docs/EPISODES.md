# Episodes

学習セッション(Quick / Deck)を **Episode** としてローカルに記録し、日次の学習量や正答率を即座に把握できるようにする最初のフェーズ実装です。現状は localStorage のみで永続化し、将来的な SRS(Spaced Repetition) / 共有フィード投稿 / 実績バッジ付与などの拡張を見越した最小データ構造になっています。

## 目的

- 日々「どれくらい学習したか」を即時フィードバック
- Gamification (ポイント, 連続記録, バッジ) の土台
- 後続フェーズでの SRS スケジューリング対象データ確保
- 学習完了時の自動フィード投稿(将来)のテンプレソース

## データモデル

`src/lib/episodes.ts`

```ts
export type Episode = {
  id: string
  kind: 'quick' | 'deck' | 'review'
  deckId?: string
  startedAt: number
  finishedAt: number
  correct: number
  incorrect: number
  points: number
}
```

### 最小フィールドの意図

- `startedAt / finishedAt`: セッションの長さや将来の集中度指標(秒数/カード)計算根拠
- `correct / incorrect`: 正答率、後続の間隔調整アルゴリズム用基礎統計
- `points`: UI の即時フィードバック・報酬計算とランキング用
- `kind / deckId`: 集計セグメント (Quick vs Deck / デッキ別進捗)

### localStorage Key

```
evody:episodes
```

配列(JSON文字列)として永続化。クォータ超過は握りつぶし(ユーザ向けUIで警告追加は将来拡張)。

## 提供API

```ts
saveEpisode(ep: Omit<Episode,'id'> & { id?: string }): Episode
listEpisodes(): Episode[]                     // 新しい順
listTodayEpisodes(now?: number): Episode[]
getStatsForToday(now?: number): TodayStats
```

`TodayStats`:

```ts
{
  episodes: number
  cards: number
  correct: number
  incorrect: number
  accuracy: number // 0..1
  points: number
}
```

## UI統合点

- Quick学習ページ: 完了時に `saveEpisode({ kind:'quick', ... })`
- Deck学習ページ: 完了時に `saveEpisode({ kind:'deck', deckId, ... })`
- Profileページ: `getStatsForToday()` で日次統計 (エピソード数 / 正答率 / カード数 / 日次ポイント)

### 自動ソーシャル投稿 (オプション)

`localStorage` キー `evody:autoPostEpisodes` が `"1"` のとき、セッション完了時に `formatEpisodePost(ep)` で生成した本文を `SocialContext` へ投稿します。

本文例:

```
Quick学習を完了: カード 5枚 / 正答率 80% / +24pt #evody
```

実装要点:

- SocialProvider 下であれば即座にフィードへ反映
- Provider 外では try/catch で安全に無視
- 投稿フォーマッタ: `formatEpisodePost(ep)` (cards枚数と正答率、ポイントを含む)
- 設定UI: `Profile` ページ内チェックボックス

### Streak 計算

API: `getStreak(): { current: number; longest: number; lastActive: string | null }`

アルゴリズム概要:

1. `listEpisodes()` から `finishedAt` を日付キー(YYYY-MM-DD)へ正規化し Set 化
2. 今日の日付から 1日ずつ減算し存在する限り `current` を加算 (今日未活動なら昨日終端の連続を計測)
3. 全ユニーク日付を昇順走査し、隣接差分が 1日の runs を集計して `longest` 更新
4. 最新活動日は降順ソート先頭を `lastActive`

注意点:

- タイムゾーンはブラウザローカル (UTCオフセット差異は現状非考慮)
- 同一日に複数 Episode があっても1カウント
- 今日未活動の場合、`current` は「昨日で途切れていない連続日数 (今日を含まない)」

### Heatmap (30日アクティビティ)

API: `getDailyActivity(days=30)` → 直近 N 日の `{ date, episodes, cards, points }` を返す。

UI: `ActivityHeatmap` コンポーネント (Profile 下部)

- 強度: 基本は `points` 正規化 (全日ゼロなら episodes でフォールバック)
- 5段階バケット: 0 (活動なし) / 1 / 2 / 3 / 4
- グラデーション: 既存アクセント/情報/成功/警告系トークンを段階的に使用

今後の拡張案:

- ツールチップに平均正答率追加 (集計に correct/incorrect を含める拡張)
- クリックで日別Episode一覧モーダル
- 週区切りレイアウト (7列 × 週数) への変換オプション

## 現状の制限

- SSR不可 (window依存)。サーバ同期なし。
- 同時タブ学習での競合検知なし (後でロック/マージ戦略検討)。
- Episode内にカードID列挙なし → 将来 SRS 実装でカードログテーブルを別途追加予定。

## フェーズ別拡張ロードマップ

| フェーズ       | 目的         | 追加データ/処理                                      |
| -------------- | ------------ | ---------------------------------------------------- |
| Phase 1 (現状) | 日次把握     | Episode最小統計                                      |
| Phase 2        | SRS基盤      | per-card review log, nextDue計算, interval/ease 指数 |
| Phase 3        | Gamification | streak計算, badge発行, milestone通知                 |
| Phase 4        | Social連携   | 完了Episodeから自動投稿テンプレ生成, ハイライト共有  |
| Phase 5        | 分析         | 週/月ヒートマップ, ピーク時間帯分析                  |

## 次のステップ案

1. Streak算出ユーティリティ追加 (date gap で途切れ判定)
2. Feed自動投稿: `"今日 Quick を 5カード 100% 正答"` などのテンプレ化
3. SRS Phase 2 のため `review_logs` スキーマ草案作成
4. プロフィールに週間チャート (sparklines) 追加

---

改善や仕様拡張のアイデアは `docs/TODO.md` へ追記してください.

## Review Episode (Phase 1.9)

SRSレビューセッション完了時も Episode として保存:

フィールド:

- kind: 'deck' (暫定。将来 'review' 専用種別導入予定)
- correct / incorrect / points: セッション内集計
- startedAt / finishedAt: 最初のレビュー時刻～最後にカードを消化した時刻

トリガー:

- `/review` ページでキューを最後まで処理したタイミングで保存
- 新しい due カードがゼロ → 自動導入 → 次バッチ開始で Episode カウンタ初期化

今後:

- kind: 'review' を追加し学習ページ Episode と区別
- deckId / 複数デッキ混在時の集計方式 (現状undefined)
- 平均反応時間 / Again率 スナップショット追加

### kind: 'review'

レビューセッション専用種別を追加 (以前は暫定的に 'deck' として保存していた)。

互換:

- 既存データ: kind が 'deck' かつ deckId undefined で correct+incorrect>0 のものは過去の review と推定可能 (必要ならマイグレーション関数で変換)

表示 / 投稿:

- formatEpisodePost は 'レビューセッション' として文言生成

今後:

- review Episode へ retention/againRate スナップショット追加
- セッション長 (分) / 平均回答時間 指標拡張
