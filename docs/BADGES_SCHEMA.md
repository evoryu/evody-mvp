# Badge Definition DSL (Draft)

目的: バッジ条件をコード変更無しで追加/調整できる宣言的フォーマットを定義し、評価エンジンが統一的に判定する。

## JSON 例 (最小)

```jsonc
{
  "id": "streak_7",
  "category": "streak",
  "title": { "ja": "7日連続学習", "en": "7-Day Streak" },
  "description": {
    "ja": "7日連続で1日1エピソード以上を達成",
    "en": "Complete at least one episode for 7 consecutive days",
  },
  "conditions": [
    {
      "type": "streak_days",
      "op": ">=",
      "value": 7,
    },
  ],
  "tier": 1,
  "repeatable": false,
  "version": 1,
}
```

## スキーマ要素

| フィールド  | 必須 | 型            | 説明                                                       |
| ----------- | ---- | ------------- | ---------------------------------------------------------- |
| id          | ✓    | string        | 一意キー (snake_case)                                      |
| category    | ✓    | string        | streak / reaction / backlog / flatten / retention / custom |
| title       | ✓    | LocaleMap     | 表示名 (言語別)                                            |
| description | ✓    | LocaleMap     | 詳細説明                                                   |
| conditions  | ✓    | Condition[]   | AND 評価 (全て満たす)                                      |
| anyOf       | -    | Condition[][] | OR グループ (少なくとも1グループ内の全条件を満たす)        |
| tier        | -    | number        | 系列内ランク (1ベース)                                     |
| repeatable  | -    | boolean       | 再取得可能 (デイリー系)                                    |
| version     | ✓    | number        | スキーマ/判定変更時にインクリメント                        |
| tags        | -    | string[]      | UI フィルタ用                                              |

### Condition 共通フィールド

| フィールド | 型      | 説明                                                      |
| ---------- | ------- | --------------------------------------------------------- |
| type       | string  | 種別 (下表)                                               |
| op         | string  | 比較演算子: >=, >, ==, <=, <, diff>= (差分), pct>= (割合) |
| value      | number  | しきい値                                                  |
| windowDays | number? | 集計ウィンドウ (7/14/30)                                  |
| deckScope  | string? | 特定 deckId または "all"                                  |

### Condition 種別 (初期)

| type                 | 対象         | 説明                                      |
| -------------------- | ------------ | ----------------------------------------- |
| streak_days          | Streak日数   | current streak を op で判定               |
| backlog_drop         | backlog      | (previous backlog - current backlog) 判定 |
| reaction_p50_improve | Reaction p50 | 過去 windowDays vs 現在 比率改善          |
| tail_index_low       | Tail Index   | window 平均 TI <= value                   |
| flatten_low          | Flatten      | Flatten <= value 期間維持                 |
| retention_rate       | Retention%   | Good/Easy% >= value                       |
| efficiency_score     | Efficiency   | 現在スコア >= value                       |
| episodes_total       | Episodes     | windowDays 内 episodes >= value           |

## 評価アルゴリズム (概要)

1. 最新データスナップショット構築 (streak / backlog / reaction stats / retention / efficiency)。
2. すべての badge definition を走査。
3. `conditions` (AND) 判定後、`anyOf` が存在する場合は OR グループ (ネスト配列) のいずれか 1 グループ全条件成立を確認。
4. 取得済みバッジと比較し、新規 or version 更新を返す。

擬似コード:

```ts
function evaluateBadges(
  defs: BadgeDef[],
  ctx: MetricsCtx,
  ownedIds: string[],
): Award[] {
  const awards: Award[] = []
  for (const def of defs) {
    if (!def.repeatable && ownedIds.includes(def.id)) continue
    if (def.conditions.every((c) => check(c, ctx))) {
      awards.push({ id: def.id, tier: def.tier, version: def.version })
    }
  }
  return awards
}
```

## メトリクスコンテキスト (MetricsCtx)

```ts
interface MetricsCtx {
  streakDays: number
  backlog: { current: number; previous?: number }
  reaction: { p50Trend7d: number; tailIndex7dAvg: number }
  flatten: { global: number }
  retention?: { goodEasyPct: number }
  efficiency?: { current: number }
  episodes: { last7d: number; last30d: number }
  timestamp: number
}
```

## anyOf 例

```jsonc
{
  "id": "balanced_reaction",
  "category": "reaction",
  "title": { "ja": "反応バランス" },
  "description": {
    "ja": "p50改善>=12% または TailIndex<=1.40 を達成し 7d Retention>=80%",
  },
  "conditions": [{ "type": "retention_rate", "op": ">=", "value": 80 }],
  "anyOf": [
    [{ "type": "reaction_p50_improve", "op": ">=", "value": 0.12 }],
    [{ "type": "tail_index_low", "op": "<=", "value": 1.4 }],
  ],
  "version": 1,
}
```

