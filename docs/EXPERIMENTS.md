# Experiments (A/B) Skeleton Guide

本ドキュメントは現在実装されている軽量 A/B (実験) インフラの概要と、今後の拡張ロードマップを示します。

---

## 1. 目的

- UI / UX / アルゴリズム変更のインパクトを段階的に検証する枠組み
- 実装コスト最小のまま、将来のイベント収集 / 分析基盤へ拡張可能な構造
- デターミニスティック (同じ subject は同じ variant) で再現性を担保

##### ブラウザ終了時の取りこぼし低減

- `visibilitychange`(hidden), `pagehide`, `beforeunload` で即時 flush を試行します。
- 可能なら `navigator.sendBeacon` を使い、成功時はバッファをクリアして backoff 状態をリセットします。
- Node/テスト環境や beacon 不可な環境では通常フローでの flush を呼び出し、再送に委ねます。

## 2. 現状コンポーネント

| レイヤ           | ファイル                      | 役割                                                                   |
| ---------------- | ----------------------------- | ---------------------------------------------------------------------- |
| Registry         | `src/lib/experiments.ts`      | 実験定義の登録 (`defineExperiment`) と取得                             |
| Assignment       | `src/lib/experiments.ts`      | FNV-1a ハッシュで 0..1 の値を生成し variant index を決定               |
| Exposure Hook    | `src/lib/use-experiment.tsx`  | React クライアントで初回マウント時に variant を確定し 1 回だけ露出ログ |
| Tests            | `src/lib/experiments.test.ts` | 決定論 (同 subject -> 同 variant) / disabled 実験の null を検証        |
| Aggregated Tests | `src/lib/all-badge-tests.ts`  | バッジ系とまとめて CI 実行                                             |
| CI Validation    | `scripts/ci-validate.ts`      | バッジ検証 + テスト + 実験キー重複チェック                             |

## 3. 実験定義 API

```ts
interface ExperimentDef {
  key: string // 一意キー (重複は CI で検出)
  variants: string[] // 例: ['control','A','B']
  enabled?: boolean // false の場合 getAssignment は null を返す
  hashSalt?: string // 同じ subject でも他実験と独立性を高めるオプション
}
```

登録:

```ts
defineExperiment({
  key: 'new_ui_header',
  variants: ['control', 'compact'],
  hashSalt: 'ui_v1',
})
```

取得:

```ts
const assignment = getAssignment('new_ui_header', subjectId) // => { key, variant, index } | null
```

## 4. ハッシュ割当ロジック

- FNV-1a 32bit -> 0..1 に正規化
- `hashSalt + ':' + key + ':' + subjectId` を入力文字列に
- `value = hash / 2^32`
- `index = floor(value * variants.length)`
- `assignment.index` と `assignment.variant` を返却
- disabled or 未登録 -> null

利点: ランタイム状態不要 / サーバ不要 / 100% 再現可能 / ローカルでも同一判定

## 5. Hook 利用方法 (`useExperiment`)

```tsx
const { variant } = useExperiment('new_ui_header')
if (variant === 'compact') {
  return <CompactHeader />
}
return <LegacyHeader />
```

### 5.1 subjectId の決定

現在は匿名 subject を localStorage に保存 (例: `exp:subject`). 未存在なら UUID 代替のランダム文字列生成。

### 5.2 Exposure ログ

- 初回マウント時に 1 回だけ `window.dispatchEvent(new CustomEvent('experiment:exposed', { detail: { key, variant } }))` を発火
- まだ持続的な収集先は未実装 (将来: beacon/API 経由)
- 追加: 発火と同時に軽量バッファ (`experiments-analytics.ts`) に蓄積され、最大50件または5秒ごとに flush
  - flush 手段: `navigator.sendBeacon('/__exp_exposure', json)` が利用可能なら送信、なければ `console.info` ログにフォールバック
  - 強制即時送信: `flushExposuresNow()` を呼び出し可能 (テスト / デバッグ)
  - バッチ payload 例 (exposure + conversion 混在):
    ```jsonc
    {
      "type": "experiment_events",
      "events": [
        {
          "type": "exposure",
          "key": "progress_detail_format",
          "variant": "variantB",
          "ts": 1730000000000,
        },
        {
          "type": "conversion",
          "key": "progress_detail_format",
          "metric": "clicked_cta",
          "variant": "variantB",
          "value": 1,
          "ts": 1730000000500,
        },
      ],
    }
    ```

