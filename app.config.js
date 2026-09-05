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
  const isDevelopmentBuild = process.env.EAS_BUILD_PROFILE === "development";

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
