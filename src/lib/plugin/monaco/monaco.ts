let monaco: any;

export async function createJsonEditor(
    el: HTMLElement,
    value = '{}'
) {
    if (!monaco) {
        monaco = await import('monaco-editor');
        
        // Configure Monaco environment to use a dummy worker to avoid errors
        (self as any).MonacoEnvironment = {
            getWorker: function() {
                return {
                    postMessage: function() {},
                    terminate: function() {},
                    addEventListener: function() {},
                    removeEventListener: function() {}
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
    }

    const editor = monaco.editor.create(el, {
        value,
        language: 'json',
        theme: 'vs-light',
        automaticLayout: true,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'gutter'
    });

    return editor;
}
