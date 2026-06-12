const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_IOS ?? config.ios?.googleServicesFile,
  },
});
