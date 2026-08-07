// Polyglot Application Logic - Translation Engine, TTS/STT, Activity Hub & Flashcards

// 50+ Supported Languages
const languages = {
    "auto": "Detect Language",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "bn": "Bengali",
    "pa": "Punjabi",
    "nl": "Dutch",
    "el": "Greek",
    "tr": "Turkish",
    "pl": "Polish",
    "sv": "Swedish",
    "no": "Norwegian",
    "da": "Danish",
    "fi": "Finnish",
    "cs": "Czech",
    "hu": "Hungarian",
    "ro": "Romanian",
    "sk": "Slovak",
    "uk": "Ukrainian",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian",
    "ms": "Malay",
    "tl": "Tagalog (Filipino)",
    "he": "Hebrew",
    "fa": "Persian",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "gu": "Gujarati",
    "ur": "Urdu",
    "sw": "Swahili",
    "zu": "Zulu",
    "af": "Afrikaans",
    "cy": "Welsh",
    "ga": "Irish",
    "is": "Icelandic",
    "la": "Latin",
    "eo": "Esperanto"
};

// TTS Locale Map to match standard speechSynthesis locales
const ttsLocaleMap = {
    "en": "en-US",
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "it": "it-IT",
    "pt": "pt-PT",
    "ru": "ru-RU",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "ar": "ar-SA",
    "hi": "hi-IN",
    "bn": "bn-IN",
    "pa": "pa-IN",
    "nl": "nl-NL",
    "el": "el-GR",
    "tr": "tr-TR",
    "pl": "pl-PL",
    "sv": "sv-SE",
    "no": "no-NO",
    "da": "da-DK",
    "fi": "fi-FI",
    "cs": "cs-CZ",
    "hu": "hu-HU",
    "ro": "ro-RO",
    "sk": "sk-SK",
    "uk": "uk-UA",
    "vi": "vi-VN",
    "th": "th-TH",
    "id": "id-ID",
    "ms": "ms-MY",
    "tl": "fil-PH",
    "he": "he-IL",
    "fa": "fa-IR",
    "ta": "ta-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "ur": "ur-PK",
    "sw": "sw-KE",
    "zu": "zu-ZA",
    "af": "af-ZA",
    "cy": "cy-GB",
    "ga": "ga-IE",
    "is": "is-IS",
    "la": "la",
    "eo": "eo"
};

// Travel Phrasebook Phrases Database (Categorized)
const phrasebookData = {
    essentials: [
        { english: "Hello, how are you?", context: "Greeting" },
        { english: "Thank you very much.", context: "Gratitude" },
        { english: "Please.", context: "Politeness" },
        { english: "Yes, please.", context: "Agreement" },
        { english: "No, thank you.", context: "Refusal" },
        { english: "Excuse me.", context: "Pardon" },
        { english: "Do you speak English?", context: "Communication" },
        { english: "I don't understand.", context: "Communication" }
    ],
    travel: [
        { english: "Where is the train station?", context: "Directions" },
        { english: "How much is a ticket?", context: "Transit" },
        { english: "Where is the nearest hotel?", context: "Accommodation" },
        { english: "Could you help me, please?", context: "Request" },
        { english: "Is it far from here?", context: "Directions" },
        { english: "Turn left here.", context: "Directions" },
        { english: "Turn right at the light.", context: "Directions" },
        { english: "Stop here, please.", context: "Transit" }
    ],
    dining: [
        { english: "A table for two, please.", context: "Dining" },
        { english: "Could I see the menu, please?", context: "Dining" },
        { english: "I am a vegetarian.", context: "Dietary" },
        { english: "Water, please.", context: "Drinks" },
        { english: "The bill, please.", context: "Payment" },
        { english: "Is service included?", context: "Payment" },
        { english: "This is delicious!", context: "Feedback" },
        { english: "Cheers!", context: "Toast" }
    ],
    shopping: [
        { english: "How much does this cost?", context: "Pricing" },
        { english: "Do you accept credit cards?", context: "Payment" },
        { english: "I'm just looking, thank you.", context: "Browsing" },
        { english: "Can I try this on?", context: "Clothing" },
        { english: "Do you have this in a larger size?", context: "Clothing" },
        { english: "It is too expensive.", context: "Feedback" },
        { english: "Is there a discount?", context: "Bargaining" },
        { english: "I will take it.", context: "Purchase" }
    ],
    emergency: [
        { english: "I need help immediately!", context: "Emergency" },
        { english: "Please call an ambulance.", context: "Medical" },
        { english: "Where is the pharmacy?", context: "Medical" },
        { english: "I have lost my passport.", context: "Police" },
        { english: "Where is the police station?", context: "Police" },
        { english: "I feel very sick.", context: "Medical" },
        { english: "Fire!", context: "Danger" },
        { english: "Stop thief!", context: "Danger" }
    ]
};

// Application State
let currentSourceLang = "auto";
let currentTargetLang = "es";
let history = [];
let favorites = [];
let currentFlashcardIndex = 0;
let isOffline = !navigator.onLine;

// Speech APIs Initialization
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
}
let currentAudio = null; // Track current Google TTS Audio element

