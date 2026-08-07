# Polyglot - Premium Language Translator & Learning Hub

A fully client-side, premium Web Application for translation, audio dictation, text-to-speech, travel phrases, and flashcard learning. Built with modern glassmorphic aesthetics.

## Features

1. **Robust Dual-Engine Translation**:
   - Primary: Fast Google Translate GTX Client API.
   - Fallback: MyMemory Translation API.
   - Automatically falls back to ensure 100% translation uptime.
2. **50+ Languages**: Full list of 50+ languages with automatic source language detection.
3. **Advanced custom searchable dropdowns**: Allows users to filter and find languages instantly.
4. **Speech-to-Text (Voice Dictation)**: Speak into your microphone and convert speech to text in real-time.
5. **Text-to-Speech (Pronunciation Guide)**: High-fidelity voice playback utilizing Web Speech Synthesis with an automatic Google TTS server-side audio fallback for maximum language coverage.
6. **Drag & Drop File Translator**: Drag any `.txt` or `.md` file directly onto the text area to read and translate it instantly.
7. **Offline Mode**: Connection state listener that utilizes an auto-saving translation cache to retrieve translation history even when completely offline.
8. **Interactive Travel Phrasebook**: Travel category phrases (Greetings, Dining, Travel, Shopping, Emergencies) that translate into the target language and speak on click.
9. **Interactive Flashcards Learning Deck**: Turns your favorited translations into interactive card-flip flashcards to practice language learning with progress indicators and study marks.
10. **Activity Drawer**: Save translations, manage active history logs, search logs, and clear logs.
11. **Dark & Light Themes**: Fully supported theme selector with matching glowing ambient light filters.

## File Structure

The project has been minimized to exactly **3 core files** to make it extremely easy to drag and drop onto GitHub:

- `index.html` (UI Layout & Structure)
- `styles.css` (Glassmorphic Styling & Animations)
- `script.js` (Translation engine, Speech APIs, & LocalStorage states)

## How to Run Locally

You can run this application locally using any of these methods:

### Method 1: Double-click (No installation required)
Simply navigate to the project folder and double-click `index.html` to open it in your web browser.

### Method 2: Node.js (Recommended)
Run the following command in your terminal inside this folder:
```bash
npx serve
```
Then open `http://localhost:3000` in your web browser.

### Method 3: Python
If you have Python installed, run:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

## Deploying to GitHub Pages

1. Create a new repository on GitHub.
2. Drag and drop the files (`index.html`, `styles.css`, `script.js`, `README.md`) into the repository.
3. Commit and push the changes.
4. Go to **Settings** -> **Pages** in your repository.
5. Under **Build and deployment**, set the Source to **Deploy from a branch** and select the `main` branch.
6. Click Save, and your app will be live on the web!
