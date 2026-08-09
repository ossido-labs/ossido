/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    name: '@ossido-labs/ossido-ui',
    environment: 'happy-dom',
    globals: true,
  },
});