// DOM Elements
const sourceLangBtn = document.getElementById("source-lang-btn");
const targetLangBtn = document.getElementById("target-lang-btn");
const sourceOptionsList = document.getElementById("source-options-list");
const targetOptionsList = document.getElementById("target-options-list");
const sourceLangWrapper = document.getElementById("source-lang-wrapper");
const targetLangWrapper = document.getElementById("target-lang-wrapper");
const swapLangsBtn = document.getElementById("swap-langs");

const sourceText = document.getElementById("source-text");
const targetText = document.getElementById("target-text");
const charCounter = document.getElementById("char-counter");
const clearTextBtn = document.getElementById("clear-text");
const translateTriggerBtn = document.getElementById("translate-trigger-btn");
const translatorLoader = document.getElementById("translator-loader");

const micBtn = document.getElementById("mic-btn");
const speakSourceBtn = document.getElementById("speak-source");
const speakTargetBtn = document.getElementById("speak-target");
const copyBtn = document.getElementById("copy-btn");
const shareBtn = document.getElementById("share-btn");
const favBtn = document.getElementById("fav-btn");
const favCountBadge = document.getElementById("fav-count");

const themeToggleBtn = document.getElementById("theme-toggle");
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const sidebarCloseBtn = document.getElementById("sidebar-close");
const sidebarDrawer = document.getElementById("sidebar-drawer");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const offlineBar = document.getElementById("offline-bar");

const historyList = document.getElementById("history-list");
const favoritesList = document.getElementById("favorites-list");
const searchHistory = document.getElementById("search-history");
const searchFavorites = document.getElementById("search-favorites");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const clearFavoritesBtn = document.getElementById("clear-favorites-btn");

const fileUploader = document.getElementById("file-uploader");
const fileNameDisplay = document.getElementById("file-name-display");
const dragOverlay = document.getElementById("drag-overlay");
const sourceCard = document.getElementById("source-card");

// Phrasebook DOM Elements
const phrasesGrid = document.getElementById("phrases-grid");
const phraseCategories = document.getElementById("phrase-categories");

// Flashcard DOM Elements
const flashcardGameContainer = document.getElementById("flashcard-game-container");
const flashcardEmptyState = document.getElementById("flashcard-empty-state");
const flashcardDeck = document.getElementById("flashcard-deck");
const flashcard = document.getElementById("flashcard");
const cardSourceText = document.getElementById("card-source-text");
const cardTargetText = document.getElementById("card-target-text");
const cardProgressIndicator = document.getElementById("card-progress-indicator");
const cardPrevBtn = document.getElementById("card-prev");
const cardNextBtn = document.getElementById("card-next");
const cardSpeakTargetBtn = document.getElementById("card-speak-target-btn");
const cardMarkEasyBtn = document.getElementById("card-mark-easy");
const cardMarkAgainBtn = document.getElementById("card-mark-again");

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    loadLocalStorageData();
    populateLanguagesList();
    bindEvents();
    renderPhrases("essentials");
    updateOfflineStatus();
});