評価フロー: retention 条件が真 AND ( p50改善グループ OR tail index グループ ) が真。

## Retention バッジ階層 (Tiers)

7日リテンション率 (Good+Easy%) は学習品質の代表指標。段階的に目標閾値を設け達成感の細分化を行う。

| バッジID         | 閾値(>=) | Tier | 日本語タイトル | 英語タイトル    | 意図               | 備考                     |
| ---------------- | -------- | ---- | -------------- | --------------- | ------------------ | ------------------------ |
| `retention_85`   | 85%      | 1    | 堅実な定着率   | Solid Retention | “基礎を固めた”     | 最初の品質到達ライン     |
| `retention_high` | 90%      | 2    | 高い定着率     | High Retention  | “継続と定着の両立” | 以前の単独バッジを再分類 |
| `retention_95`   | 95%      | 3    | エリート定着率 | Elite Retention | “ほぼ完全”         | 変動が大きく維持が難しい |

設計ポリシー:

1. 閾値差は 5% 刻み (学習負荷/確率要因の変動で達成/未達がランダム化しすぎない幅)
2. Tier は 1 ベース昇順 (難度上昇) で UI 表示に直接利用
3. より細かい >95% (例: 97%, 98%) は初期 MVP では導入せず後で “上位レジェンド” 系列として別カテゴリ化を検討

### JSON 例 (全階層)

```jsonc
// Tier1
{
  "id": "retention_85",
  "category": "retention",
  "title": { "ja": "堅実なリテンション" },
  "description": { "ja": "7日リテンション率 (Good+Easy%) 85%以上を達成" },
  "conditions": [{ "type": "retention_rate", "op": ">=", "value": 85 }],
  "tier": 1,
  "version": 1
}

// Tier2
{
  "id": "retention_high",
  "category": "retention",
  "title": { "ja": "高リテンション" },
  "description": { "ja": "7日リテンション率 (Good+Easy%) 90%以上を達成" },
  "conditions": [{ "type": "retention_rate", "op": ">=", "value": 90 }],
  "tier": 2,
  "version": 1
}

// Tier3
{
  "id": "retention_95",
  "category": "retention",
  "title": { "ja": "エリートリテンション" },
  "description": { "ja": "7日リテンション率 (Good+Easy%) 95%以上を達成" },
  "conditions": [{ "type": "retention_rate", "op": ">=", "value": 95 }],
  "tier": 3,
  "version": 1
}
```

`retention_rate` は評価時点の 7d Rolling Retention (Good+Easy)/(total-Again) を % 化した値 (0-100) を使用。UI 表示時は整数% で丸め。

## 今後拡張

- 時間帯条件 (peakHour 学習)
- 連鎖バッジ (前提バッジ獲得済みで有効化)
- デバイス属性 (mobile only) 条件

## 運用フロー

1. `badges/*.json` に定義を追加
2. `npm run validate:badges` で JSON スキーマ検証 + id 重複チェック (生成スクリプト内)
3. `npm run generate:badges` 実行で `src/lib/badges-registry.generated.ts` を再生成
4. アプリコード側で `ensureGeneratedBadgesLoaded()` を初期化時に awaitして登録
5. Episode 保存 or 日次ロールで再評価

### 永続化 & 通知 (MVP 実装)

- 永続化キー: `localStorage: evody:badges`
- 取得データ構造: `Array<{id, tier?, version, awardedAt}>`
- ロード: `BadgesProvider` 初期化時に読み込み
- 再評価トリガ: 初回マウント + points 変化(300ms debounce) で `evaluateBadges`
- 新規獲得: 既存 set に無い id をマージ → 保存 → Toast (`Badge獲得: <title.ja>`) 表示
- streakDays: episodes 履歴から `getCurrentStreakDays()` で実計算済
- backlog: `getBacklogSnapshot()` により nextDue <= now のカード件数を current として計測 (previous は前回 snapshot の current 値)
- reaction: `getReactionMetricSnapshot()` により直近7日 p50 速度改善率 (`p50Trend7d`) と tail index 平均 (`tailIndex7dAvg`) を算出

将来拡張: version 差分検知 / 再獲得履歴 / multi-locale toast / anyOf 条件対応

### スクリプト / 出力

| コマンド                  | 目的                                       | 出力/動作                              |
| ------------------------- | ------------------------------------------ | -------------------------------------- |
| `npm run validate:badges` | スキーマ整合性 + 重複idチェック (生成なし) | エラー時 exit 1                        |
| `npm run generate:badges` | 検証 + TS レジストリ生成                   | `src/lib/badges-registry.generated.ts` |

生成ファイル先頭コメントに ISO タイムスタンプが付与される。VCS にはコミットし差分レビューで変更監査可能。

### 失敗パターン例

