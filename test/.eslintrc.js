module.exports = {
  rules: {
    'func-names': 0,
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-identical-title': 'error',
    'mocha/no-pending-tests': 'warn',
  },
  env: {
    mocha: true,
  },
  plugins: [
    'mocha',
  ],
};
