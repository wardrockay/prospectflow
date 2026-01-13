import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Interdit l'import direct de { logger } - force l'utilisation de createChildLogger
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../utils/logger.js',
              importNames: ['logger'],
              message:
                "N'importez pas 'logger' directement. Utilisez 'createChildLogger' pour avoir le contexte du module. Exemple: const logger = createChildLogger('MonService');",
            },
            {
              name: '../../utils/logger.js',
              importNames: ['logger'],
              message:
                "N'importez pas 'logger' directement. Utilisez 'createChildLogger' pour avoir le contexte du module.",
            },
          ],
        },
      ],
    },
  },
  {
    // Exception pour les fichiers qui ont vraiment besoin du logger root
    files: ['**/middlewares/logger.middleware.ts', '**/middlewares/correlation-id.middleware.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);
