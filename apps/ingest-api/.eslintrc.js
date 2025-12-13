module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier' // pour désactiver les conflits avec prettier
    ],
    rules: {
        // Personnalisation des règles ici
    },
};
