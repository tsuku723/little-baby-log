const analytics = () => ({
  logEvent: jest.fn().mockResolvedValue(undefined),
});
analytics.default = analytics;
module.exports = analytics;
