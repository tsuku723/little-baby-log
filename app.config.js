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
  // bundleIdentifier/アプリ名を分ける
  const isDevelopmentBuild = process.env.EAS_BUILD_PROFILE === "development";

  return {
    ...config,
    name: isDevelopmentBuild ? `${config.name}(Dev)` : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: isDevelopmentBuild
        ? "studio.teeda.littlebabylog.dev"
        : config.ios?.bundleIdentifier,
      googleServicesFile,
    },
  };
};
