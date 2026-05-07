// Lazy loading utilities for heavy dependencies

export async function loadSwaggerUI() {
	const { default: SwaggerUI } = await import('swagger-ui-dist/swagger-ui-bundle');
	return SwaggerUI;
}

export async function loadXLSX() {
	const { default: XLSX } = await import('xlsx');
	return XLSX;
}

export async function loadYAML() {
	const { default: yaml } = await import('js-yaml');
	return yaml;
}

export async function loadSwaggerParser() {
	const { default: SwaggerParser } = await import('@apidevtools/swagger-parser');
	return SwaggerParser;
}

export async function loadMonacoEditor() {
	// Disable Monaco Editor source maps
	if (typeof window !== 'undefined') {
		window.MONACO_EDITOR_SOURCEMAP = false;
	}
	
	const { default: monaco } = await import('monaco-editor');
	return monaco;
}

export async function loadTerser() {
	const { minify } = await import('terser');
	return { minify };
}

export async function loadPrettier() {
	const { default: prettier } = await import('prettier/standalone');
	const { default: parserBabel } = await import('prettier/plugins/babel');
	return { prettier, parserBabel };
}

export async function loadXML2JS() {
	const { default: xml2js } = await import('xml2js');
	return xml2js;
}
