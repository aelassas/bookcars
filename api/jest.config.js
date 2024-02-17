const config = {
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    roots: [
        './tests/',
    ],
}

export default config
