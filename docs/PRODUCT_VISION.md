# evody Product Vision / Final Spec (Draft v0.1)

> この文書は最終形を見据えた包括的仕様ドラフトです。現状実装済み要素は ✓、計画中は (計画)、将来拡張は (将来) と表記。

## 1. プロダクトビジョン

学習負荷と集中状態を“見える化”し、導入ペース・休憩判断・習慣化を自己最適化できるゲーミフィケーション一体型学習プラットフォーム。負荷予測 (What-if)、注意喚起 (Focus / Warning)、行動ブースト (Points / Streak / Social) を統合し「過負荷→離脱」を防ぎ継続を最大化する。

## 2. ペルソナ & ユースケース

| ペルソナ                   | 目的                      | ユースケース例                               |
| -------------------------- | ------------------------- | -------------------------------------------- |
| 忙しい社会人               | スキマ効率 / 過負荷回避   | 出社前 10分で Peak/Backlog 確認→追加枚数決定 |
| 受験/資格ストイック層      | 最適導入 / 精緻な負荷制御 | Chained ON で +15 と +10 シミュ比較          |
| 習慣化初心者               | 継続動機                  | Streak/Heatmap を見て毎日短時間学習          |
| 共有志向クリエイター(将来) | Deck 公開 & 反応取得      | Deck 公開→フォロワーへ更新通知               |

## 3. コア価値と測定指標

| 価値       | 説明                   | 指標 (例)                                          |
| ---------- | ---------------------- | -------------------------------------------------- |
| 負荷透明性 | 未来レビュー量を可視化 | Peak, Median, Backlog%, Balance, Shift, Flatten    |
| 集中維持   | 認知負荷高騰を早期検知 | Reaction p50/p90, Tail Index, Focus Alert 発火回数 |
| 習慣化     | 継続行動の促進         | 7d 活動率, Streak 長, Weekly Active                |
| 最適導入   | 過少/過剰の回避        | Simulation 利用率, New Card Accept/Decline 率      |
| 学習効率   | 時間あたり成果         | (Points / TimeLoad) \* RetentionFactor (将来)      |

## 4. 機能ピラー

- Learn: Deck / Card 学習, Review (SRS 基礎 → FSRS) (段階)
- Optimize: What-if (+Deck / Chained / EarlyRetry / TimeLoad), Multi-scenario (将来)
- Insight: Reaction Trend, Tail Index, Balance, Shape, Second Week Warning
- Gamify: Points ✓, Level ✓(暫定), Streak ✓, Badges(将来), Quests(将来), Ranking(将来)
- Social: Feed 設計, Post/Like/Follow (設計済), コメント/通知(将来), Deck公開(将来)
- i18n: JA/EN Key Parity ✓, EN 自然化 (計画), 他言語 (将来)
- A11y/UX: InfoHint Phase A–C ✓ / Phase D (reduce-motion) (計画)
- Extensibility: Import/Export, Plugin (将来)

## 5. ドメインモデル (概要最終像)

```
User
 ├─ Profile(pref, badges[], settings)
 ├─ Deck(id, name, tags[])
 │    └─ Card(id, front, back, difficulty?, stability?)
 ├─ Episode(id, kind, deckId?, startedAt, finishedAt, correct, incorrect, points, p50?, p90?)
 ├─ ReviewLog(id, cardId, deckId, grade, reactionTimeMs, nextDue, interval, ease, stability?, difficulty?)
 ├─ SimulationSnapshot(id, params, deltas, createdAt)
 ├─ Post(id, userId, body, createdAt, likes[])
 ├─ FollowEdge(followerId, followeeId)
 ├─ Badge(id, category, earnedAt)
```

現状: Episode/Deck/Card/Points/Posts(予定) / Simulation(メモリ計算)。将来 ReviewLog / Snapshot / Badge 永続。

## 6. 指標カタログ (現状 + 将来)

