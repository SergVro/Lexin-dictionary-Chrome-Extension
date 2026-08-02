import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "bower_components/",
      "src/lib/**/*",
      "**/*.js"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        // Resolves each file against the nearest tsconfig (src -> ./tsconfig.json,
        // tests -> tests/tsconfig.json, e2e -> tests/e2e/tsconfig.json) instead of
        // forcing everything through the build config, which excludes tests.
        projectService: {
          // Root-level configs live outside every tsconfig's "include".
          allowDefaultProject: ["*.ts"]
        },
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    },
    plugins: {
      "@stylistic": stylistic
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-this-alias": "off",
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "curly": "error",
      "eqeqeq": ["error", "allow-null"],
      "no-debugger": "error",
      "@stylistic/semi": ["error", "always"],
      "@stylistic/quotes": ["error", "double", { "avoidEscape": true }]
    }
  }
);
