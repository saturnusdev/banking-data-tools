import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { monacoFixPlugin } from './vite-plugin-monaco-fix';

export default defineConfig({ 
    ssr: {
        noExternal: [
            "svelte-hero-icons",
            "js-yaml",
            "@iconify/svelte"
        ]
    },
    optimizeDeps: {
        exclude: [
            'monaco-editor',
            'monaco-editor/esm/vs/editor/editor.worker',
            'monaco-editor/esm/vs/language/json/json.worker'
        ]
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['@iconify/svelte'],
                    utils: ['js-yaml']
                }
            }
        },
        chunkSizeWarningLimit: 1000,
        sourcemap: false,
        minify: 'esbuild',
        target: 'esnext'
    },
    server: {
        fs: {
            allow: ['..']
        }
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'MONACO_EDITOR_SOURCEMAP': JSON.stringify(false)
    },
    plugins: [tailwindcss(), sveltekit(), monacoFixPlugin()],
    resolve: {
		alias: {
			util: 'node:util',
            events: 'node:events',
			timers: 'node:timers',
            path: 'node:path',
            stream: 'node:stream',
            string_decoder: 'node:string_decoder',
            buffer: 'node:buffer'
		}
	}
});
