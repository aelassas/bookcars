/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies */
const path = require('path')
const { CracoAliasPlugin } = require('react-app-alias-ex')

module.exports = {
  plugins: [
    {
      plugin: CracoAliasPlugin,
      options: {}
    }
  ],
  webpack: {
    alias: {
      ':bookcars-types': path.resolve(__dirname, '../packages/bookcars-types'),
      ':bookcars-helper': path.resolve(__dirname, '../packages/bookcars-helper'),
      ':disable-react-devtools': path.resolve(__dirname, '../packages/disable-react-devtools'),
    },
  },
}
