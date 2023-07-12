module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "parser": `@typescript-eslint/parser`,
    "plugins": [`@typescript-eslint`],
    "extends": [

        `eslint:recommended`,
        `plugin:@typescript-eslint/eslint-recommended`,
        `plugin:@typescript-eslint/recommended`,
        `prettier`
    ],
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                `.eslintrc.{js,cjs}`
            ],
            "parserOptions": {
                "sourceType": `script`
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": `latest`,
        "sourceType": `module`
    },
    "rules": {
        "no-async-promise-executor": 0,
        "quotes": [`error`, `backtick`],
        "no-multiple-empty-lines": [`error`, { "max": 2, "maxEOF": 1 }],
        "no-console": 1,
        "semi": `error`
    }
};
