class LocalStorage {
    constructor(context) {
        // Use globalState to persist XP, streaks, etc. across all VS Code workspaces
        this.storage = context.globalState;
    }

    async initialize() {
        // Any initialization logic can go here
        return Promise.resolve();
    }

    get(key) {
        return this.storage.get(key);
    }

    set(key, value) {
        // update returns a Thenable which can be awaited if needed
        return this.storage.update(key, value);
    }

    async update(data) {
        // Batch update multiple keys
        const promises = [];
        for (const [key, value] of Object.entries(data)) {
            promises.push(this.set(key, value));
        }
        await Promise.all(promises);
    }
}

module.exports = LocalStorage;
