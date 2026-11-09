import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // P10.6: relative base so the built `dist/` works unmodified when served from a GitHub Pages
  // project subpath (e.g. markwasu2.github.io/outside-date/) without hardcoding the repo name here
  // - safe since the app has no client-side router (confirmed via grep: no react-router/history
  // usage) to conflict with relative asset paths.
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    // P10.5: vitest's default include glob (`**/*.{test,spec}.ts`) would otherwise also pick up
    // e2e/*.spec.ts, which uses @playwright/test's own `test`/`expect`, not vitest's - excluded
    // (on top of vitest's own defaults) so the two runners never fight over the same files.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
