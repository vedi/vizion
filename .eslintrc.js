module.exports = {
  env: {
    node: true,
    commonjs: true,
    es6: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    sourceType: 'script',
  },
  rules: {
    'function-paren-newline': 0,
    'no-else-return': 0,
    'no-param-reassign': 0,
    'no-shadow': 'warn',
    'no-underscore-dangle': 0,
    'object-curly-newline': 0,
    'strict': 0
  },
};
