module.exports = {
  root: true,
  env: {
    node: true
  },
  parser: '@typescript-eslint/parser',
  extends: [
    "plugin:prettier/recommended",
  ],
  parserOptions:  {
    ecmaVersion:  2018,
    sourceType:  'module',
  },
  rules: {
    "no-else-return": ['warn', { allowElseIf: false }],
  },
  overrides: [
    {
      files: ["**/test/*.spec.ts"],
      env: {
        jest: true
      }
    }
  ]
};