### 5.3 Conversion イベント (Prototype)

`recordConversion(key, metric, { variant?, value? })` で同一バッファへ格納。

| フィールド | 必須 | 説明                               |
| ---------- | ---- | ---------------------------------- |
| type       | ✓    | `conversion`                       |
| key        | ✓    | 実験キー                           |
| metric     | ✓    | イベント名 (例: `clicked_cta`)     |
| variant    | -    | その時点の variant (任意)          |
| value      | -    | 数値指標 (例: 所要秒 / スコアなど) |
| ts         | ✓    | epoch ms                           |

設計指針:

1. variant を渡さない場合は後段集計で最新 exposure を紐付ける想定
2. value は数値のみ (文字列化は後段 ETL に委譲)
3. 送信失敗時もローカル再送は未実装 (今後: リトライ or IndexedDB キュー)

### 5.4 バッファ永続化 / リトライ / TTL / クリア機構 (現行仕様)

`experiments-analytics.ts` はクライアント (ブラウザ) で以下を実装済みです:

| 機能カテゴリ        | 項目                | 挙動 / 値                                                                         |
| ------------------- | ------------------- | --------------------------------------------------------------------------------- |
| 永続化              | ストレージキー      | `localStorage`: `exp.events.buffer.v1`                                            |
| 永続化              | 保存タイミング      | イベント追加毎 / flush 試行後                                                     |
| 復元                | 起動時復元          | 初期ロードで parse -> 有効イベント再投入 (直後に TTL prune)                       |
| Flush 条件          | 自動間隔            | 最初のイベント追加から 5 秒後 / 以降はイベント追加毎にスケジュール (同時多重なし) |
| Flush トリガ        | サイズ閾値          | 50 件以上で即時 `doFlush`                                                         |
| Flush 手段          | 成功判定            | `navigator.sendBeacon` が存在し `sendBeacon()` が true を返すと成功               |
| Flush 失敗          | フォールバック      | beacon 不可/失敗時: コンソールにログしイベントを再度バッファ先頭へ戻す            |
| リトライ (Backoff)  | 遅延シーケンス      | 8s → 30s → 2m → 5m → 10m (指数的増加 / 上限 5 段階)                               |
| リトライ            | 上限 / リセット条件 | 5 回で打ち止め (以後は 10m で待機継続) / 成功 flush で attempt=0 にリセット       |
| TTL                 | 期限                | 24h 経過イベントは prune 対象                                                     |
| TTL                 | prune タイミング    | 1) 復元直後 2) イベント追加前 3) flush 実行直前                                   |
| 手動クリア          | クエリ              | `?exp.clear=1` で即時バッファ + localStorage 削除 (起動1回判定)                   |
| 強制成功 (テスト用) | フラグ              | `_forceFlushSuccessForTest(true)` で beacon 依存せず成功扱い & backoff リセット   |
| テスト支援          | 内部ヘルパ          | `_resetForTest`, `_getRetryAttempt`, `_computeBackoffDelayForTest` など           |

注意点 (現行):

1. 配信保証は "at least once" で重複排除なし → 解析側で idempotent 処理必須。
2. TTL 超過イベントは静かに破棄されるため、24h 以上遅延した送信は欠損として扱われる。
3. 長時間通信失敗 (例えばネットワーク規制) の場合、最大間隔 10 分で一定の再試行が継続 (上限 attempt 到達後もバッファ保持)。
4. Beacon が常に利用不可な環境 (テスト / 一部 WebView) では永続的に失敗パス → backoff 最大間隔で再試行スケジュール。
5. Force Success フラグはデバッグ / テスト専用。プロダクションコード経路での常用は禁止 (計測欠落リスク)。

今後の主な改善候補 (未実装):

- イベントユニーク ID + 重複除去
- IndexedDB (大容量 & トランザクション) 移行
- visibilitychange / pagehide / beforeunload 時の最終 flush
- 送信エンドポイント (認証付き API) + 成功レスポンスベースの ACK
- バッファ圧縮 (gzip / content-encoding) 対応
- Backoff 上限到達後のユーザ操作 (新規イベント) で attempt リセット戦略検討
- オーバーライド使用中インジケータ UI

#### デバッグ用強制成功フラグ (開発 / テスト)

テストや挙動検証で「正常 flush (バッファ消去)」パスを強制したい場合、内部ヘルパ `_forceFlushSuccessForTest(true)` を利用できます。これにより `navigator.sendBeacon` 有無に関わらず flush 時にイベントは再キューされず空になります。開発ビルドのみに限定し、本番コードパスでは使用しない想定です。

