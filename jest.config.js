module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '!**/tests/integration.test.js', // Exclude integration tests (use separate config)
    '!**/tests/wallet-integration.test.js', // Exclude wallet integration tests
  ],
  
  // Module name mapper for browser APIs
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/chrome/',
    '/firefox/',
    '/safari/',
    '/dist/'
  ],
  
  // Verbose output
  verbose: true,
  
  // Timeout
  testTimeout: 10000
};
