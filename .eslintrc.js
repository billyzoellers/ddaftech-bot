module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  rules: {
    "no-console": "off",
    "no-use-before-define": ["error", { "functions": false }],
    "no-unused-vars": ["error", { "argsIgnorePattern": "^bot$" }]
  },
};
