const KEY = 'json-presets';

export function savePreset(name: string, config: object) {
    const presets = loadPresets();
    presets[name] = config;
    localStorage.setItem(KEY, JSON.stringify(presets));
}

export function loadPresets() {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
}
