// Learn more https://docs.expo.io/guides/cust  omizing-metro
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)
config.resolver.sourceExts.push('mjs')
config.watchFolders = [path.resolve(__dirname, '../packages')]

module.exports = config