| カテゴリ    | 指標                                                                   | 状態     | 概要                    |
| ----------- | ---------------------------------------------------------------------- | -------- | ----------------------- |
| Load        | Peak, Median, Backlog, Backlog%, Balance(W2/W1), Shift, Flatten, Shape | 多数実装 | 追加枚数判断 & 偏重検知 |
| Retry/Early | Early Retry 推定, Chain Distribution                                   | 実装     | 初期再挑戦負荷把握      |
| Time        | Time Load (中央値秒\*件/60)                                            | 実装     | 総時間見積(単純)        |
| Attention   | Reaction p50/p90, Tail Index                                           | 部分実装 | 集中度/ばらつき検知     |
| Risk Flags  | Focus Alert, Second Week Warning, Backlog Warning                      | 一部実装 | 介入トリガ              |
| Efficiency  | Efficiency Score                                                       | 将来     | 成果/時間/質 統合指数   |
| Memory      | Retention (Good/Easy%), Stability, Difficulty                          | 将来     | 忘却曲線推定            |

## 7. SRS 進化フェーズ

| フェーズ | 中核                      | 技術要素                      | 成果物               |
| -------- | ------------------------- | ----------------------------- | -------------------- |
| 1        | Episode統計 + 簡易nextDue | 固定/単純チェーン             | 日次量把握           |
| 2        | ReviewLog + SM-2近似      | ease/interval更新             | 基本忘却管理         |
| 3        | FSRS適用                  | stability/difficulty 推定     | 精緻スケジューリング |
| 4        | 個別最適化                | ML / パラメトリック再学習     | 個人化レビュー間隔   |
| 5        | 自動ペース調整            | backlogRatio / risk flag      | Auto-add/limit 提案  |
| 6        | 効率最適化                | Efficiency Score / 再優先順位 | 時間対効果向上       |

## 8. シミュレーション (現行→将来)

| 機能           | 現状                  | 将来拡張                                   |
| -------------- | --------------------- | ------------------------------------------ |
| 単発導入       | Day1 加算             | 可変初期間隔 (データ推定)                  |
| Chained        | 1/3/7 固定            | ユーザー固有分布 / 成功率条件分岐          |
| Deck 指定      | 全体集計 + deckImpact | 複数デッキ重み配分 / cluster最適化         |
| Early Retry    | Rate 近似固定         | 実測 againRate 回帰モデル                  |
| Time Load      | 中央値秒\*件          | 分布(σ) / 信頼区間 / worst-case            |
| Multi-scenario | 未                    | +10/+15/+20 並列比較                       |
| 履歴保存       | 未                    | SimulationSnapshot 永続 + 週次差分レポート |

---

(ここまでが v0.1 範囲。次 iteration で 9 以降 / ギャップ / KPI 等を追加予定)

## 次ステップ (この文書)

1. フィードバック反映 (章構成/抜け) → v0.2
2. 9. Gamification / 10. Social / 11. UX / 12. 非機能 / 13. ロードマップ / 14. KPI を追加
3. 用語集 / 未確定事項 セクション編入

## 要確認 (初回)

1. FSRS 導入タイミング: Phase 3 で合意可? それ以前に簡易強化段を挟む必要あり?
2. Multi-scenario シミュレーション優先度: Phase 2.2 位置でよいか
3. Efficiency Score の定義要素: (Points/TimeLoad)\*Retention で仮確定して良いか
4. Retention 表示: 初期は Good/Easy% で十分か (Hard/Again 逆指標は?)
5. Deck 公開 (Social) を Phase 2 後半に含めるか 3 以降か
6. AI カード生成の優先順位: “後ろ” で問題ないか
7. Early Retry モデル高度化は FSRS 前/後どちらで扱うか

フィードバック頂ければ v0.2 へ反映します。

---

## 9. Gamification 詳細 (v0.2)

| 要素                | 現状                    | 仕様(最終)                                    | メトリクス               | 補足                       |
| ------------------- | ----------------------- | --------------------------------------------- | ------------------------ | -------------------------- |
| Points              | ✓ (加算/減算)           | 行動カテゴリ別係数 (Task/Review/Combo)        | points/day, distribution | 100pt=LevelUp 維持 or 動的 |
| Level               | ✓ (floor(points/100)+1) | 区間ごと必要ポイント曲線 (指数/対数)          | level progression speed  | 進行停滞時に曲線緩和       |
| Streak              | ✓                       | 休息許容量(Grace 1日/週) 導入                 | active days ratio        | Grace 使用回数も記録       |
| Badges              | 未                      | 取得条件テーブル駆動                          | badges earned / active   | JSON 設計 (id, cond, tier) |
| Quests              | 未                      | 日次/週次: “New Cards <= X 維持”“Backlog < Y” | quest completion rate    | Mentor 提案ロジック        |
| Ranking             | 未                      | 月次ポイント / Efficiency                     | leaderboard churn        | シーズン境界リセット       |
| Efficiency Score    | 未                      | (Points/TimeLoad)\*Retention 正規化 0..100    | efficiency uplift        | Retention 係数曲線要設計   |
| Combo/Session Bonus | 未                      | 連続正答 / 時間集中                           | combo average length     | 乱用防止上限               |

