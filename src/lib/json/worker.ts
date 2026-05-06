export function parseJsonInWorker(value: string) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            new URL('../../workers/json.worker.ts', import.meta.url),
            { type: 'module' }
        );

        worker.postMessage(value);

        worker.onmessage = (e) => {
            worker.terminate();
            e.data.ok ? resolve(e.data.data) : reject(e.data.error);
        };
    });
}