| パターン            | 例                          | 対応                            |
| ------------------- | --------------------------- | ------------------------------- |
| id 重複             | `streak_7` が 2 ファイル    | どちらか id 変更 / version 調整 |
| condition.type typo | `streak_day`                | schema enum 修正or値修正        |
| 不正 op             | `>=` 以外 (例: `=>`)        | 値修正                          |
| version 未更新      | 条件変更したが version 同じ | version++ & 変更ログ追記        |

### CI 推奨

`generate:badges` を Pull Request CI で実行し diff が未コミットなら失敗させ、定義と生成物の乖離を防止。

---

Draft v0.1

---

## 命名ガイドライン (Naming Guidelines)

バッジタイトル / 説明は以下ポリシーで作成:

1. 日本語タイトルは 12〜16 全角程度を目安に「行動 + 数値/結果」を先頭に凝縮 (例: `未処理カード10件削減`).
2. 英語タイトルは簡潔な Noun Phrase または Result Phrase (`Retention ≥90%`, `Median Reaction +15%`). 記号 `≥`, `≤`, `%` を許容。
3. シリーズ (Tier) は共通接頭辞 + 明確な閾値差分 (Retention 85 / 90 / 95)。
4. “高い/エリート” など抽象語は閾値表と対応づけて一貫性を保つ。
5. 説明文は初登場指標には最初の一文で意味を端的に補足し、2文目以降を省略可能にする (MVP 短文化)。
6. 英語説明は直訳ではなくユーザ行動ベース (`Achieved 7-day retention of 90% or higher`).
7. `リテンション` → `定着率` (JP) へ統一。EN は `Retention`。

## 条件テキスト i18n テンプレート

`labels.ts` に条件文テンプレートを登録し、Achievements UI で `${n}`, `${d}` プレースホルダを置換。

| Label Key                        | 例 (ja)                            | EN                                        | 置換値              | 備考                                      |
| -------------------------------- | ---------------------------------- | ----------------------------------------- | ------------------- | ----------------------------------------- |
| `condition_streak_days`          | `${n}日連続で学習`                 | `Studied for ${n} consecutive days`       | n=日数              |                                           |
| `condition_backlog_drop`         | `未処理カードを${n}件以上削減`     | `Reduced backlog by ${n}+ cards`          | n=件数差            | backlog_drop = previous-current           |
| `condition_reaction_p50_improve` | `反応時間中央値を${n}%以上改善`    | `Improved median reaction time by ${n}%+` | n=改善率整数%       | 内部 value は 0.12 等の比率 (→\*100 丸め) |
| `condition_tail_index_low`       | `反応ばらつき指数を${n}以下に維持` | `Kept reaction variability ≤ ${n}`        | n=閾値              |                                           |
| `condition_flatten_low`          | `Flatten指標を${n}以下`            | `Flatten metric ≤ ${n}`                   | n=閾値              |                                           |
| `condition_retention_rate`       | `定着率${n}%以上`                  | `Retention ≥ ${n}%`                       | n=整数%             | 0-100 スケール                            |
| `condition_efficiency_score`     | `効率スコア${n}以上`               | `Efficiency score ≥ ${n}`                 | n=score             |                                           |
| `condition_episodes_total`       | `${d}日間で学習回数${n}件以上`     | `${n}+ study sessions in ${d} days`       | n=回数 d=windowDays | windowDays 省略時=7                       |
| `anyof_heading`                  | `以下のいずれか`                   | `Any of the following`                    | -                   | anyOf グループ見出し                      |
| `and_joiner`                     | `かつ`                             | `AND`                                     | -                   | anyOf 内部複合条件 join                   |

レンダリング手順:

1. バッジ定義の `conditions` を AND 列挙してテンプレート置換。
2. `anyOf` が存在する場合、各グループ内条件を `and_joiner` で結合しリスト表示。
3. 見出しに `anyof_heading` を使用。

## anyOf 表示 UX ノート

- AND 基本条件 + anyOf 代替条件の両方がある場合は AND 条件を先に表示し、その下に淡色ボックスで OR ブロックをまとめる。
- 各グループは点付きリスト。グループ内複数条件はインライン連結 (冗長なネストを避ける)。
- i18n 対応: ロケールスイッチでテンプレート再評価のみ。構造変化不要。

## テストポリシー (MVP)

`npm run test:badges` で以下カテゴリを網羅:

- AND 条件成立/不成立
- anyOf 単一成立 / 複数成立 / 不成立
- backlog 差分計算 (previous-current)
- reaction 改善率 (0.10 = 10%)
- episodes_total windowDays 分岐 (7d vs 30d)

将来: version 変化差分テスト / 重複 ID 検出 / JSON スキーマ回帰。

## 将来ドキュメント分割案

- `BADGES_SCHEMA.md`: 機械的スキーマ・評価仕様 (現行)
- `BADGES_GUIDE.md`: 文言/命名/UX ガイド + 例集 + モチベーションデザイン原則
- `BADGES_CHANGELOG.md`: バッジ追加/閾値変更履歴 (version 差分)
