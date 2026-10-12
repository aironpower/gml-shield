// Chaque règle ci-dessous correspond à une règle numérotée du guide qualité de code (docs/).
// Toute modification d'un seuil doit être faite dans les deux documents dans la même PR.
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const IDENTIFIANT_ASCII = '^[A-Za-z_$][A-Za-z0-9_$]*$';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Lisibilité et maintenabilité : seuils mesurables
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],

      // Expressivité : identifiants ASCII, conventions de casse
      'id-match': ['error', IDENTIFIANT_ASCII, { properties: true }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        // Les propriétés suivent le contrat de l'Annexe 5 (snake_case) ou le code (camelCase)
        {
          selector: ['property', 'parameterProperty'],
          format: ['camelCase', 'snake_case', 'UPPER_CASE'],
        },
        { selector: ['property'], modifiers: ['requiresQuotes'], format: null },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
      ],

      // Sécurité : aucune requête SQL construite par interpolation de chaîne
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='query'] > TemplateLiteral[expressions.length>0]",
          message:
            'Requête SQL interpolée interdite : utiliser des paramètres $1, $2… (règle SEC-01).',
        },
        {
          selector: "CallExpression[callee.property.name='query'] > BinaryExpression[operator='+']",
          message:
            'Requête SQL concaténée interdite : utiliser des paramètres $1, $2… (règle SEC-01).',
        },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',

      // Fiabilité
      // Un paramètre imposé par une signature (ex. les 4 arguments d'un gestionnaire d'erreurs
      // Express) mais non utilisé est préfixé par « _ » : c'est la seule exception admise.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
      ],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Client web (JavaScript exécuté par le navigateur) : mêmes règles de lisibilité et de
    // nommage, sans les règles qui exigent des types TypeScript.
    files: ['public/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
  },
  prettier,
);
