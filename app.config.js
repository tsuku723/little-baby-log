const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const base64 = process.env.GOOGLE_SERVICES_IOS_BASE64;
  let googleServicesFile = config.ios?.googleServicesFile;

  if (base64) {
    const plistPath = path.join(__dirname, "GoogleService-Info.plist");
    fs.writeFileSync(plistPath, Buffer.from(base64, "base64"));
    googleServicesFile = plistPath;
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      googleServicesFile,
    },
  };
};
