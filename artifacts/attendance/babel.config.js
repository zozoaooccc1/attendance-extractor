module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // Reanimated Babel plugin مطلوب لعمل الـ worklets بشكل صحيح
      // يجب أن يكون آخر plugin في القائمة حسب التوثيق الرسمي
      'react-native-reanimated/plugin',
    ],
  };
};
