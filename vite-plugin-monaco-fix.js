// Vite plugin to fix Monaco Editor source map issues
import { resolve } from 'path';

export function monacoFixPlugin() {
	return {
		name: 'monaco-fix',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				// Intercept Monaco Editor source map requests
				if (req.url && req.url.includes('monaco-editor') && req.url.endsWith('.map')) {
					res.writeHead(404, { 'Content-Type': 'text/plain' });
					res.end('Source maps disabled for Monaco Editor');
					return;
				}
				next();
			});
		},
		resolveId(id) {
			// Handle Monaco Editor module resolution
			if (id.includes('monaco-editor')) {
				// Return resolved path without source map
				const resolved = resolve(id);
				return resolved;
			}
			return null;
		},
		load(id) {
			// Override Monaco Editor source map loading
			if (id.includes('monaco-editor') && id.endsWith('.map')) {
				return null; // Don't load source maps
			}
			return null;
		}
	};
}
