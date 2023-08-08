// Learn more https://docs.expo.io/guides/cust  omizing-metro
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.resolver.sourceExts.push('mjs')

module.exports = config
