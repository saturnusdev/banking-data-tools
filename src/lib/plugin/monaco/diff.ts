export async function createDiffEditor(
    el: HTMLElement,
    original: string,
    modified: string
) {
    const monaco = await import('monaco-editor');

    const diffEditor = monaco.editor.createDiffEditor(el, {
        theme: 'vs-light',
        automaticLayout: true
    });

    diffEditor.setModel({
        original: monaco.editor.createModel(original, 'json'),
        modified: monaco.editor.createModel(modified, 'json')
    });

    return diffEditor;
}
