import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./packages/web/test/setup.ts'],
        globals: true,
        include: ['packages/webgi/src/**/*.{test,spec}.{ts,tsx}'],
    },
});