### Badge 例 (初期セット案)

| カテゴリ         | ID               | 条件例                          |
| ---------------- | ---------------- | ------------------------------- |
| Streak           | streak_7         | 7日連続学習                     |
| Streak           | streak_30        | 30日連続学習                    |
| Backlog Recovery | backlog_recover  | Backlog>100 → <30 に 48h 内減少 |
| Reaction         | reaction_improve | p50 7d移動平均を 2週で 15% 改善 |
| Flatten          | flatten_master   | Flatten <=1.15 を 14日維持      |
| Retention        | retention_high   | Retention >=90% を 7日維持      |

---

## 10. Social 拡張 (v0.2)

| 段階     | 機能                    | 詳細                        | 指標                |
| -------- | ----------------------- | --------------------------- | ------------------- |
| Phase S1 | Post/Like/Follow (設計) | MVP 実装 & localStorage     | DAU feed access     |
| Phase S2 | Comments                | Post コメントツリー (1階層) | comments/post       |
| Phase S3 | Notifications           | follow / like / badge 通知  | notif open rate     |
| Phase S4 | Deck 公開               | 公開 Deck 閲覧 / フォーク   | forks/deck          |
| Phase S5 | Hashtag / Discovery     | #tag インデックス           | tagged engagement   |
| Phase S6 | Challenges              | 期間ベースタスク            | challenge retention |

#### 投稿自動化

- Episode 完了時オプション: “Quick 学習 5枚 正答率 80% +24pt #evody”
- Focus Alert 解消時: “集中回復 Day (TailIndex <1.3)” (検討)

---

## 11. UX / UI ガイド (追補)

| 原則                   | 説明                        | 運用ルール                  |
| ---------------------- | --------------------------- | --------------------------- |
| Progressive Disclosure | 初回は Essential KPIs のみ  | Advanced メトリクスはトグル |
| Visual Load Ceiling    | 1画面 主指標 <=7            | 超過でタブ分割              |
| Semantic Color Tokens  | role ベース変数のみ         | 直接 gray-500 直書き禁止    |
| Motion Respect         | prefers-reduced-motion 準拠 | scale/fade 無効化           |
| Tooltip Clarity        | 60–160 chars 簡潔           | 用語は Glossary 参照        |

### InfoHint Phase D

- reduce-motion: tail/scale の即時描画 (opacity 最小) に切替
- allowObserve prop: 大量 (50+) で observer 無効化
- viewport overflow: root bounding + parent clipping 2-pass 判定

---

## 12. 非機能要件 (NFR)

| カテゴリ            | 目標                             | KPI               | 備考                  |
| ------------------- | -------------------------------- | ----------------- | --------------------- |
| Performance         | 初回 LCP < 2.5s                  | WebVitals LCP p75 | CDN + code split      |
| Responsiveness      | INP p75 < 200ms                  | INP               | 主学習操作優先最適化  |
| Availability (将来) | 99.5%                            | uptime monitor    | MVP ローカル段階除外  |
| Data Integrity      | ReviewLog 永続後: 書込失敗 <0.1% | error ratio       | 失敗時ローカルキュー  |
| Privacy             | PII 最小保持                     | email/locale のみ | Deck 内容はユーザ管理 |
| Observability       | 主要イベント 90% ログ収集        | event coverage    | 送信失敗再送キュー    |
| i18n                | 新規キー差分検出ゼロ             | parity script CI  | PR ブロック条件       |
| Accessibility       | 主要ビュー WCAG AA               | contrast >=4.5    | 自動チェック導入      |

---

## 13. ロードマップ テーブル (ドラフト)

