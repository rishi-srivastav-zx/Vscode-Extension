const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class SoundEngine {
    constructor(context) {
        this.context = context;
        this.soundsPath = path.join(context.extensionPath, "sounds");
    }

    async play(type) {
        console.log(`CodeCore: SoundEngine.play('${type}') called`);
        const config = vscode.workspace.getConfiguration("codecore");
        if (!config.get("soundEnabled", true)) {
            console.log("CodeCore: Sound is disabled in settings");
            return;
        }

        const filePath = this.getSoundFilePath(type);
        if (!filePath) {
            console.log(`CodeCore: No sound file found for '${type}'`);
            return;
        }

        console.log(`CodeCore: Playing sound file: ${filePath}`);
        try {
            await this.playFile(filePath);
        } catch (error) {
            console.error(`CodeCore: Error playing '${type}':`, error);
        }
    }

    getSoundFilePath(type) {
        const extensions = [".mp3", ".wav", ".ogg", ".m4a"];
        const searchDirs = [];

        if (this.soundsPath) searchDirs.push(this.soundsPath);
        if (this.context && this.context.extensionPath) {
            searchDirs.push(path.join(this.context.extensionPath, "media"));
        }

        const fallbacks = {
            save: "commit",
            errorFix: "achievement",
            levelUp: "levelup",
            errorfix: "achievement",
        };

        const typesToTry = [type];
        if (fallbacks[type]) typesToTry.push(fallbacks[type]);

        for (const searchType of typesToTry) {
            const targetNames = extensions.map((ext) => `${searchType}${ext}`);

            for (const dir of searchDirs) {
                try {
                    if (!fs.existsSync(dir)) continue;

                    // Fast path: exact filenames
                    for (const name of targetNames) {
                        const filePath = path.join(dir, name);
                        if (fs.existsSync(filePath)) return filePath;
                    }

                    // Case-insensitive fallback: scan directory
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const lowerFile = file.toLowerCase();
                        for (const targetName of targetNames) {
                            if (lowerFile === targetName.toLowerCase()) {
                                return path.join(dir, file);
                            }
                        }
                    }
                } catch (err) {
                    console.error(
                        `SoundEngine: error scanning ${dir}:`,
                        err.message,
                    );
                }
            }
        }

        return null;
    }

    async playFile(filePath) {
        const config = vscode.workspace.getConfiguration("codecore");
        const volume = config.get("soundVolume", 0.5);

        const escapedPath = filePath.replace(/'/g, "''");
        const command = `powershell -c "Add-Type -AssemblyName PresentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open('${escapedPath}'); $player.Volume = ${volume}; $player.Play(); Start-Sleep -s 10"`;

        const { exec } = require("child_process");
        exec(command, (error) => {
            if (error && !error.killed) {
                console.error(
                    `SoundEngine: PowerShell error: ${error.message}`,
                );
            }
        });
    }
}

class SoundEventHandler {
    constructor(soundEngine) {
        this.soundEngine = soundEngine;
        this.disposables = [];
        this.lastPasteTime = 0;
        this.fileCreateTimes = new Map();
    }

    async register() {
        console.log("CodeCore: SoundEventHandler active");

        this.registerPasteDetection();

        return this.disposables;
    }

    registerPasteDetection() {
        // Use text document change listener with paste detection logic
        const pasteDisposable = vscode.workspace.onDidChangeTextDocument(
            (event) => {
                const changes = event.contentChanges;
                if (changes.length === 0) return;

                // Detect paste: multiple changes or large single insert without range overlap
                const isPaste = changes.some((change) => {
                    // Pasted content is usually larger than 1 char and has specific range pattern
                    return (
                        change.text.length > 1 &&
                        change.rangeLength === 0 &&
                        change.range.start.line === change.range.end.line &&
                        change.range.start.character ===
                            change.range.end.character
                    );
                });

                if (isPaste) {
                    const now = Date.now();
                    if (now - this.lastPasteTime > 500) {
                        // 500ms debounce
                        this.soundEngine.play("paste");
                        this.lastPasteTime = now;
                    }
                }
            },
        );

        this.disposables.push(pasteDisposable);
    }

    triggerLevelUp() {
        this.soundEngine.play("levelUp");
    }
    triggerAchievement() {
        this.soundEngine.play("achievement");
    }

    dispose() {
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
}

async function activate(context) {
    const soundEngine = new SoundEngine(context);
    const eventHandler = new SoundEventHandler(soundEngine);

    const disposables = await eventHandler.register();
    context.subscriptions.push(...disposables);
    context.subscriptions.push(eventHandler);

    console.log("CodeCore SoundEngine: Active");
}

function deactivate() {}

module.exports = { activate, deactivate };
module.exports.SoundEngine = SoundEngine;
module.exports.SoundEventHandler = SoundEventHandler;
