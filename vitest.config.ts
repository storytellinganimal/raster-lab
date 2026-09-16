import { defineConfig } from 'vitest/config';

// Plain Node environment -- the engine layer (algorithms, pipeline, store)
// is pure TypeScript with no real DOM dependency except the `ImageData`
// constructor and a `<canvas>` 2D context, both of which the tests supply
// themselves (see src/test/) rather than pulling in a full jsdom/canvas
// stack just for that.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/vitest.setup.ts'],
  },
});