| 時期 | フェーズ  | マイルストン                | 主要成果                     |
| ---- | --------- | --------------------------- | ---------------------------- |
| Q1   | 1.x → 2.0 | ReviewLog 基盤              | SM-2 近似 / 基本 retention   |
| Q2   | 2.1–2.3   | Multi-scenario / Badges v1  | Simulation 比較 / 初期バッジ |
| Q2   | 2.4–2.6   | Social S2/S3                | Comments / Notifications     |
| Q3   | 3.0       | FSRS / Efficiency Score     | 安定化 + 効率指標導入        |
| Q3   | 3.1–3.2   | Deck 公開 / Discovery       | 公開/検索 + Hashtag          |
| Q4   | 3.3–3.4   | Auto Pace / Challenges      | 自動導入提案 / チャレンジ    |
| Q4+  | 4.x       | Plugin / Advanced Analytics | 拡張API / 忘却曲線分析       |

---

## 14. KPI 定義 (初期セット)

| KPI                   | 定義                                | 取得頻度 | 仮ターゲット |
| --------------------- | ----------------------------------- | -------- | ------------ |
| 7d Retention (行動)   | 過去7日中 ≥1 Episode ユーザ率       | 日次     | 40%→60%      |
| Backlog High User%    | Backlog > X のユーザ割合            | 日次     | <20% 維持    |
| Simulation Usage%     | 週1回以上シミュ実行ユーザ率         | 週次     | 30%          |
| Focus Alert Rate      | Alert発火ユーザ/全学習ユーザ        | 週次     | 15% 未満     |
| Streak Median         | 有効ユーザの Streak 中央値          | 週次     | 5日→10日     |
| Efficiency Score p50  | (Points/TimeLoad)\*Ret 正規化中央値 | 週次     | 55→70        |
| Deck Balance Healthy% | Balance 1.0–1.3 範囲ユーザ割合      | 週次     | 70%          |
| Tail Index High%      | TI>1.6 ユーザ割合                   | 週次     | <10%         |

---

## 15. 用語集 (抜粋 v0.2)

| 用語                | 定義                             | 補足                 |
| ------------------- | -------------------------------- | -------------------- |
| Peak                | 期間内最大日次予定レビュー数     | What-if 再計算対象   |
| Median              | 期間内日次件数の中央値           | 分布の中心指標       |
| Backlog             | 期限超過残レビュー件数           | Backlog% で比率化    |
| Balance             | W2Total/W1Total                  | >1.3 注意            |
| Shift               | W2Peak - W1Peak                  | 正値=後ろ寄り        |
| Flatten             | deckPeak/top3Avg (または global) | ≈1 で平坦            |
| Shape               | globalPeak/top3Avg               | Flatten類似 (global) |
| Early Retry         | Week1 新規 \* 再挑戦率近似       | Day2 集約モデル      |
| Time Load           | median(sec)\*count/60            | 信頼区間将来導入     |
| Tail Index          | p90/p50 反応時間比               | 集中低下検知         |
| Focus Alert         | p50悪化 + Ret低下 (暫案)         | 条件将来調整         |
| Second Week Warning | W2 集中懸念フラグ                | Balance/Shift 由来   |

---

## 16. リスク & 緩和

| リスク             | 内容                    | 緩和策                                               |
| ------------------ | ----------------------- | ---------------------------------------------------- |
| 指標過多           | 初期ユーザが混乱        | Essential / Advanced 分離, Onboarding チュートリアル |
| データ移行         | localStorage → DB       | マイグレーションスクリプト + 双方向同期期間          |
| 過剰導入抑制で停滞 | Auto-limit が厳し過ぎる | ユーザ override + メトリクス監視                     |
| ソーシャルノイズ   | Feed が集中阻害         | Focus モード / 推薦調整                              |
| 反応時間外れ値     | 異常値で TI 歪む        | フィルタ + Winsorize                                 |
| 多言語コスト       | 翻訳遅延                | CI parity + 翻訳キュー管理                           |
| パフォーマンス劣化 | 大量カード/ログ         | 仮想化 / インデックス / キャッシュ                   |

---

## 17. 承認済み要確認項目の反映

初回 1〜7 質問は承認 (差異なし) として Phase/ロードマップへ反映済み。

---

## 18. 次アクション (ドキュメント面)

1. Badge 条件 DSL 草案化 (JSON スキーマ)
2. Efficiency Score 正規化関数仕様 (分位→線形写像) 追記
3. Multi-scenario UI ワイヤ (3 列比較) 下書き
4. InfoHint Phase D 実装仕様詳細 (アニメ/observer オプトアウト)
5. FSRS 移行タスク分解 (レビュー属性収集 → 推定 → スケジューラ差し替え)
