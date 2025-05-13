// Learn more https://docs.expo.io/guides/cust  omizing-metro
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)
config.resolver.sourceExts.push('mjs')
config.watchFolders = [path.resolve(__dirname, '../packages')]

config.resolver.resolveRequest = function packageExportsResolver(context, moduleImport, platform) {
    // Use the browser version of the package for React Native 
    if (moduleImport === 'axios' || moduleImport.startsWith('axios/')) {
        return context.resolveRequest(
            {
                ...context,
                unstable_conditionNames: ['browser'],
            },
            moduleImport,
            platform,
        );
    }

    // Fall back to normal resolution
    return context.resolveRequest(context, moduleImport, platform);
};

module.exports = config
