import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        alias: {
            '@': path.resolve(__dirname, './'),
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary'],
            include: ['app/**/*.{ts,tsx}', 'lib/**/*.ts'],
            exclude: [
                'app/**/*.d.ts',
                'app/**/layout.tsx',
                'app/**/loading.tsx',
                'app/**/error.tsx',
                'app/**/page.tsx', // server components, need a live DB — not this suite's style
                'app/generated/**',
                '**/*.module.css',
            ],
        },
    },
});
