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