#### バッファ手動クリアクエリ

ローカル/QA で蓄積済みイベントを即座に破棄したい場合、URL に `?exp.clear=1` を付与してアクセスすると、ロード時にバッファと `localStorage('exp.events.buffer.v1')` が消去されます。

例:

```
http://localhost:3000/achievements?exp.clear=1
```

注意: 本番環境では意図せず計測漏れを起こすリスクがあるため運用ポリシー上は使用制限を推奨 (必要ならビルド時ゲート追加予定)。

#### イベント TTL (24h 自動破棄)

バッファ内イベントは `ts` が 24 時間より古い場合、次のタイミングで自動的に削除(prune)されます:

1. モジュール初期ロード時の localStorage 復元直後
2. 新規イベント追加 (`recordExposure` / `recordConversion`) 前
3. flush 実行直前

目的: 数日放置されたタブからの非常に古い exposure/conversion が遅れて送信され統計を歪めることを防止。

注意点:

- 24h を跨ぐロングラン比較が必要な場合は TTL を環境変数化 or off ビルドを検討。
- prune は in-place で行い、削除後ただちに永続化を行うためストレージ肥大を抑制します。

## 6. CI 保護

`scripts/ci-validate.ts` で以下を強制:

1. 実験キー重複チェック (正規表現スキャン)
2. テストスイート通過 (deterministic / disabled)

重複時に CI 失敗するため PR レビュー前に検知可能。

## 7. 命名規約 (Proposal)

| 目的           | 推奨プレフィックス例 | 例                    |
| -------------- | -------------------- | --------------------- |
| UI 表示差分    | `ui_`                | `ui_header_compact`   |
| 表示順序/配置  | `layout_`            | `layout_streak_block` |
| 推薦ロジック   | `algo_`              | `algo_sort_v2`        |
| プロンプト文言 | `copy_`              | `copy_empty_state`    |

短く、意味対象 + 変更軸 + バージョン (必要に応じ `_v2`)。

## 8. 今後の拡張ロードマップ

| フェーズ | 内容                 | 概要                                             |
| -------- | -------------------- | ------------------------------------------------ |
| P1       | 手動オーバーライド   | `?exp.new_ui_header=A` で強制割当 (dev/QA)       |
| P1       | Exposure バッチ収集  | listener で配列蓄積 -> `navigator.sendBeacon`    |
| P2       | イベントスキーマ整備 | exposure + conversion を統一 JSON 形式に         |
| P2       | Conversion API       | 指標イベント送信用薄いエンドポイント             |
| P3       | 統計モジュール       | シンプルな Welch t-test / proportion test helper |
| P3       | 終了/Archive 状態    | `archived` フラグで UI 非表示 / 割当停止         |
| P4       | 分割トラフィック調整 | variants ごとの weight サポート                  |
| P4       | 多変量 (MVT)         | 複数 experiment の組合せ最適化補助               |

## 9. 既知の制限 (最新実装ベース)

| 項目               | 現状/実装状況                                    | リスク/課題                                               |
| ------------------ | ------------------------------------------------ | --------------------------------------------------------- |
| Weight             | 実装済 (静的配列)                                | 動的再配分不可 / rollout シナリオで再デプロイが必要       |
| subject source     | localStorage 匿名 ID                             | 端末/ブラウザ切替で別 ID / Cookie クリアで再割当          |
| Exposure 永続化    | localStorage バッファ + リトライ (at least once) | 重複送信 / 24h 超過イベントは破棄で欠損の可能性           |
| Override           | URL + 永続化 + prod gate                         | 過剰利用で統計歪み (prod gate が適切設定されない場合)     |
| Conversion         | API (recordConversion) バッファ統合              | 価値集計は未導入 / 同一 metric 定義重複整合性は利用者任せ |
| 重複排除 (dedupe)  | 未実装                                           | 回線不安定時に多重カウント                                |
| Backoff 戦略       | 指数 (8s→30s→2m→5m→10m) 上限5回                  | 長期恒常失敗で 10m 間隔継続 / 手動介入必要                |
| イベント TTL       | 24h で自動破棄 (prune)                           | 長期オフライン >24h の履歴は送信されず欠損                |
| 安全な終了フック   | visibilitychange / beforeunload 未使用           | タブ閉鎖直前のイベント取りこぼし                          |
| 多変量最適化 (MVT) | 未実装                                           | 複合交互作用の探索不可                                    |
| 統計分析           | 未実装 (t-test / 比率検定 予定)                  | 判断を人手に依存                                          |

