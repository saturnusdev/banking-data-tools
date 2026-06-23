import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { monacoFixPlugin } from './vite-plugin-monaco-fix';

export default defineConfig({ 
    ssr: {
        noExternal: [
            "svelte-hero-icons",
            "swagger-ui-dist",
            "@apidevtools/swagger-parser",
            "js-yaml",
            "xlsx",
            "monaco-editor",
            "xml2js",
            "terser",
            "prettier",
            "@iconify/svelte"
        ]
    },
    optimizeDeps: {
        exclude: [
            'monaco-editor',
            'monaco-editor/esm/vs/editor/editor.worker',
            'monaco-editor/esm/vs/language/json/json.worker'
        ],
        force: true
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['@iconify/svelte'],
                    swagger: ['@apidevtools/swagger-parser', 'js-yaml'],
                    monaco: ['monaco-editor'],
                    utils: ['xml2js', 'terser', 'prettier']
                }
            }
        },
        chunkSizeWarningLimit: 1000,
        sourcemap: false,
        minify: 'esbuild'
    },
    server: {
        fs: {
            // Allow serving static files from node_modules
            allow: ['..']
        }
    },
    define: {
        // Disable Monaco Editor source maps
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'MONACO_EDITOR_SOURCEMAP': JSON.stringify(false)
    },
    plugins: [tailwindcss(), sveltekit(), monacoFixPlugin()] 
});