// Load Theme from LocalStorage
function loadTheme() {
    const savedTheme = localStorage.getItem("polyglot-theme") || "dark";
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove("light-mode");
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

// Load Favorites & History
function loadLocalStorageData() {
    try {
        history = JSON.parse(localStorage.getItem("polyglot-history")) || [];
        favorites = JSON.parse(localStorage.getItem("polyglot-favorites")) || [];
    } catch (e) {
        history = [];
        favorites = [];
    }
    updateFavoritesBadge();
    renderHistory();
    renderFavorites();
}

function updateFavoritesBadge() {
    favCountBadge.textContent = favorites.length;
    if (favorites.length > 0) {
        favCountBadge.style.display = "inline-block";
    } else {
        favCountBadge.style.display = "none";
    }
}

// Populate language select list dropdown panels
function populateLanguagesList() {
    // Populate Source Dropdown (includes Auto Detect)
    sourceOptionsList.innerHTML = "";
    Object.entries(languages).forEach(([code, name]) => {
        const option = document.createElement("div");
        option.classList.add("option-item");
        if (code === currentSourceLang) option.classList.add("selected");
        option.dataset.value = code;
        option.innerHTML = `<span>${name}</span>${code === currentSourceLang ? '<i class="fa-solid fa-check"></i>' : ''}`;
        
        option.addEventListener("click", () => selectSourceLanguage(code));
        sourceOptionsList.appendChild(option);
    });

    // Populate Target Dropdown (excludes Auto Detect)
    targetOptionsList.innerHTML = "";
    Object.entries(languages).forEach(([code, name]) => {
        if (code === "auto") return;
        const option = document.createElement("div");
        option.classList.add("option-item");
        if (code === currentTargetLang) option.classList.add("selected");
        option.dataset.value = code;
        option.innerHTML = `<span>${name}</span>${code === currentTargetLang ? '<i class="fa-solid fa-check"></i>' : ''}`;
        
        option.addEventListener("click", () => selectTargetLanguage(code));
        targetOptionsList.appendChild(option);
    });

    updateDropdownTriggerLabels();
}

function updateDropdownTriggerLabels() {
    sourceLangBtn.innerHTML = `<span class="selected-text"><i class="fa-solid fa-globe"></i> ${languages[currentSourceLang]}</span> <i class="fa-solid fa-chevron-down select-chevron"></i>`;
    targetLangBtn.innerHTML = `<span class="selected-text"><i class="fa-solid fa-globe"></i> ${languages[currentTargetLang]}</span> <i class="fa-solid fa-chevron-down select-chevron"></i>`;
}

function selectSourceLanguage(code) {
    currentSourceLang = code;
    sourceOptionsList.querySelectorAll(".option-item").forEach(item => {
        item.classList.toggle("selected", item.dataset.value === code);
        const check = item.querySelector(".fa-check");
        if (check) check.remove();
        if (item.dataset.value === code) {
            item.innerHTML += '<i class="fa-solid fa-check"></i>';
        }
    });
    updateDropdownTriggerLabels();
    sourceLangWrapper.classList.remove("open");
    
    // Adjust speech dictation language if recognition runs
    showToast(`Source language set to: ${languages[code]}`, "info");
}

function selectTargetLanguage(code) {
    if (code === "auto") return;
    currentTargetLang = code;
    targetOptionsList.querySelectorAll(".option-item").forEach(item => {
        item.classList.toggle("selected", item.dataset.value === code);
        const check = item.querySelector(".fa-check");
        if (check) check.remove();
        if (item.dataset.value === code) {
            item.innerHTML += '<i class="fa-solid fa-check"></i>';
        }
    });
    updateDropdownTriggerLabels();
    targetLangWrapper.classList.remove("open");
    showToast(`Target language set to: ${languages[code]}`, "info");
    
    // If there's text, auto translate on change
    if (sourceText.value.trim()) {
        translate();
    }
}

// Bind event listeners
function bindEvents() {
    // Theme Toggle
    themeToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");
        const mode = document.body.classList.contains("light-mode") ? "light" : "dark";
        localStorage.setItem("polyglot-theme", mode);
        themeToggleBtn.innerHTML = mode === "light" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        showToast(`${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode Enabled`, "info");
    });

    // Navigation Tabs
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            
            btn.classList.add("active");
            const tabName = btn.dataset.tab;
            document.getElementById(`tab-${tabName}`).classList.add("active");
            
            if (tabName === "flashcards") {
                initFlashcardDeck();
            }
        });
    });

    // Go Translate Button in Flashcards Empty State
    document.querySelectorAll(".go-translate-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelector('.nav-btn[data-tab="translator"]').click();
        });
    });

    // Sidebar Toggle
    sidebarToggleBtn.addEventListener("click", openSidebar);
    sidebarCloseBtn.addEventListener("click", closeSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    // Custom dropdown panel trigger toggle
    sourceLangBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sourceLangWrapper.classList.toggle("open");
        targetLangWrapper.classList.remove("open");
    });

    targetLangBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        targetLangWrapper.classList.toggle("open");
        sourceLangWrapper.classList.remove("open");
    });

    document.addEventListener("click", () => {
        sourceLangWrapper.classList.remove("open");
        targetLangWrapper.classList.remove("open");
    });

    // Search filters in dropdowns
    document.querySelectorAll(".lang-search").forEach(input => {
        input.addEventListener("click", (e) => e.stopPropagation());
        input.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const panel = e.target.closest(".custom-options-panel");
            const items = panel.querySelectorAll(".option-item");
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = "flex";
                } else {
                    item.style.display = "none";
                }
            });
        });
    });

    // Swap Languages button
    swapLangsBtn.addEventListener("click", () => {
        if (currentSourceLang === "auto") {
            showToast("Cannot swap with 'Detect Language'", "error");
            return;
        }
        const temp = currentSourceLang;
        currentSourceLang = currentTargetLang;
        currentTargetLang = temp;
        
        // Re-render lists
        populateLanguagesList();
        
        // Swap text values
        const srcVal = sourceText.value;
        const tgtVal = targetText.textContent;
        
        if (tgtVal && tgtVal !== "Translation will appear here...") {
            sourceText.value = tgtVal;
            targetText.textContent = srcVal;
            targetText.classList.remove("empty");
        }
        
        updateCharCounter();
        showToast("Languages Swapped", "success");
    });

    // Textarea characters counting & buttons showing
    sourceText.addEventListener("input", () => {
        updateCharCounter();
        if (sourceText.value.trim() === "") {
            clearTextBtn.classList.add("hidden");
            speakSourceBtn.disabled = true;
            targetText.textContent = "Translation will appear here...";
            targetText.classList.add("empty");
            copyBtn.disabled = true;
            shareBtn.disabled = true;
            favBtn.disabled = true;
            speakTargetBtn.disabled = true;
        } else {
            clearTextBtn.classList.remove("hidden");
            speakSourceBtn.disabled = false;
        }
    });

    clearTextBtn.addEventListener("click", () => {
        sourceText.value = "";
        clearTextBtn.classList.add("hidden");
        speakSourceBtn.disabled = true;
        targetText.textContent = "Translation will appear here...";
        targetText.classList.add("empty");
        copyBtn.disabled = true;
        shareBtn.disabled = true;
        favBtn.disabled = true;
        speakTargetBtn.disabled = true;
        updateCharCounter();
    });

    // Translate Trigger
    translateTriggerBtn.addEventListener("click", translate);
    
    // Keyboard shortcut (Ctrl + Enter) to translate
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
            translate();
        }
    });

    // Copy to Clipboard
    copyBtn.addEventListener("click", () => {
        const text = targetText.textContent;
        if (text && text !== "Translation will appear here...") {
            navigator.clipboard.writeText(text).then(() => {
                showToast("Translation Copied!", "success");
            }).catch(() => {
                showToast("Failed to copy", "error");
            });
        }
    });

    // Share Translation
    shareBtn.addEventListener("click", () => {
        const text = targetText.textContent;
        if (navigator.share && text) {
            navigator.share({
                title: "Polyglot Translation",
                text: `${sourceText.value} → ${text} (Translated using Polyglot)`
            }).then(() => {
                showToast("Shared successfully!", "success");
            }).catch((err) => {
                console.log("Error sharing:", err);
            });
        } else {
            showToast("Web Share not supported in this browser. Copied instead!", "info");
            navigator.clipboard.writeText(text);
        }
    });

    // Save Favorite
    favBtn.addEventListener("click", toggleFavoriteCurrent);

    // Text to Speech
    speakSourceBtn.addEventListener("click", () => {
        speak(sourceText.value, currentSourceLang, "source");
    });

    speakTargetBtn.addEventListener("click", () => {
        speak(targetText.textContent, currentTargetLang, "target");
    });

    // Speech to Text (Microphone dictation)
    if (recognition) {
        micBtn.addEventListener("click", toggleDictation);
    } else {
        micBtn.disabled = true;
        micBtn.title = "Speech recognition not supported in this browser";
    }

    // Drag and Drop Text File
    sourceCard.addEventListener("dragover", (e) => {
        e.preventDefault();
        dragOverlay.classList.add("active");
    });

    dragOverlay.addEventListener("dragleave", () => {
        dragOverlay.classList.remove("active");
    });

    dragOverlay.addEventListener("drop", (e) => {
        e.preventDefault();
        dragOverlay.classList.remove("active");
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleTextFile(files[0]);
        }
    });

    fileUploader.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleTextFile(e.target.files[0]);
        }
    });

    // Online/Offline detection listeners
    window.addEventListener("online", () => {
        isOffline = false;
        updateOfflineStatus();
        showToast("Internet connection restored", "success");
    });
    
    window.addEventListener("offline", () => {
        isOffline = true;
        updateOfflineStatus();
        showToast("You are offline. Using offline dictionary cache.", "error");
    });

    // Sidebar drawer search & clean actions
    searchHistory.addEventListener("input", renderHistory);
    searchFavorites.addEventListener("input", renderFavorites);
    
    clearHistoryBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all history?")) {
            history = [];
            localStorage.setItem("polyglot-history", JSON.stringify(history));
            renderHistory();
            showToast("History Cleared", "success");
        }
    });

    clearFavoritesBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all favorites? This will also clear flashcards.")) {
            favorites = [];
            localStorage.setItem("polyglot-favorites", JSON.stringify(favorites));
            updateFavoritesBadge();
            renderFavorites();
            showToast("Favorites Cleared", "success");
        }
    });

    // Sidebar Tab Switching
    document.querySelectorAll(".drawer-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".drawer-tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".drawer-tab-content").forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(`drawer-tab-${btn.dataset.drawerTab}`).classList.add("active");
        });
    });

    // Phrasebook categories switcher
    phraseCategories.querySelectorAll(".category-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            phraseCategories.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderPhrases(btn.dataset.category);
        });
    });

    // Flashcard Flip
    flashcardDeck.addEventListener("click", () => {
        flashcard.classList.toggle("flipped");
    });

    cardSpeakTargetBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Avoid flipping the card when clicking speak
        if (favorites.length > 0) {
            const card = favorites[currentFlashcardIndex];
            speak(card.translated, card.targetCode, "flashcard");
        }
    });

    cardNextBtn.addEventListener("click", () => {
        if (currentFlashcardIndex < favorites.length - 1) {
            currentFlashcardIndex++;
            showFlashcard(currentFlashcardIndex);
        }
    });

    cardPrevBtn.addEventListener("click", () => {
        if (currentFlashcardIndex > 0) {
            currentFlashcardIndex--;
            showFlashcard(currentFlashcardIndex);
        }
    });

    cardMarkEasyBtn.addEventListener("click", () => {
        if (favorites.length > 0) {
            const phrase = favorites[currentFlashcardIndex];
            // Remove from favorites/flashcard list
            favorites.splice(currentFlashcardIndex, 1);
            localStorage.setItem("polyglot-favorites", JSON.stringify(favorites));
            updateFavoritesBadge();
            renderFavorites();
            showToast("Marked as known and removed from active deck!", "success");
            
            if (favorites.length === 0) {
                initFlashcardDeck();
            } else {
                if (currentFlashcardIndex >= favorites.length) {
                    currentFlashcardIndex = favorites.length - 1;
                }
                showFlashcard(currentFlashcardIndex);
            }
        }
    });

    cardMarkAgainBtn.addEventListener("click", () => {
        showToast("Marked for review. Try to flip the card again!", "info");
        // Move to the next card or flip it back
        flashcard.classList.remove("flipped");
        setTimeout(() => {
            if (currentFlashcardIndex < favorites.length - 1) {
                currentFlashcardIndex++;
            } else {
                currentFlashcardIndex = 0;
            }
            showFlashcard(currentFlashcardIndex);
        }, 300);
    });
}

