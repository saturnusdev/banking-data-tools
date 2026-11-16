import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { monacoFixPlugin } from './vite-plugin-monaco-fix.js';

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
                manualChunks(id) {
                    if (id.includes('@iconify/svelte')) return 'vendor';
                    if (id.includes('js-yaml')) return 'utils';
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
    plugins: [tailwindcss(), sveltekit({ adapter: adapter() }), monacoFixPlugin()],
    resolve: {
		alias: {
			'#lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
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