## 10. 推奨運用フロー (暫定)

1. 実験キー設計 & 命名レビュー
2. `experiments.ts` へ `defineExperiment` を追加
3. UI に `useExperiment` 適用 (ガード付け替え最小化)
4. `npm run ci:validate` (重複 + テスト確認)
5. Exposure listener (開発者ツール) でイベント目視
6. 結果判断基準/観測指標 (手動) を記録 (Notion 等)
7. 終了後: キー削除 or `enabled:false`

## 11. FAQ

**Q. disabled にした実験の古い variant は?** 次回 `getAssignment` で null → UI はデフォルトへフォールバック。

**Q. variant が増えると以前の割当はどうなる?** 配列長変更で境界が再計算されるため Historical 一貫性は崩れる。増減する場合は新しいキーで再定義推奨。

**Q. subjectId の規模上限?** 32bit ハッシュ使用なので理論上衝突は低頻度。高規模化で UUIDv4 ↔ numeric mapping など最適化可。

---

Draft v0.1

---

## Appendix: 手動オーバーライド (実装済み)

`?exp.<experimentKey>=<VariantName>` で URL クエリから強制適用できます。

| 項目     | 詳細                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| 適用範囲 | ブラウザでフックが走るページ遷移時毎に判定 (SSR では無効)                           |
| 優先順位 | オーバーライド > disabled フラグ > ハッシュ割当                                     |
| 無効値   | 指定 variant が `variants` に存在しない場合は無視                                   |
| ログ     | コンソールに `[experiment] override applied: key -> variant` を一度表示             |
| Prod制御 | `NODE_ENV==='production'` では `NEXT_PUBLIC_ALLOW_EXP_OVERRIDE=true` が無い限り無効 |

無効化された実験 (`enabled:false`) であっても、QA 目的の一時確認のため override 指定があればその variant が返されます (ハッシュ計算スキップ)。

例:

```
https://localhost:3000/achievements?exp.progress_detail_format=variantB
```

### 追加サポート (実装済み)

| 機能                       | 使い方 / 仕様                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 複数指定 (individual keys) | `?exp.progress_detail_format=variantB&exp.onboarding_copy_test=variantA`                                    |
| 複数指定 (list style)      | `?exp=progress_detail_format:variantB&exp=onboarding_copy_test:variantA` (複数 `exp` パラメータ)            |
| 永続化                     | 有効 override 適用時 `localStorage.setItem('exp.override.<key>', variant)` 保存。以後クエリが無くても再利用 |
| 本番ゲート                 | `NEXT_PUBLIC_ALLOW_EXP_OVERRIDE=true` が無い production では URL / 永続値とも無効                           |
| disabled 優先              | override > disabled > hash (disabled でも override 指定あれば適用)                                          |

### 今後の拡張候補

- 永続化 TTL / 失効 (ビルド番号差異でリセット)
- 明示的クリア用デバッグパラメータ `?exp.clear=1`
- override 使用中の UI インジケータ (バナー / コンソール warn)
- weight TTL / ダイナミック再配分 (段階 rollout)

---

## Appendix: 実験アナリティクス テストの実行方法 (追加)

ローカルで実験アナリティクスのスモークテストを一括実行するには次を利用します。

実行:

```bash
npm run test:experiments
```

内部では Node に `ts-node` を事前ロードし、`src/lib/run-experiments-tests.cjs` から以下の TS テストを順次実行します:

- `experiments.analytics.test.ts` (バッファ蓄積/即時フラッシュ)
- `experiments.analytics.persistence.test.ts` (localStorage 永続化/復元)
- `experiments.analytics.ttl.test.ts` (24h TTL prune)
- `experiments.analytics.backoff.test.ts`（指数バックオフと上限キャップ/成功時リセット）
- `experiments.analytics.exit-flush.test.ts`（exit/visibility 経路の挙動）
- `experiments.analytics.force-success.test.ts`（強制成功フラグでの成功パス）

補助フラグ:

- `_forceFlushSuccessForTest(true)`: beacon 有無に関わらず flush を成功扱いにし、バッファを空にして backoff をリセット。
- `?exp.clear=1`: ブラウザでロード時にバッファと localStorage のイベントを消去。

CI では `scripts/ci-validate.ts` から上記ランナーを呼び出すため、PR 時にも自動実行されます。
