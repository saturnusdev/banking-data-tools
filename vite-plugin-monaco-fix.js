// Vite plugin to fix Monaco Editor source map issues
import { readFileSync } from 'fs';

// Vite serves files under /@fs/<absolute-path>; strip that prefix (and any ?v= cache
// query) so we can read the real file from disk. The resolveId hook is intentionally
// omitted — Vite resolves monaco-editor modules itself, and a custom resolveId would
// mangle /@fs/ paths.
const toRealPath = (id) => {
	let real = id;
	if (real.startsWith('/@fs/')) real = real.slice('/@fs/'.length);
	const q = real.indexOf('?');
	if (q !== -1) real = real.slice(0, q);
	return real;
};

export function monacoFixPlugin() {
	return {
		name: 'monaco-fix',
		enforce: 'pre',
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
		load(id) {
			// Strip the trailing `//# sourceMappingURL=...` comments from Monaco Editor
			// modules. monaco-editor ships these comments but omits the actual .map files
			// (e.g. marked.esm.js.map), which makes Vite throw "Failed to load source map".
			const real = toRealPath(id);
			if (real.includes('monaco-editor') && (real.endsWith('.js') || real.endsWith('.mjs'))) {
				try {
					const code = readFileSync(real, 'utf8');
					return code.replace(/\/\/# sourceMappingURL=[^\n]*\n?/g, '');
				} catch {
					return null;
				}
			}
			return null;
		}
	};
}
