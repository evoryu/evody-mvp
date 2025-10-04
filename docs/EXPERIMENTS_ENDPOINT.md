# Experiments Events Endpoint

実験イベント(Exposure/Conversion)送信の宛先は、環境変数 `NEXT_PUBLIC_EXP_EVENTS_ENDPOINT` で設定できます。
未設定時は `/__exp_exposure` に送信します。

- クライアント: `navigator.sendBeacon(endpoint, payload)` を使用（可能な場合）
- 送信失敗/未対応: バッチをバッファに戻し、指数バックオフで再試行
- 終了時フック: `visibilitychange(page hidden) / pagehide / beforeunload` で同エンドポイントへ送信を試行

## 設定例

開発・プレビュー環境:

```bash
# Windows PowerShell
$env:NEXT_PUBLIC_EXP_EVENTS_ENDPOINT = "https://example.test/exp-events"
npm run dev
```

本番環境（Vercel等）:
- 環境変数に `NEXT_PUBLIC_EXP_EVENTS_ENDPOINT` を登録
- デプロイ後はクライアントからそのURLへ beacon 送信されます

## Payload 例

```jsonc
{
  "type": "experiment_events",
  "events": [
    { "type": "exposure", "key": "ui_header", "variant": "A", "ts": 1730000000000 },
    { "type": "conversion", "key": "ui_header", "metric": "clicked", "variant": "A", "value": 1, "ts": 1730000000500 }
  ]
}
```

## 注意
- `NEXT_PUBLIC_` プレフィックスの環境変数はクライアントに公開されます。認証や秘密鍵は絶対に含めないでください。
- エンドポイント側で CSP/コルス/認証の設計を別途行ってください。
