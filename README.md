# CodeSoundFX

Immersive typing sounds for VS Code with distinct audio feedback for typing, deleting, and pasting operations.

## Features

- 🎹 **Typing Sounds** - Satisfying clicks for every keystroke
- 🗑️ **Delete Sounds** - Distinct audio for backspace/delete operations  
- 📋 **Paste Sounds** - Special feedback for clipboard operations
- 🔊 **Individual Volume Control** - Adjust each sound type independently
- ⏱️ **Smart Debouncing** - Prevents audio spam when typing fast
- 🖥️ **Cross-Platform** - Works on Windows, macOS, and Linux
- 🔕 **Quick Toggle** - Enable/disable from Command Palette

## Installation

1. Copy the extension folder to your VS Code extensions directory, or
2. Package as `.vsix` and install manually:
   ```bash
   vsce package
   code --install-extension codesoundfx-1.0.0.vsix