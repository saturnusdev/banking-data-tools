let monaco: any;

export async function createJsonEditor(el: HTMLElement, value = '{}', language = 'json') {
	if (!monaco) {
		monaco = await import('monaco-editor');

		// Configure Monaco environment to use a dummy worker to avoid errors
		(self as any).MonacoEnvironment = {
			getWorker: function () {
				return {
					postMessage: function () {},
					terminate: function () {},
					addEventListener: function () {},
					removeEventListener: function () {},
					dispatchEvent: function () {
						return false;
					},
					onerror: null,
					onmessage: null,
					onmessageerror: null
				} as Worker;
			}
		};

		// Configure JSON language features with minimal validation
		monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
			validate: false, // Disable validation to avoid worker dependency
			allowComments: true,
			enableSchemaRequest: false,
			trailingCommas: 'ignore'
		});

		// Register a lightweight YAML language for syntax highlighting
		if (!monaco.languages.getLanguages().some((l: any) => l.id === 'yaml')) {
			monaco.languages.register({ id: 'yaml' });
		}
		monaco.languages.setLanguageConfiguration('yaml', {
			comments: { lineComment: '#' },
			brackets: [
				['{', '}'],
				['[', ']']
			],
			autoClosingPairs: [
				{ open: '{', close: '}' },
				{ open: '[', close: ']' },
				{ open: '"', close: '"' },
				{ open: "'", close: "'" }
			],
			surroundingPairs: [
				{ open: '{', close: '}' },
				{ open: '[', close: ']' },
				{ open: '"', close: '"' },
				{ open: "'", close: "'" }
			]
		});
		monaco.languages.setMonarchTokensProvider('yaml', {
			defaultToken: '',
			tokenizer: {
				root: [
					[/^[ \t]*#[^\n]*/, 'comment'],
					[/^[ \t]*[^#\s][^:]*:(?=\s|$)/, 'key'],
					[/^[ \t]*- [^#\n]+/, 'string'],
					[/#[^\n]*/, 'comment'],
					[/"[^"]*"/, 'string'],
					[/'[^']*'/, 'string'],
					[/\b(true|false|null|yes|no|on|off|~)\b/i, 'keyword'],
					[/-?\d+\.\d+([eE][+-]?\d+)?/, 'number.float'],
					[/-?\d+([eE][+-]?\d+)?/, 'number'],
					[/[&*][A-Za-z0-9_-]+/, 'tag'],
					[/![A-Za-z0-9_!-]+|!<[^>]+>/, 'tag']
				]
			}
		});
	}

	const editor = monaco.editor.create(el, {
		value,
		language,
		theme: 'vs',
		automaticLayout: true,
		wordWrap: 'on',
		formatOnPaste: true,
		formatOnType: true,
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
		renderLineHighlight: 'gutter',
		fontSize: 14,
		fontFamily:
			'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
	});

	return editor;
}
