const { createRunOncePlugin, withAndroidManifest } = require('@expo/config-plugins')

const usesCleartextTraffic = (config) => {
  return withAndroidManifest(config, (config) => {
    const { modResults } = config
    const { manifest } = modResults

    if (!Array.isArray(manifest.application)) {
      console.warn('usesCleartextTraffic: No application array in manifest')
      return modResults
    }

    const application = manifest.application.length > 0 && manifest.application[0]

    if (!application) {
      console.warn('usesCleartextTraffic: No .MainApplication')
      return modResults
    }

    application.$['android:usesCleartextTraffic'] = 'true'

    console.log('usesCleartextTraffic plugin succeeded')

    return config
  })
}

module.exports = createRunOncePlugin(usesCleartextTraffic, 'usesCleartextTraffic', '1.0.0')
