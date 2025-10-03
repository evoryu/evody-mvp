// Centralized UI labels (Phase: naming migration complete - legacy suffixes removed)

// Locale string maps (Phase 1.32: i18n scaffold)
const JA = {
  simulatorTitle: '学習量シミュレーター',
  simulatorShort: '学習量シミュレーター',
  upcomingLoadTitle: '今後のレビュー負荷',
  peakPerDay: '最大/日',
  medianPerDay: '中央値/日',
  today: '今日',
  addedCards: '追加カード',
  addedCardsCount: '追加カード数',
  expectedRetrys: '再挑戦見込み',
  peakWithRetry: '最大/日(+再)',
  week1TotalMinutes: '1週合計(分)',
  peakMinutes: '最大/日(分)',
  deckBreakdown: '内訳',
  backlog: '未消化',
  balance: 'バランス',
  shift: 'シフト',
  ratioWeek: '2週/1週',
  chainSummary: '追加パターンサマリー',
  earlyRetry: '初期再挑戦',
  timeLoad: '学習時間',
  beforeState: '現状 (Before)',
  afterState: '追加後',
  addPattern: '追加パターン',
  chainPresetTitle: '初期再出現プリセット',
  week1Added: 'Week1内追加',
  week2Added: 'Week2内追加',
  applyAction: '適用',
  closeAction: '閉じる',
  distribution: '分布',
  minutesPerCardMedian: '1枚中央値',
  peakChangePct: '最大/日 変化%',
  // --- Newly added (Phase 1.31 label centralization wave 2) ---
  colorsLegend: '色: 赤=負荷増 / 緑=負荷減 / 灰=変化小',
  peakMinutesHint: 'ピーク日の推定所要分',
  timeLoadFallback: '時間負荷: 暫定中央値',
  allDecks: '全デッキ',
  assumptionChained: '仮定: 追加パターン初期間隔で初期再出現 (固定間隔近似)。再挑戦/ズレ未考慮。Week1内合計は <=D6。',
  assumptionSingle: '仮定: Day1 のみ 1 回再出現 (初回復習)。再挑戦再注入未考慮。',
  chainDistributionShort: 'Dist:',
  classificationLabel: '分類',
  retryRateShort: 'Rate',
  earlyRetryNote: '簡易モデル: Week1 新規カード * 再挑戦率 (2%〜55%)。全再挑戦は Day2 に集約。(暫定値)=サンプル不足(min40)。',
  timeLoadNote: '中央値(秒) * 件数 / 60 を 0.1 分丸め。初期再挑戦増も反映。',
  beforeShort: 'Before',
  afterShort: 'After',
  deltaNumberLegend: '数字=差分',
  sparklineTitle: 'スパークライン (Before→After)',
  applyActionTitle: '実際に新カードを導入 (今日の残り枠に従い、余剰は無視)',
  week1: '1週目',
  week2: '2週目',
  total: '合計',
  shape: 'Shape',
  flatten: 'Flatten',
  top3Avg: 'Top3Avg'
  ,
  // --- Wave3 (Upcoming Load detailed metrics & warnings) ---
  secondWeekWarningIconTitle: 'Second Week Warning: 2週目に負荷集中傾向 (Peak Shift or Balance Ratio)',
  backlogLegend: '未消化',
  backlogWarning: '未消化 が多めです',
  balanceCardTitle: 'バランス',
  shiftLabel: 'シフト',
  balanceLabelShort: '2週/1週',
  flattenLabelShort: 'Flatten',
  secondWeekWarningTitle: 'Second Week Warning',
  secondWeekWarningBody: '2週目に負荷集中の兆候があります (Peak Shift または Balance Ratio)。新カード導入ペースを少し抑えるか既存レビュー優先を検討。',
  deckWeekMetricsTitle: 'Deck Week Metrics (Top)',
  deckTableW1PT: 'W1 P/T',
  deckTableW2PT: 'W2 P/T',
  deckTableShift: 'Shift',
  deckTableBalance: 'Balance',
  deckTableFlat: 'Flat',
  deckTableBacklog: 'Bkg',
  deckTableBacklogPct: 'Bkg%',
  deckMetricsFooter: 'W1/2: 7日単位ミニ指標 (Peak/Total)。Shift=W2Peak-W1Peak, Balance=W2Total/W1Total, Flat=deckPeak/top3Avg (1に近いほど尖り小)。Bkg% = backlog / (backlog + future) (≥40% 赤 / ≥25% 黄 / 他 緑)。',
  upcomingLoadFooter: 'Peak は期間内最大日次予定レビュー数、Median は日次件数の中央値。赤=期限超過(backlog)、濃色=これから到来予定。Today=本日残+backlog。バー高さは Peak 基準。',
  rawToggleLabel: 'Raw'
  ,
  // --- Wave4 (Tooltip / definition extraction draft) ---
  tooltipFocusBaseline: 'Baseline比較: p50>=+25% & Ret<=-4pt または TI>=1.6/ +5% over baseline',
  tooltipRetentionMode: 'Retention 重み付けモード (Eff=有効復習, Cards=枚数基準, G+E=Good+Easy)',
  tooltipDeckRetentionSelect: 'Deck別 Retention トレンド (保存されます)',
  tooltipResetPoints: 'ポイントを0に戻します',
  tooltipClearToday: '今日の達成数・連続記録をクリア（テスト用）',
  tooltipDeckBreakdownToggle: 'デッキ別内訳表示トグル',
  tooltipDeckStacked14d: 'デッキ内訳積層表示 (14日)',
  tooltipWeek1Card: '1週目: 最初の7日間の予定レビュー。最大/日=最大日件数, 合計=総件数。',
  tooltipWeek2Card: '2週目: 8〜14日目の予定レビュー。1週目との比較で集中/偏りを把握。',
  tooltipDeckSortOrder: '並び: w2 Peak desc -> w1 Peak desc'
  ,
  // --- R3 new tooltips ---
  tooltipEarlyRetry: '初期再挑戦: Week1 新規 * 再挑戦率の簡易近似。全再挑戦は Day2 集約。',
  tooltipTimeLoad: '学習時間: 直近反応時間中央値 * 件数 から推定した負荷(分)。',
  tooltipChainSummary: '追加パターンサマリー: 連続再出現パターン (例 1/3/7) の合計影響概要。',
  // --- R2 new tooltips for removed legacy suffix terms ---
  tooltipPeakPerDay: '最大/日: 対象期間内で最も多い予定レビュー数。',
  tooltipBacklog: '未消化: 期限超過し残っているレビュー件数。',
  tooltipBalanceMetric: 'バランス: W2Total/W1Total で2週目偏重度を測定。',
  // --- info.* (Wave5 planned: metric definitions centralization) ---
  infoDeckW1PT: 'Week1 Peak / Total: 7日間の中での最大予定レビュー件数と合計。偏り/集中の起点。',
  infoDeckW2PT: 'Week2 Peak / Total: 8〜14日目の最大予定レビュー件数と合計。Week1との比較で増減検出。',
  infoDeckShift: 'Shift = W2Peak - W1Peak: 2週目がどれだけピークを押し上げているか (正値=負荷後ろズレ)。',
  infoDeckBalance: 'Balance = W2Total / W1Total: 合計件数の2週目偏重度。>1.3 で集中懸念。',
  infoDeckFlat: 'Flatten = deckPeak / top3Avg: デッキ内尖り指数。1に近いほど平準化 (ピーク突出が小さい)。',
  infoDeckBacklog: 'Backlog: 期限超過(未消化)レビュー件数。高いほど遅延。',
  infoDeckBacklogPct: 'Backlog Ratio = backlog / (backlog + future). 進行中遅延の割合。40%以上=赤。'
  ,infoShapeMetric: 'Shape = globalPeak / top3Avg: 尖り度指標。1に近いほど平坦 (ピーク突出小)。'
  ,infoSecondWeekWarning: 'Second Week Warning: 2週目負荷集中シグナル (Peak Shift や Balance 比率)。新規導入ペース調整検討。'
  ,
  // --- Badge condition templates (placeholders: ${n}, ${d}) ---
  condition_streak_days: '${n}日連続で学習',
  condition_backlog_drop: '未処理カードを${n}件以上削減',
  condition_reaction_p50_improve: '反応時間中央値を${n}%以上改善',
  condition_tail_index_low: '反応ばらつき指数を${n}以下に維持',
  condition_flatten_low: 'Flatten指標を${n}以下',
  condition_retention_rate: '定着率${n}%以上',
  condition_efficiency_score: '効率スコア${n}以上',
  condition_episodes_total: '${d}日間で学習回数${n}件以上',
  anyof_heading: '以下のいずれか',
  and_joiner: 'かつ'
  ,tooltipRetentionMetric: '定着率: 直近7日で Good / Easy 判定となったレビュー割合 (Again 除外)。短期変動があるため閾値段階化。'
  ,tooltipReactionVariability: '反応ばらつき指数: 反応時間の散らばり度合い (低いほど安定)。内部的には上位/中央値比などの合成指標。'
  ,tooltipReactionMedian: '反応時間中央値: 直近の学習反応時間 (秒) の中央値。改善は効率向上を示唆。'
  // Inverse metric progress (Achievements)
  ,tooltipTailIndexInverse: '反応ばらつき指数 (低いほど良い): 現在値が閾値以下で条件達成。バー=閾値/現在 (最大1)。'
  ,tooltipFlattenInverse: 'Flatten 指標 (低いほど平坦): 現在値が閾値以下で達成。バー=閾値/現在 (最大1)。1.0 に近いほどピーク突出が小。'
};

