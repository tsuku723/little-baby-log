const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  // GoogleService-Info.plist はgit管理外のため、環境変数経由で受け取る。
  // - EASビルドサーバー: file型シークレット GOOGLE_SERVICES_IOS がplistのパスを提供する
  // - GitHub Actions: GOOGLE_SERVICES_IOS_BASE64 からplistを生成する
  const filePath = process.env.GOOGLE_SERVICES_IOS;
  const base64 = process.env.GOOGLE_SERVICES_IOS_BASE64;
  let googleServicesFile = config.ios?.googleServicesFile;

  if (filePath) {
    googleServicesFile = filePath;
  } else if (base64) {
    const plistPath = path.join(__dirname, "GoogleService-Info.plist");
    fs.writeFileSync(plistPath, Buffer.from(base64, "base64"));
    googleServicesFile = plistPath;
  }

  // 開発ビルド(EASの"development"プロファイル)はTestFlight版と同一端末に共存できるよう
  // bundleIdentifierを分ける。
  // 注意: nameは変更しないこと。name(「リトルベビーログ」)はASCII文字を含まないため
  // prebuild時のXcodeターゲット名サニタイズでは空文字→デフォルトの"app"にフォールバックしている。
  // 末尾にASCII文字(例: "(Dev)")を付けるとターゲット名がそちらから生成されてしまい、
  // 証明書側が前提とする"app"というターゲット名と食い違ってビルドが失敗する。
  // 注意: EAS_BUILD_PROFILE はリモートのビルドワーカー上でしか設定されず、
  // ローカルでの認証情報解決フェーズ(eas credentials / eas build の事前ステップ)では未設定になる。
  // その場合 .dev なしのBundle IDで認証情報が解決され、リモートのBundle IDと食い違ってしまうため、
  // eas.json の env で明示的に定義した APP_VARIANT を参照する。
  const isDevelopmentBuild = process.env.APP_VARIANT === "development";

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: isDevelopmentBuild
        ? "studio.teeda.littlebabylog.dev"
        : config.ios?.bundleIdentifier,
      googleServicesFile,
    },
  };
};
