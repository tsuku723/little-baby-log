module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.jest.test.{ts,tsx,js,jsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/legacy/", "/.claude/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}"],
  coveragePathIgnorePatterns: [
    "<rootDir>/App.js",
    "<rootDir>/src/models/dataModels.ts",
    "<rootDir>/src/navigation/types.ts",
  ],
  // CLAUDE.md記載のカバレッジ目標値（ステートメント80%・ブランチ77%・関数70%）をCIで担保する
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 77,
      functions: 70,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@react-native-firebase/(.*)$":
      "<rootDir>/__mocks__/@react-native-firebase/$1.js",
  },
};
