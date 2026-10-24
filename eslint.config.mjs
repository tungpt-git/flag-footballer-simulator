import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const MODULES = ["roster", "playbook", "simulation", "officiating"];

/** Frameworks the inner layers must not know about. */
const FRAMEWORK_PATTERNS = ["react", "react-dom", "next", "next/*", "@/generated/*"];

/** Inner layers must not depend on outer layers (dependency rule). */
const FORBIDDEN_LAYERS = {
  domain: ["application", "infrastructure", "presentation"],
  application: ["infrastructure", "presentation"],
  infrastructure: ["presentation"],
  presentation: [],
};

const FRAMEWORK_FREE_LAYERS = ["domain", "application"];

/** Other modules may only be reached through their published entry points, never their internals. */
const buildCrossModulePatterns = (moduleName) =>
  MODULES.filter((other) => other !== moduleName).map((other) => `@/modules/${other}/*/**`);

const buildLayerRule = (moduleName, layer) => {
  const layerPatterns = FORBIDDEN_LAYERS[layer].map((forbidden) => `**/${forbidden}/**`);
  const frameworkPatterns = FRAMEWORK_FREE_LAYERS.includes(layer) ? FRAMEWORK_PATTERNS : [];
  const group = [...layerPatterns, ...frameworkPatterns, ...buildCrossModulePatterns(moduleName)];

  return {
    files: [`src/modules/${moduleName}/${layer}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group,
              message: `The ${layer} layer of "${moduleName}" may not import outer layers, frameworks (domain/application) or the internals of other modules.`,
            },
          ],
        },
      ],
    },
  };
};

const moduleLayerRules = MODULES.flatMap((moduleName) =>
  Object.keys(FORBIDDEN_LAYERS).map((layer) => buildLayerRule(moduleName, layer)),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...moduleLayerRules,
  {
    // The shared kernel is the lowest layer: it depends on no module and no framework.
    files: ["src/shared/kernel/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/modules/*", "@/modules/**", ...FRAMEWORK_PATTERNS], message: "The shared kernel must stay dependency-free." },
          ],
        },
      ],
    },
  },
  {
    // Shared building blocks never depend on a bounded context.
    files: ["src/shared/ui/**/*.{ts,tsx}", "src/shared/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/modules/*", "@/modules/**"], message: "Shared code must not depend on a bounded context." }] },
      ],
    },
  },
  {
    // The app router wires contexts together through their entry points only (index, ui, composition).
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/modules/*/*/**"], message: "Import a module through its index, ui or composition entry point." }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