function openSidebar() {
    sidebarDrawer.classList.add("open");
    sidebarOverlay.classList.add("active");
}

function closeSidebar() {
    sidebarDrawer.classList.remove("open");
    sidebarOverlay.classList.remove("active");
}

function updateCharCounter() {
    const len = sourceText.value.length;
    charCounter.textContent = `${len} / 5000`;
}

function updateOfflineStatus() {
    if (isOffline) {
        offlineBar.classList.remove("hidden");
    } else {
        offlineBar.classList.add("hidden");
    }
}

// Drag & Drop File Reading
function handleTextFile(file) {
    if (file.type !== "text/plain" && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
        showToast("Unsupported file type. Please upload a .txt or .md file", "error");
        return;
    }
    
    fileNameDisplay.textContent = `Reading: ${file.name}`;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        if (text.length > 5000) {
            sourceText.value = text.substring(0, 5000);
            showToast("File truncated to 5000 characters limit", "warn");
        } else {
            sourceText.value = text;
            showToast("File loaded successfully!", "success");
        }
        updateCharCounter();
        clearTextBtn.classList.remove("hidden");
        speakSourceBtn.disabled = false;
        fileNameDisplay.textContent = "";
        fileUploader.value = ""; // Reset
        translate();
    };
    reader.onerror = () => {
        showToast("Failed to read file", "error");
        fileNameDisplay.textContent = "";
    };
    reader.readAsText(file);
}

