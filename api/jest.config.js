const config = {
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    roots: [
        './tests/',
    ],
    collectCoverage: true,
    coverageReporters: ['cobertura', 'html'],
    testTimeout: 15000,
}

export default config
