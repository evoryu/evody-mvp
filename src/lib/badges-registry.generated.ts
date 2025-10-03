// AUTO-GENERATED FILE. DO NOT EDIT.
// Generated at 2025-10-03T05:06:32.779Z
import type { BadgeDefinition } from './badges'

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    "id": "backlog_cutter",
    "category": "backlog",
    "title": {
      "ja": "Backlog削減",
      "en": "Backlog Cutter"
    },
    "description": {
      "ja": "Backlogを前回比で10以上削減",
      "en": "Reduce backlog by 10 vs previous"
    },
    "conditions": [
      {
        "type": "backlog_drop",
        "op": ">=",
        "value": 10
      }
    ],
    "version": 1,
    "tags": [
      "backlog"
    ]
  },
  {
    "id": "balanced_reaction",
    "category": "reaction",
    "title": {
      "ja": "反応バランス",
      "en": "Balanced Reaction"
    },
    "description": {
      "ja": "p50改善(>=12%) または TailIndex<=1.40 を満たし、Retention 7d >=80%",
      "en": "Achieve either p50 improvement >=12% OR tail index <=1.40 with 7d retention >=80%"
    },
    "conditions": [
      {
        "type": "retention_rate",
        "op": ">=",
        "value": 80
      }
    ],
    "anyOf": [
      [
        {
          "type": "reaction_p50_improve",
          "op": ">=",
          "value": 0.12
        }
      ],
      [
        {
          "type": "tail_index_low",
          "op": "<=",
          "value": 1.4
        }
      ]
    ],
    "tier": 1,
    "repeatable": false,
    "version": 1,
    "tags": [
      "reaction",
      "hybrid",
      "anyOf"
    ]
  },
  {
    "id": "reaction_p50_improve",
    "category": "reaction",
    "title": {
      "ja": "反応速度改善",
      "en": "Reaction Speed Boost"
    },
    "description": {
      "ja": "直近7日 p50 反応時間を過去平均より15%改善",
      "en": "Improve 7d median reaction time by 15% vs prior baseline"
    },
    "conditions": [
      {
        "type": "reaction_p50_improve",
        "op": ">=",
        "value": 0.15
      }
    ],
    "tier": 1,
    "repeatable": false,
    "version": 1,
    "tags": [
      "reaction",
      "performance"
    ]
  },
  {
    "id": "retention_85",
    "category": "retention",
    "title": {
      "ja": "堅実なリテンション",
      "en": "Solid Retention"
    },
    "description": {
      "ja": "7日リテンション率 (Good+Easy%) 85%以上を達成",
      "en": "Achieve 7d retention (Good+Easy%) of 85% or higher"
    },
    "conditions": [
      {
        "type": "retention_rate",
        "op": ">=",
        "value": 85
      }
    ],
    "tier": 1,
    "repeatable": false,
    "version": 1,
    "tags": [
      "retention",
      "quality",
      "tier"
    ]
  },
  {
    "id": "retention_95",
    "category": "retention",
    "title": {
      "ja": "エリートリテンション",
      "en": "Elite Retention"
    },
    "description": {
      "ja": "7日リテンション率 (Good+Easy%) 95%以上を達成",
      "en": "Achieve 7d retention (Good+Easy%) of 95% or higher"
    },
    "conditions": [
      {
        "type": "retention_rate",
        "op": ">=",
        "value": 95
      }
    ],
    "tier": 3,
    "repeatable": false,
    "version": 1,
    "tags": [
      "retention",
      "quality",
      "tier"
    ]
  },
  {
    "id": "retention_high",
    "category": "retention",
    "title": {
      "ja": "高リテンション",
      "en": "High Retention"
    },
    "description": {
      "ja": "7日リテンション率 (Good+Easy%) 90%以上を達成",
      "en": "Achieve 7d retention (Good+Easy%) of 90% or higher"
    },
    "conditions": [
      {
        "type": "retention_rate",
        "op": ">=",
        "value": 90
      }
    ],
    "tier": 2,
    "repeatable": false,
    "version": 1,
    "tags": [
      "retention",
      "quality"
    ]
  },
  {
    "id": "streak_7",
    "category": "streak",
    "title": {
      "ja": "7日連続学習",
      "en": "7-Day Streak"
    },
    "description": {
      "ja": "7日連続で学習を記録",
      "en": "Log study 7 consecutive days"
    },
    "conditions": [
      {
        "type": "streak_days",
        "op": ">=",
        "value": 7
      }
    ],
    "tier": 1,
    "repeatable": false,
    "version": 1,
    "tags": [
      "streak",
      "onboarding"
    ]
  },
  {
    "id": "tail_index_low",
    "category": "reaction",
    "title": {
      "ja": "安定した反応",
      "en": "Stable Reactions"
    },
    "description": {
      "ja": "直近7日 Tail Index (p90/p50) を 1.35 以下に維持",
      "en": "Maintain 7d tail index (p90/p50) at 1.35 or lower"
    },
    "conditions": [
      {
        "type": "tail_index_low",
        "op": "<=",
        "value": 1.35
      }
    ],
    "tier": 1,
    "repeatable": false,
    "version": 1,
    "tags": [
      "reaction",
      "consistency"
    ]
  }
]