// For now EN mirrors JA (can diverge later). Minimal subset identical.
const EN: typeof JA = {
  ...JA,
  // Pilot English overrides (Phase: i18n pilot)
  simulatorTitle: 'Load Simulator',
  simulatorShort: 'Load Simulator',
  upcomingLoadTitle: 'Upcoming Review Load',
  peakPerDay: 'Peak / Day',
  medianPerDay: 'Median / Day',
  backlogLegend: 'Backlog',
  backlogWarning: 'Backlog is high',
  balanceCardTitle: 'Balance',
  flattenLabelShort: 'Flatten',
  applyAction: 'Apply',
  closeAction: 'Close',
  rawToggleLabel: 'Raw',
  week1: 'Week1',
  week2: 'Week2',
  secondWeekWarningTitle: 'Second Week Warning',
  secondWeekWarningBody: 'Potential week2 concentration (peak shift / balance ratio). Consider slowing new cards or prioritizing reviews.'
  ,
  // English definitions (metric tooltips)
  infoDeckW1PT: 'Week1 Peak / Total: Max scheduled reviews and total in first 7 days.',
  infoDeckW2PT: 'Week2 Peak / Total: Max and total in days 8–14 for comparison.',
  infoDeckShift: 'Shift = W2Peak - W1Peak: Positive means load pushed to week2.',
  infoDeckBalance: 'Balance = W2Total / W1Total: Degree of week2 concentration (>1.3 = concern).',
  infoDeckFlat: 'Flatten = deckPeak / top3Avg: Spikiness index (closer to 1 = flatter).',
  infoDeckBacklog: 'Backlog: Overdue reviews.',
  infoDeckBacklogPct: 'Backlog Ratio = backlog / (backlog + future). Proportion of overdue load (>=40% red).',
  // New extracted definitions (Phase A+)
  infoShapeMetric: 'Shape = globalPeak / top3Avg: Spikiness. Closer to 1 means flatter (peak less pronounced).',
  infoSecondWeekWarning: 'Second Week Warning: Week2 load concentration signal (Peak shift or Balance ratio high). Consider pacing new cards.',
  tooltipPeakPerDay: 'Peak / Day: Maximum scheduled reviews in the period.',
  tooltipBacklog: 'Backlog: Overdue reviews pending.',
  tooltipBalanceMetric: 'Balance: W2Total/W1Total week2 load concentration.'
  ,tooltipEarlyRetry: 'Early Retry: Approx = Week1 new * againRate (simplified). All early agains placed on Day2.',
  tooltipTimeLoad: 'Time Load: Estimated minutes = median(sec)*count/60 (rounded).',
  tooltipChainSummary: 'Chain Summary: Aggregate impact of chained reappear pattern (e.g., 1/3/7).'
  ,
  // English overrides for badge condition templates
  condition_streak_days: 'Studied for ${n} consecutive days',
  condition_backlog_drop: 'Reduced backlog by ${n}+ cards',
  condition_reaction_p50_improve: 'Improved median reaction time by ${n}%+',
  condition_tail_index_low: 'Kept reaction variability ≤ ${n}',
  condition_flatten_low: 'Flatten metric ≤ ${n}',
  condition_retention_rate: 'Retention ≥ ${n}%',
  condition_efficiency_score: 'Efficiency score ≥ ${n}',
  condition_episodes_total: '${n}+ study sessions in ${d} days',
  anyof_heading: 'Any of the following',
  and_joiner: 'AND'
  ,tooltipRetentionMetric: 'Retention: Share of Good/Easy outcomes over last 7 days (Again excluded). Volatile short-term; tiered thresholds.'
  ,tooltipReactionVariability: 'Reaction Variability Index: Composite spikiness/dispersion of reaction times (lower = steadier).'
  ,tooltipReactionMedian: 'Median Reaction Time: Median seconds per recent review. Improvement suggests efficiency gains.'
  ,tooltipTailIndexInverse: 'Reaction Variability (lower is better). Goal achieved when current ≤ target. Bar = target/current (clamped to 1).'
  ,tooltipFlattenInverse: 'Flatten (lower = flatter). Achieved when current ≤ target. Bar = target/current (clamped). Closer to 1 baseline = flatter schedule.'
};

const STRINGS = { ja: JA, en: EN } as const;
export type LocaleKey = keyof typeof STRINGS;
export type LabelKey = keyof typeof JA;

export function getLabel(key: LabelKey, locale: LocaleKey = 'ja'): string {
  const dict = STRINGS[locale] || STRINGS.ja
  if (key in dict) return dict[key]
  if (key in STRINGS.ja) return STRINGS.ja[key]
  return key
}

// classification (load) color helper (abstract existing ternary chains)
export function classifyLoadTone(cls: string) {
  switch (cls) {
    case 'high':
      return 'bg-[var(--c-danger,#dc2626)]/15 text-[var(--c-danger,#dc2626)]'
    case 'medium':
      return 'bg-[var(--c-warn,#d97706)]/20 text-[var(--c-warn,#d97706)]'
    default:
      return 'bg-[var(--c-success)]/15 text-[var(--c-success)]'
  }
}