// Translation Core Engine
async function translate() {
    const text = sourceText.value.trim();
    if (!text) {
        showToast("Please enter some text to translate", "warn");
        return;
    }

    // Check Offline State and Local Cache first
    const cacheKey = `${currentSourceLang}:${currentTargetLang}:${text.toLowerCase()}`;
    const cachedVal = getCachedTranslation(cacheKey);
    
    if (cachedVal) {
        setTranslationResult(cachedVal, "cache");
        return;
    }

    if (isOffline) {
        showToast("Offline mode. Translation not found in local cache.", "error");
        return;
    }

    translatorLoader.classList.remove("hidden");
    translateTriggerBtn.disabled = true;

    try {
        // Try Primary translation engine: Google Translate Unofficial (extremely fast)
        const translated = await translateGoogleGTX(text, currentSourceLang, currentTargetLang);
        setTranslationResult(translated, "google");
        saveToCache(cacheKey, translated);
        addToHistory(text, translated, currentSourceLang, currentTargetLang);
    } catch (googleError) {
        console.warn("Google Translate API failed. Trying MyMemory API fallback...", googleError);
        
        try {
            // Try Fallback engine: MyMemory Translation API
            const translated = await translateMyMemory(text, currentSourceLang, currentTargetLang);
            setTranslationResult(translated, "mymemory");
            saveToCache(cacheKey, translated);
            addToHistory(text, translated, currentSourceLang, currentTargetLang);
        } catch (myMemoryError) {
            console.error("All translation engines failed", myMemoryError);
            showToast("Translation failed. Please check network connection.", "error");
            targetText.textContent = "Error: Translation failed.";
            targetText.classList.add("empty");
        }
    } finally {
        translatorLoader.classList.add("hidden");
        translateTriggerBtn.disabled = false;
    }
}

