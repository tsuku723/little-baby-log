# リトルベビーログ

> 比べないカレンダー — うちの子の"確かな育ち"を、修正月齢でやさしく見える化。

早産・低出生体重児を育てる保護者向けの育児記録アプリです。
実月齢と修正月齢を自動計算し、日々の小さな成長をカレンダー形式で記録・振り返ることができます。

---

## 特徴

- **修正月齢の自動計算** — 出生日と出産予定日を入力するだけで、実月齢・修正月齢を日別に表示
- **カレンダー形式の記録** — 日々の「できた／頑張った」をメモ・写真付きで残せる
- **完全ローカル保存** — データはすべて端末内に保存。クラウド送信なし
- **多子対応** — 複数の子どものプロフィールを切り替えて管理可能

---

## 技術スタック

| カテゴリ       | 内容                                          |
| -------------- | --------------------------------------------- |
| フレームワーク | React Native / Expo SDK 54                    |
| 言語           | TypeScript                                    |
| ナビゲーション | React Navigation（スタック + ボトムタブ）     |
| データ永続化   | AsyncStorage                                  |
| テスト         | Jest / jest-expo                              |
| CI             | GitHub Actions（型チェック + ユニットテスト） |

---

## セットアップ

```bash
git clone https://github.com/tsuku723/little-baby-log.git
cd little-baby-log
npm install
```

### 開発サーバー起動

```bash
npm start
```

Expo Go アプリ（iOS / Android）でQRコードを読み込むと実機確認できます。

> ⚠️ `react-native-webview` を使用する画面は Expo Go では動作しません。確認には Development Build が必要です。

### 開発ビルド(development profile)のEASビルド

TestFlight版と同一端末に共存させるため、developmentプロファイルは`bundleIdentifier`を動的に`studio.teeda.littlebabylog.dev`へ切り替えている(`app.config.js`)。

`eas build --profile development`をローカル実行する際は、以下のように`EAS_DANGEROUS_OVERRIDE_IOS_BUNDLE_IDENTIFIER`を明示的に指定すること。

```bash
EAS_DANGEROUS_OVERRIDE_IOS_BUNDLE_IDENTIFIER=studio.teeda.littlebabylog.dev \
  eas build --platform ios --profile development --non-interactive
```

**理由**: `eas build`のローカル/対話的な認証情報解決処理(`eas credentials`コマンドも同様)は、`app.config.js`の動的な`EAS_BUILD_PROFILE`分岐を認識せず、常に`app.json`の静的なbundleIdentifier(`studio.teeda.littlebabylog`、`.dev`なし)を見てしまう既知の問題がある([expo/expo#40851](https://github.com/expo/expo/issues/40851)などで報告あり)。この環境変数を指定しないと、プロダクション用の証明書・プロビジョニングプロファイルが誤って`.dev`ビルドに割り当てられ、`Could not find target 'app'`や`does not match the bundle ID`といったエラーでビルドが失敗する。

---

## コマンド

```bash
npm start           # Expo 開発サーバー起動
npm test            # 全テスト実行
npm run test:unit   # Jest ユニットテストのみ
npm run typecheck   # TypeScript 型チェック
```

---

## ディレクトリ構成

```
src/
  components/   # 共通 UI コンポーネント
  screens/      # 画面コンポーネント
  navigation/   # ナビゲーション設定
  models/       # データモデル・型定義
  services/     # ビジネスロジック
  state/        # 状態管理
  storage/      # AsyncStorage ラッパー
  utils/        # ユーティリティ関数
  constants/    # 定数
  content/      # 静的コンテンツ
docs/           # GitHub Pages（リーガルページ）
```

---

## リーガル

- [このアプリについて](https://tsuku723.github.io/little-baby-log/about)
- [プライバシーポリシー](https://tsuku723.github.io/little-baby-log/privacy-policy)
- [利用規約](https://tsuku723.github.io/little-baby-log/terms)
- [オープンソースライセンス](https://tsuku723.github.io/little-baby-log/oss-licenses)

---

## ライセンス

本リポジトリのソースコードは公開されていますが、ライセンスは設定されていません（All Rights Reserved）。コードの複製・再利用・配布はご遠慮ください。
利用ライブラリのライセンスについては [オープンソースライセンス](https://tsuku723.github.io/little-baby-log/oss-licenses) をご確認ください。
