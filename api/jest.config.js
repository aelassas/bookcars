const config = {
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    roots: ['./tests/'],
    collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**', '!**/dist/**', '!**/tests/**'],
    testMatch: ['**/*.test.ts'],
    collectCoverage: true,
    coverageReporters: ['cobertura', 'html'],
    testTimeout: 15000,
}

export default config
