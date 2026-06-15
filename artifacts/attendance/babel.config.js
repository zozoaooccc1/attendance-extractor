module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    // Reanimated v4 لا يحتاج babel plugin — يعمل تلقائياً مع Expo SDK 54
  };
};