// Google Translate GTX Fetcher
async function translateGoogleGTX(text, source, target) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google API returned status: ${response.status}`);
    const data = await response.json();
    
    // Parse Google's response segments
    let translatedText = "";
    if (data && data[0]) {
        data[0].forEach(segment => {
            if (segment[0]) translatedText += segment[0];
        });
    }
    
    if (!translatedText) throw new Error("Google API returned empty segments");
    
    // Auto language detection helper
    if (source === "auto" && data[2]) {
        const detected = data[2];
        if (languages[detected]) {
            showToast(`Language detected: ${languages[detected]}`, "info");
        }
    }
    
    return translatedText;
}

// MyMemory API Fetcher
async function translateMyMemory(text, source, target) {
    const langPair = `${source === "auto" ? "autodetect" : source}|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}&de=polyglotAppDev@example.com`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`MyMemory returned status: ${response.status}`);
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
    }
    throw new Error("MyMemory returned empty or invalid translation object");
}

// Set translation output UI values
function setTranslationResult(translated, engine) {
    targetText.textContent = translated;
    targetText.classList.remove("empty");
    
    speakTargetBtn.disabled = false;
    copyBtn.disabled = false;
    shareBtn.disabled = false;
    favBtn.disabled = false;

    // Check if it is already favorited to set active icon
    const isFav = favorites.some(f => f.original.toLowerCase() === sourceText.value.trim().toLowerCase() && f.targetCode === currentTargetLang);
    updateFavButtonIcon(isFav);
}

// Simple Cache Management in LocalStorage
function getCachedTranslation(key) {
    try {
        const cache = JSON.parse(localStorage.getItem("polyglot-cache")) || {};
        return cache[key] || null;
    } catch (e) {
        return null;
    }
}

function saveToCache(key, val) {
    try {
        const cache = JSON.parse(localStorage.getItem("polyglot-cache")) || {};
        cache[key] = val;
        // Limit cache size to 200 items to avoid running out of storage space
        const keys = Object.keys(cache);
        if (keys.length > 200) {
            delete cache[keys[0]]; // Remove oldest cached item
        }
        localStorage.setItem("polyglot-cache", JSON.stringify(cache));
    } catch (e) {
        console.warn("Storage quota exceeded, could not cache item");
    }
}

// Speech to Text (Dictation) Core
function toggleDictation() {
    if (!recognition) return;
    
    if (micBtn.classList.contains("active")) {
        recognition.stop();
    } else {
        // Find correct language code mapping for SpeechRecognition
        let recCode = currentSourceLang;
        if (recCode === "auto") {
            recCode = "en-US"; // Default to English if auto detecting
        } else {
            // Map standard speech synthesis keys to locale patterns if needed
            if (recCode === "en") recCode = "en-US";
            else if (recCode === "es") recCode = "es-ES";
            else if (recCode === "fr") recCode = "fr-FR";
            else if (recCode === "de") recCode = "de-DE";
            else if (recCode === "it") recCode = "it-IT";
            else if (recCode === "hi") recCode = "hi-IN";
            else if (recCode === "ja") recCode = "ja-JP";
            else if (recCode === "ko") recCode = "ko-KR";
        }
        
        recognition.lang = recCode;
        
        try {
            recognition.start();
            micBtn.classList.add("active");
            document.getElementById("dictation-indicator").classList.remove("hidden");
            showToast("Speak into your microphone...", "info");
        } catch (e) {
            console.error("SpeechRecognition start error:", e);
            showToast("Microphone already in use or permission denied", "error");
        }
    }
}

if (recognition) {
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (sourceText.value) {
            sourceText.value += " " + transcript;
        } else {
            sourceText.value = transcript;
        }
        updateCharCounter();
        clearTextBtn.classList.remove("hidden");
        speakSourceBtn.disabled = false;
        translate(); // Auto translate what was spoken
    };

    recognition.onend = () => {
        micBtn.classList.remove("active");
        document.getElementById("dictation-indicator").classList.add("hidden");
    };

    recognition.onerror = (event) => {
        console.error("Recognition Error:", event.error);
        if (event.error !== "no-speech") {
            showToast(`Speech recognition error: ${event.error}`, "error");
        }
    };
}

// Text to Speech Core
function speak(text, langCode, targetSide) {
    if (!text) return;
    
    // Stop any current audio elements
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    // Cancel active speechSynthesis
    window.speechSynthesis.cancel();

    // Visual Wave Animation trigger
    const waveElement = document.getElementById(`speaking-wave-${targetSide}`);
    if (waveElement) waveElement.classList.remove("hidden");

    let speakLang = langCode;
    if (speakLang === "auto") {
        speakLang = "en"; // Default target read language
    }

    // Try Google Translate TTS first (since we have no-referrer, this works perfectly and supports all languages with high quality)
    if (!isOffline) {
        try {
            playGoogleTTS(text, speakLang, waveElement);
            return; // Exit if playing online voice
        } catch (err) {
            console.warn("Google TTS failed to launch, falling back to local speech synthesis...", err);
        }
    }

    // Fallback: Local Speech Synthesis (runs offline)
    playLocalSpeechSynthesis(text, speakLang, waveElement);
}

// Google Translate TTS player
function playGoogleTTS(text, lang, waveElement) {
    const fullLocale = ttsLocaleMap[lang] || lang;
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${fullLocale}&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    // Create DOM audio element dynamically with referrerpolicy set to no-referrer
    const audio = document.createElement("audio");
    audio.setAttribute("referrerpolicy", "no-referrer");
    audio.src = ttsUrl;
    currentAudio = audio;
    
    audio.play().then(() => {
        audio.onended = () => {
            if (waveElement) waveElement.classList.add("hidden");
        };
    }).catch(err => {
        console.warn("Google TTS playback blocked or failed, falling back to SpeechSynthesis...", err);
        playLocalSpeechSynthesis(text, lang, waveElement);
    });
}

// Browser Local Speech Synthesis fallback
function playLocalSpeechSynthesis(text, lang, waveElement) {
    const fullLocale = ttsLocaleMap[lang] || lang;
    const synthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = fullLocale;
    
    // Save reference globally to prevent GC
    window.activeUtterance = utterance;

    // Find local matching voice
    const voices = synthesis.getVoices();
    let voice = voices.find(v => v.lang.toLowerCase() === fullLocale.toLowerCase());
    if (!voice) {
        const shortLang = fullLocale.split('-')[0].toLowerCase();
        voice = voices.find(v => v.lang.toLowerCase().startsWith(shortLang));
    }
    
    if (voice) {
        utterance.voice = voice;
    }

    utterance.onend = () => {
        if (waveElement) waveElement.classList.add("hidden");
        window.activeUtterance = null;
    };
    
    utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        if (waveElement) waveElement.classList.add("hidden");
        window.activeUtterance = null;
        showToast("Audio pronunciation not supported on this browser", "error");
    };

    try {
        synthesis.speak(utterance);
        if (synthesis.paused) {
            synthesis.resume();
        }
    } catch (err) {
        console.error("Local SpeechSynthesis failed:", err);
        if (waveElement) waveElement.classList.add("hidden");
    }
}

// Activity Hub: Favorites & History
function addToHistory(original, translated, sourceCode, targetCode) {
    const date = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = {
        id: Date.now(),
        original,
        translated,
        sourceCode,
        targetCode,
        sourceName: languages[sourceCode],
        targetName: languages[targetCode],
        time: date
    };

    // Remove duplicates
    history = history.filter(h => h.original.toLowerCase() !== original.toLowerCase() || h.targetCode !== targetCode);
    history.unshift(item);
    
    if (history.length > 50) history.pop(); // Cap at 50 history logs
    localStorage.setItem("polyglot-history", JSON.stringify(history));
    renderHistory();
}

function toggleFavoriteCurrent() {
    const orig = sourceText.value.trim();
    const trans = targetText.textContent;
    if (!orig || trans === "Translation will appear here...") return;

    const existingIndex = favorites.findIndex(f => f.original.toLowerCase() === orig.toLowerCase() && f.targetCode === currentTargetLang);

    if (existingIndex > -1) {
        // Unfavorite
        favorites.splice(existingIndex, 1);
        updateFavButtonIcon(false);
        showToast("Removed from favorites", "info");
    } else {
        // Favorite
        const favItem = {
            id: Date.now(),
            original: orig,
            translated: trans,
            sourceCode: currentSourceLang === "auto" ? "en" : currentSourceLang,
            targetCode: currentTargetLang,
            sourceName: languages[currentSourceLang === "auto" ? "en" : currentSourceLang],
            targetName: languages[currentTargetLang],
            easy: false
        };
        favorites.unshift(favItem);
        updateFavButtonIcon(true);
        showToast("Added to favorites & flashcards!", "success");
    }

    localStorage.setItem("polyglot-favorites", JSON.stringify(favorites));
    updateFavoritesBadge();
    renderFavorites();
}

function updateFavButtonIcon(isFav) {
    if (isFav) {
        favBtn.classList.add("favorited");
        favBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
    } else {
        favBtn.classList.remove("favorited");
        favBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
    }
}

// Render History list UI
function renderHistory() {
    const query = searchHistory.value.toLowerCase();
    historyList.innerHTML = "";
    
    const filteredHistory = history.filter(item => 
        item.original.toLowerCase().includes(query) || 
        item.translated.toLowerCase().includes(query)
    );

    if (filteredHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No history items found.</div>';
        return;
    }

    filteredHistory.forEach(item => {
        const el = document.createElement("div");
        el.classList.add("activity-item");
        el.innerHTML = `
            <div class="activity-item-header">
                <span class="activity-lang-tags">${item.sourceName} <i class="fa-solid fa-arrow-right-long"></i> ${item.targetName}</span>
                <span>${item.time}</span>
            </div>
            <div class="activity-item-body">
                <span class="activity-orig">${item.original}</span>
                <span class="activity-trans">${item.translated}</span>
            </div>
            <div class="activity-actions">
                <button class="activity-mini-btn load-item-btn" title="Load into translator"><i class="fa-solid fa-rotate-left"></i></button>
                <button class="activity-mini-btn delete-item-btn" title="Delete from history"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        el.querySelector(".load-item-btn").addEventListener("click", () => {
            sourceText.value = item.original;
            currentSourceLang = item.sourceCode;
            currentTargetLang = item.targetCode;
            populateLanguagesList();
            updateCharCounter();
            clearTextBtn.classList.remove("hidden");
            speakSourceBtn.disabled = false;
            translate();
            closeSidebar();
        });

        el.querySelector(".delete-item-btn").addEventListener("click", () => {
            history = history.filter(h => h.id !== item.id);
            localStorage.setItem("polyglot-history", JSON.stringify(history));
            renderHistory();
            showToast("Item deleted", "info");
        });

        historyList.appendChild(el);
    });
}

