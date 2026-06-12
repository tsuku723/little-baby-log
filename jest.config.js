module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.jest.test.{ts,tsx,js,jsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/legacy/", "/.claude/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  coveragePathIgnorePatterns: [
    "<rootDir>/App.js",
    "<rootDir>/src/models/dataModels.ts",
    "<rootDir>/src/navigation/types.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@react-native-firebase/(.*)$":
      "<rootDir>/__mocks__/@react-native-firebase/$1.js",
  },
};
