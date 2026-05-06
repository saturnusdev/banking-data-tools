self.onmessage = (e) => {
    try {
        const parsed = JSON.parse(e.data);
        self.postMessage({ ok: true, data: parsed });
    } catch (err) {
        self.postMessage({ ok: false, error: err.message });
    }
};
