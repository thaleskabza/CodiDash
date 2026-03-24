import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prisma transaction callbacks require `any` — downgrade to warning
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars: ignore underscore-prefixed params
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Allow @ts-nocheck in files that wrap untyped third-party SDKs
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
];

export default eslintConfig;
