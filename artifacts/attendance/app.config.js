import appJson from './app.json';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  ...appJson.expo,
  name: IS_DEV ? 'حضور DEV' : appJson.expo.name,
  android: {
    ...appJson.expo.android,
    package: IS_DEV ? 'com.attendance.app.dev' : appJson.expo.android.package,
  },
  extra: {
    ...appJson.expo.extra,
    appVariant: IS_DEV ? 'development' : 'production',
    expoToken: process.env.EXPO_TOKEN ?? '',
  },
};
