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
    coverageReporters: ['text', 'cobertura'],
}

export default config
