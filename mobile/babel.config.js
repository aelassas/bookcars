module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: null,
          safe: true,
          allowUndefined: false,
        },
      ],
      [
        "module-resolver",
        {
          "root": ['./'],
          "alias": {
            ":bookcars-types": "../packages/bookcars-types",
            ":bookcars-helper": "../packages/bookcars-helper"
          }
        }
      ],
      'react-native-reanimated/plugin',
    ],
  }
}