// Render Favorites list UI
function renderFavorites() {
    const query = searchFavorites.value.toLowerCase();
    favoritesList.innerHTML = "";
    
    const filteredFavs = favorites.filter(item => 
        item.original.toLowerCase().includes(query) || 
        item.translated.toLowerCase().includes(query)
    );

    if (filteredFavs.length === 0) {
        favoritesList.innerHTML = '<div class="empty-state">No saved translations.</div>';
        return;
    }

    filteredFavs.forEach(item => {
        const el = document.createElement("div");
        el.classList.add("activity-item");
        el.innerHTML = `
            <div class="activity-item-header">
                <span class="activity-lang-tags">${item.sourceName} <i class="fa-solid fa-arrow-right-long"></i> ${item.targetName}</span>
                <button class="activity-mini-btn favorite-speak-btn"><i class="fa-solid fa-volume-high"></i></button>
            </div>
            <div class="activity-item-body">
                <span class="activity-orig">${item.original}</span>
                <span class="activity-trans">${item.translated}</span>
            </div>
            <div class="activity-actions">
                <button class="activity-mini-btn load-item-btn" title="Load into translator"><i class="fa-solid fa-rotate-left"></i></button>
                <button class="activity-mini-btn delete-item-btn" title="Unfavorite"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        el.querySelector(".favorite-speak-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            speak(item.translated, item.targetCode, "favorites");
        });

        el.querySelector(".load-item-btn").addEventListener("click", () => {
            sourceText.value = item.original;
            currentSourceLang = item.sourceCode;
            currentTargetLang = item.targetCode;
            populateLanguagesList();
            updateCharCounter();
            clearTextBtn.classList.remove("hidden");
            speakSourceBtn.disabled = false;
            translate();
            closeSidebar();
        });

        el.querySelector(".delete-item-btn").addEventListener("click", () => {
            favorites = favorites.filter(f => f.id !== item.id);
            localStorage.setItem("polyglot-favorites", JSON.stringify(favorites));
            updateFavoritesBadge();
            renderFavorites();
            
            // If the current translated is what we unfavorited, update star icon
            if (sourceText.value.trim().toLowerCase() === item.original.toLowerCase() && currentTargetLang === item.targetCode) {
                updateFavButtonIcon(false);
            }
            showToast("Removed from favorites", "info");
        });

        favoritesList.appendChild(el);
    });
}

// Smart Travel Phrasebook Generator
function renderPhrases(category) {
    phrasesGrid.innerHTML = "";
    const phrases = phrasebookData[category];
    if (!phrases) return;

    phrases.forEach(phrase => {
        const el = document.createElement("div");
        el.classList.add("phrase-card");
        el.innerHTML = `
            <div>
                <div class="phrase-orig">${phrase.english}</div>
                <div class="phrase-trans" id="phrase-trans-${category}-${phrase.english.replace(/[^a-zA-Z0-9]/g, '')}">Click to translate</div>
            </div>
            <div class="card-hint"><i class="fa-solid fa-circle-info"></i> ${phrase.context}</div>
        `;

        el.addEventListener("click", async () => {
            const transDisplay = el.querySelector(".phrase-trans");
            transDisplay.textContent = "Translating...";
            
            try {
                // Instantly fetch translation
                const trans = await translateGoogleGTX(phrase.english, "en", currentTargetLang);
                transDisplay.textContent = trans;
                
                // Set into Main Translator
                sourceText.value = phrase.english;
                currentSourceLang = "en";
                populateLanguagesList();
                updateCharCounter();
                clearTextBtn.classList.remove("hidden");
                speakSourceBtn.disabled = false;
                
                setTranslationResult(trans, "phrasebook");
                
                // Pronounce it automatically in target language!
                speak(trans, currentTargetLang, "translator");
            } catch (err) {
                console.warn("Phrases translation failed, trying fallback...", err);
                try {
                    const trans = await translateMyMemory(phrase.english, "en", currentTargetLang);
                    transDisplay.textContent = trans;
                    sourceText.value = phrase.english;
                    currentSourceLang = "en";
                    populateLanguagesList();
                    updateCharCounter();
                    clearTextBtn.classList.remove("hidden");
                    speakSourceBtn.disabled = false;
                    setTranslationResult(trans, "phrasebook");
                    speak(trans, currentTargetLang, "translator");
                } catch (e) {
                    transDisplay.textContent = "Translation failed";
                    showToast("Failed to translate phrase", "error");
                }
            }
        });

        phrasesGrid.appendChild(el);
    });
}

// Flashcard Game Engine
function initFlashcardDeck() {
    if (favorites.length === 0) {
        flashcardGameContainer.classList.add("hidden");
        flashcardEmptyState.classList.remove("hidden");
    } else {
        flashcardGameContainer.classList.remove("hidden");
        flashcardEmptyState.classList.add("hidden");
        currentFlashcardIndex = 0;
        showFlashcard(currentFlashcardIndex);
    }
}

function showFlashcard(index) {
    if (favorites.length === 0) return;
    
    // Flip card to front first
    flashcard.classList.remove("flipped");
    
    const card = favorites[index];
    
    // Add brief timeout for flip animation back to finish
    setTimeout(() => {
        cardSourceText.textContent = card.original;
        cardTargetText.textContent = card.translated;
        cardProgressIndicator.textContent = `${index + 1} / ${favorites.length}`;
        
        // Disable navigation buttons if at extremes
        cardPrevBtn.disabled = index === 0;
        cardNextBtn.disabled = index === favorites.length - 1;
    }, 150);
}

// Premium Toast Alerts
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === "success") icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === "error") icon = '<i class="fa-solid fa-circle-xmark"></i>';
    if (type === "warn") icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    
    // Remove toast after animation completes
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Inline dynamic styles for fading out toasts
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeOut {
    to { opacity: 0; transform: translateY(-20px); }
}
.empty-state {
    text-align: center;
    padding: 30px 10px;
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 500;
}
`;
document.head.appendChild(styleSheet);
