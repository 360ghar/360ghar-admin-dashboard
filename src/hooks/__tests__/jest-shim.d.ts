/**
 * Type declaration for the Jest-compatibility shim installed at runtime by
 * `vitest.setup.ts` (`globalThis.jest = vi`). Lets legacy `jest.*` calls in
 * tests typecheck under `tsconfig.test.json` without importing anything.
 */
declare const jest: typeof import('vitest').vi
