let monaco: any;

export async function createJsonEditor(
    el: HTMLElement,
    value = '{}'
) {
    if (!monaco) {
        monaco = await import('monaco-editor');
    }

    const editor = monaco.editor.create(el, {
        value,
        language: 'json',
        theme: 'vs-light',
        automaticLayout: true,
        space: 4,
        formatOnPaste: true,
        formatOnType: true,
        minimap: { enabled: false }
    });

    return editor;
}
