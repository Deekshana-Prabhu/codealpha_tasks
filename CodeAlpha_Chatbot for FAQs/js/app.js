/**
 * Main Web Application Controller & UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let currentDatasetKey = 'ecommerce';
  let activeFaqs = [...DEFAULT_FAQ_DATASETS.ecommerce.faqs];
  let chatHistory = [];
  let analyticsStats = {
    totalQueries: 0,
    successfulMatches: 0,
    helpfulVotes: 0,
    unhelpfulVotes: 0,
    unresolvedQueries: []
  };

  let speechRecognition = null;
  let isRecording = false;
  let ttsEnabled = false;
  let lastNlpDetails = null;

  // Initialize Speech Recognition if supported
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRec();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';

    speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        chatInput.value = transcript;
        handleSendMessage(transcript);
      }
      stopVoiceRecording();
    };

    speechRecognition.onerror = () => {
      stopVoiceRecording();
      showToast('Voice recognition error. Please try again.', 'error');
    };

    speechRecognition.onend = () => {
      stopVoiceRecording();
    };
  }

  // Train initial NLP engine
  window.nlpEngine.train(activeFaqs);

  // Initialize UI & Event Listeners
  initTabNavigation();
  initThemeToggle();
  initAudioToggle();
  initDatasetSelector();
  initChatUI();
  initKnowledgeBaseUI();
  initTTS();
  initCodeCopyBtn();
  updateProductDisplay();
  renderKnowledgeBase();
  renderAnalytics();

  /**
   * Tab Navigation
   */
  function initTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabViews = document.querySelectorAll('.tab-view');

    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetViewId = `view-${tab.dataset.tab}`;
        
        navTabs.forEach(t => t.classList.remove('active'));
        tabViews.forEach(v => v.classList.remove('active'));

        tab.classList.add('active');
        const targetView = document.getElementById(targetViewId);
        if (targetView) targetView.classList.add('active');

        window.soundEffects.playClickSound();

        // Refresh views if necessary
        if (tab.dataset.tab === 'nlp' && lastNlpDetails) {
          renderNlpVisualizer(lastNlpDetails);
        } else if (tab.dataset.tab === 'analytics') {
          renderAnalytics();
        }
      });
    });
  }

  /**
   * Theme Toggle (Dark / Light)
   */
  function initThemeToggle() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
      const currentTheme = document.body.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', newTheme);
      themeBtn.querySelector('i').className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
      showToast(`Switched to ${newTheme} mode`);
      window.soundEffects.playClickSound();
    });
  }

  /**
   * Audio Sound FX Toggle
   */
  function initAudioToggle() {
    const audioBtn = document.getElementById('audioToggleBtn');
    if (!audioBtn) return;

    audioBtn.addEventListener('click', () => {
      window.soundEffects.enabled = !window.soundEffects.enabled;
      audioBtn.classList.toggle('active', window.soundEffects.enabled);
      audioBtn.querySelector('i').className = window.soundEffects.enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
      showToast(window.soundEffects.enabled ? 'Sound effects enabled' : 'Sound effects muted');
      window.soundEffects.playClickSound();
    });
  }

  /**
   * Text-To-Speech Toggle
   */
  function initTTS() {
    const ttsBtn = document.getElementById('ttsToggleBtn');
    if (!ttsBtn) return;

    ttsBtn.addEventListener('click', () => {
      ttsEnabled = !ttsEnabled;
      ttsBtn.classList.toggle('active', ttsEnabled);
      showToast(ttsEnabled ? 'Speech Synthesis ON' : 'Speech Synthesis OFF');
      window.soundEffects.playClickSound();
    });
  }

  function speakText(text) {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Update chosen product indicator across Header, Chat Header, and Knowledge Base View
   */
  function updateProductDisplay() {
    const currentDataset = DEFAULT_FAQ_DATASETS[currentDatasetKey];
    if (!currentDataset) return;

    // 1. Header Product Badge
    const headerName = document.getElementById('headerProductName');
    const headerBadge = document.getElementById('headerProductBadge');
    if (headerName && headerBadge) {
      headerName.textContent = currentDataset.name;
      const icon = headerBadge.querySelector('i');
      if (icon) icon.className = `fas ${currentDataset.icon || 'fa-tag'}`;
    }

    // 2. Chat Subtitle Banner
    const chatSubtitle = document.getElementById('chatHeaderSubtitle');
    if (chatSubtitle) {
      chatSubtitle.innerHTML = `Active Product: <strong>${escapeHtml(currentDataset.name)}</strong> (${activeFaqs.length} FAQs Indexed)`;
    }

    // 3. Knowledge Base View Header Title
    const kbTitle = document.getElementById('kbProductTitle');
    const kbCountBadge = document.getElementById('kbFaqCountBadge');
    if (kbTitle) {
      kbTitle.innerHTML = `<i class="fas ${currentDataset.icon || 'fa-database'}"></i> Managing FAQs for Product: <strong>${escapeHtml(currentDataset.name)}</strong>`;
    }
    if (kbCountBadge) {
      kbCountBadge.textContent = `${activeFaqs.length} FAQs loaded`;
    }
  }

  /**
   * Dataset / Product Switcher Logic
   */
  function initDatasetSelector() {
    const datasetBtns = document.querySelectorAll('.dataset-btn');
    datasetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.dataset;
        if (!DEFAULT_FAQ_DATASETS[key]) return;

        datasetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentDatasetKey = key;
        activeFaqs = [...DEFAULT_FAQ_DATASETS[key].faqs];
        
        // Retrain NLP Engine
        window.nlpEngine.train(activeFaqs);

        // Update Chosen Product Display
        updateProductDisplay();
        renderQuickTopicChips();
        renderKnowledgeBase();
        showToast(`Chosen Product: ${DEFAULT_FAQ_DATASETS[key].name}`);
        window.soundEffects.playClickSound();

        // Bot announcement in chat
        addBotMessage(`Selected product changed to <strong>${DEFAULT_FAQ_DATASETS[key].name}</strong>. Ask me any question related to this topic!`, 'high', 1.0, null, true);
      });
    });

    renderQuickTopicChips();
  }

  function renderQuickTopicChips() {
    const container = document.getElementById('quickTopicsContainer');
    if (!container) return;

    container.innerHTML = '';
    activeFaqs.forEach(faq => {
      const chip = document.createElement('button');
      chip.className = 'topic-chip';
      chip.textContent = faq.question;
      chip.addEventListener('click', () => {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.value = faq.question;
          handleSendMessage(faq.question);
        }
      });
      container.appendChild(chip);
    });
  }

  /**
   * Chat Interface Logic
   */
  function initChatUI() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const clearBtn = document.getElementById('clearChatBtn');
    const micBtn = document.getElementById('micBtn');

    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (query) {
          handleSendMessage(query);
          chatInput.value = '';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
          chatMessages.innerHTML = '';
          const currentDatasetName = DEFAULT_FAQ_DATASETS[currentDatasetKey]?.name || 'E-Commerce Store';
          addBotMessage(`Hello! 👋 I'm your AI FAQ Assistant. Chosen product: <strong>${escapeHtml(currentDatasetName)}</strong>. Select a sample question or type any question below!`, 'high', 1.0, null, true);
        }
        window.soundEffects.playClickSound();
      });
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (!speechRecognition) {
          showToast('Speech recognition is not supported in this browser.', 'warning');
          return;
        }

        if (isRecording) {
          stopVoiceRecording();
        } else {
          startVoiceRecording();
        }
      });
    }
  }

  function startVoiceRecording() {
    if (!speechRecognition) return;
    try {
      speechRecognition.start();
      isRecording = true;
      const micBtn = document.getElementById('micBtn');
      if (micBtn) micBtn.classList.add('recording');
      showToast('Listening... Speak your question now.');
    } catch (e) {
      stopVoiceRecording();
    }
  }

  function stopVoiceRecording() {
    isRecording = false;
    const micBtn = document.getElementById('micBtn');
    if (micBtn) micBtn.classList.remove('recording');
  }

  function handleSendMessage(userQuery) {
    if (!userQuery) return;

    // Add user message to UI
    addUserMessage(userQuery);
    window.soundEffects.playSendSound();

    // Increment Total Queries stat
    analyticsStats.totalQueries++;

    // Show Typing Indicator
    showTypingIndicator();

    // Query NLP Engine
    setTimeout(() => {
      removeTypingIndicator();
      const nlpResult = window.nlpEngine.findBestMatch(userQuery);
      lastNlpDetails = nlpResult.pipelineDetails;

      const { bestMatch, score, confidence, topMatches } = nlpResult;

      if (confidence === 'high') {
        analyticsStats.successfulMatches++;
        addBotMessage(bestMatch.answer, confidence, score, topMatches);
        speakText(bestMatch.answer);
      } else if (confidence === 'medium') {
        analyticsStats.successfulMatches++;
        const replyText = `Here is the closest match I found:\n\n**${bestMatch.question}**\n${bestMatch.answer}`;
        addBotMessage(replyText, confidence, score, topMatches);
        speakText(bestMatch.answer);
      } else {
        // Low/No confidence fallback
        analyticsStats.unresolvedQueries.push({
          query: userQuery,
          time: new Date().toLocaleTimeString(),
          dataset: DEFAULT_FAQ_DATASETS[currentDatasetKey].name
        });

        const fallbackMsg = `I'm sorry, I couldn't find a high-confidence match for your question. Here are some top questions you might be asking:`;
        addBotMessage(fallbackMsg, confidence, score, topMatches);
      }

      // Update Live NLP visualizer if active
      const nlpTab = document.querySelector('.nav-tab[data-tab="nlp"]');
      if (nlpTab && nlpTab.classList.contains('active')) {
        renderNlpVisualizer(nlpResult.pipelineDetails);
      }

      window.soundEffects.playReceiveSound();
    }, 450);
  }

  function addUserMessage(text) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const group = document.createElement('div');
    group.className = 'message-group user';
    group.innerHTML = `
      <div class="avatar user"><i class="fas fa-user"></i></div>
      <div class="message-bubble">${escapeHtml(text)}</div>
    `;

    container.appendChild(group);
    container.scrollTop = container.scrollHeight;
  }

  function addBotMessage(text, confidence = 'high', score = 1.0, suggestions = null, isSystem = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const group = document.createElement('div');
    group.className = 'message-group bot';

    let suggestionsHtml = '';
    if (suggestions && suggestions.length > 0) {
      suggestionsHtml = `
        <div class="suggestions-box">
          <div class="suggestions-title"><i class="fas fa-lightbulb"></i> Related Questions:</div>
          ${suggestions.map(m => `
            <button class="suggestion-chip" data-q="${escapeHtml(m.faq.question)}">
              ${escapeHtml(m.faq.question)}
            </button>
          `).join('')}
        </div>
      `;
    }

    let metaHtml = '';
    if (!isSystem) {
      const scorePct = Math.round(score * 100);
      metaHtml = `
        <div class="msg-meta">
          <span class="confidence-badge ${confidence}">${confidence} confidence</span>
          <span class="score-text">Match Score: ${scorePct}%</span>
          <div class="msg-actions">
            <button class="action-btn-sm btn-copy" title="Copy text"><i class="far fa-copy"></i></button>
            <button class="action-btn-sm btn-like" title="Helpful"><i class="far fa-thumbs-up"></i></button>
            <button class="action-btn-sm btn-dislike" title="Not helpful"><i class="far fa-thumbs-down"></i></button>
          </div>
        </div>
      `;
    }

    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

    group.innerHTML = `
      <div class="avatar bot"><i class="fas fa-robot"></i></div>
      <div class="message-bubble">
        <div>${formattedText}</div>
        ${suggestionsHtml}
        ${metaHtml}
      </div>
    `;

    // Event listeners for suggestion chips
    group.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const qText = chip.dataset.q;
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.value = qText;
          handleSendMessage(qText);
        }
      });
    });

    // Copy action
    const copyBtn = group.querySelector('.btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        showToast('Answer copied to clipboard!');
        window.soundEffects.playClickSound();
      });
    }

    // Like / Dislike actions
    const likeBtn = group.querySelector('.btn-like');
    const dislikeBtn = group.querySelector('.btn-dislike');

    if (likeBtn) {
      likeBtn.addEventListener('click', () => {
        likeBtn.classList.toggle('active-up');
        if (dislikeBtn) dislikeBtn.classList.remove('active-down');
        analyticsStats.helpfulVotes++;
        showToast('Thanks for your feedback!');
        window.soundEffects.playClickSound();
      });
    }

    if (dislikeBtn) {
      dislikeBtn.addEventListener('click', () => {
        dislikeBtn.classList.toggle('active-down');
        if (likeBtn) likeBtn.classList.remove('active-up');
        analyticsStats.unhelpfulVotes++;
        showToast('Thanks for your feedback! We will improve our answers.');
        window.soundEffects.playClickSound();
      });
    }

    container.appendChild(group);
    container.scrollTop = container.scrollHeight;
  }

  function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const group = document.createElement('div');
    group.className = 'message-group bot typing';
    group.id = 'typingGroup';
    group.innerHTML = `
      <div class="avatar bot"><i class="fas fa-robot"></i></div>
      <div class="message-bubble typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    container.appendChild(group);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('typingGroup');
    if (indicator) indicator.remove();
  }

  /**
   * Knowledge Base Manager (CRUD + Import/Export)
   */
  function initKnowledgeBaseUI() {
    const searchInput = document.getElementById('kbSearchInput');
    const categoryFilter = document.getElementById('kbCategoryFilter');
    const addBtn = document.getElementById('addFaqBtn');
    const exportBtn = document.getElementById('exportFaqBtn');
    const importInput = document.getElementById('importFaqInput');

    if (searchInput) {
      searchInput.addEventListener('input', renderKnowledgeBase);
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', renderKnowledgeBase);
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        openFaqModal();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeFaqs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `faqs_${currentDatasetKey}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('FAQ Dataset exported as JSON!');
      });
    }

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
              activeFaqs = imported;
              window.nlpEngine.train(activeFaqs);
              updateProductDisplay();
              renderKnowledgeBase();
              renderQuickTopicChips();
              showToast(`Imported ${imported.length} FAQs successfully!`);
            }
          } catch (err) {
            showToast('Invalid JSON file format', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Modal Form Handler
    const faqForm = document.getElementById('faqModalForm');
    if (faqForm) {
      faqForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idInput = document.getElementById('faqModalId').value;
        const catInput = document.getElementById('faqModalCategory').value.trim();
        const qInput = document.getElementById('faqModalQuestion').value.trim();
        const aInput = document.getElementById('faqModalAnswer').value.trim();
        const kwInput = document.getElementById('faqModalKeywords').value.trim();

        if (!qInput || !aInput) return;

        if (idInput) {
          // Edit existing
          const index = activeFaqs.findIndex(f => f.id === idInput);
          if (index !== -1) {
            activeFaqs[index] = { id: idInput, category: catInput, question: qInput, answer: aInput, keywords: kwInput };
            showToast('FAQ updated successfully!');
          }
        } else {
          // Add new
          const newFaq = {
            id: `custom-${Date.now()}`,
            category: catInput || 'General',
            question: qInput,
            answer: aInput,
            keywords: kwInput
          };
          activeFaqs.unshift(newFaq);
          showToast('New FAQ added to Knowledge Base!');
        }

        // Retrain & Update
        window.nlpEngine.train(activeFaqs);
        updateProductDisplay();
        renderKnowledgeBase();
        renderQuickTopicChips();
        closeFaqModal();
      });
    }
  }

  function openFaqModal(faq = null) {
    const modal = document.getElementById('faqModal');
    if (!modal) return;

    document.getElementById('faqModalId').value = faq ? faq.id : '';
    document.getElementById('faqModalCategory').value = faq ? faq.category : 'General';
    document.getElementById('faqModalQuestion').value = faq ? faq.question : '';
    document.getElementById('faqModalAnswer').value = faq ? faq.answer : '';
    document.getElementById('faqModalKeywords').value = faq ? faq.keywords : '';

    modal.classList.add('open');
  }

  function closeFaqModal() {
    const modal = document.getElementById('faqModal');
    if (modal) modal.classList.remove('open');
  }
  window.closeFaqModal = closeFaqModal;

  function renderKnowledgeBase() {
    const grid = document.getElementById('faqGridContainer');
    const searchVal = (document.getElementById('kbSearchInput')?.value || '').toLowerCase();
    const catVal = document.getElementById('kbCategoryFilter')?.value || 'all';

    if (!grid) return;

    // Filter FAQs
    const filtered = activeFaqs.filter(faq => {
      const matchesSearch = faq.question.toLowerCase().includes(searchVal) ||
                            faq.answer.toLowerCase().includes(searchVal) ||
                            (faq.keywords && faq.keywords.toLowerCase().includes(searchVal));
      const matchesCat = catVal === 'all' || faq.category === catVal;
      return matchesSearch && matchesCat;
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No FAQs found matching your criteria.</div>`;
      return;
    }

    filtered.forEach(faq => {
      const card = document.createElement('div');
      card.className = 'faq-card';

      const kwChips = faq.keywords ? faq.keywords.split(/,\s*/).map(k => `<span class="kw-chip">${escapeHtml(k)}</span>`).join('') : '';

      card.innerHTML = `
        <span class="card-category-badge">${escapeHtml(faq.category || 'General')}</span>
        <h4 class="card-question">${escapeHtml(faq.question)}</h4>
        <p class="card-answer">${escapeHtml(faq.answer)}</p>
        <div class="card-keywords">${kwChips}</div>
        <div class="card-footer">
          <span class="card-id">ID: ${escapeHtml(faq.id)}</span>
          <div class="msg-actions">
            <button class="action-btn-sm btn-edit-faq" title="Edit FAQ"><i class="fas fa-edit"></i></button>
            <button class="action-btn-sm btn-delete-faq" title="Delete FAQ"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      `;

      card.querySelector('.btn-edit-faq').addEventListener('click', () => openFaqModal(faq));
      card.querySelector('.btn-delete-faq').addEventListener('click', () => {
        if (confirm(`Delete FAQ "${faq.question}"?`)) {
          activeFaqs = activeFaqs.filter(f => f.id !== faq.id);
          window.nlpEngine.train(activeFaqs);
          updateProductDisplay();
          renderKnowledgeBase();
          renderQuickTopicChips();
          showToast('FAQ deleted');
        }
      });

      grid.appendChild(card);
    });

    // Populate categories filter dropdown options
    const categories = Array.from(new Set(activeFaqs.map(f => f.category || 'General')));
    const select = document.getElementById('kbCategoryFilter');
    if (select) {
      const currentSelected = select.value;
      select.innerHTML = `<option value="all">All Categories (${categories.length})</option>` +
        categories.map(c => `<option value="${escapeHtml(c)}" ${c === currentSelected ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    }
  }

  /**
   * Live NLP Match Visualizer View Renderer
   */
  function renderNlpVisualizer(details) {
    if (!details) return;

    // Tokens step
    const rawContainer = document.getElementById('nlpRawTokens');
    const cleanedContainer = document.getElementById('nlpCleanedTokens');
    const stemmedContainer = document.getElementById('nlpStemmedTokens');

    if (rawContainer) rawContainer.innerHTML = details.rawTokens.map(t => `<span class="token-tag">${escapeHtml(t)}</span>`).join('');
    if (cleanedContainer) cleanedContainer.innerHTML = details.cleanedTokens.map(t => `<span class="token-tag">${escapeHtml(t)}</span>`).join('');
    if (stemmedContainer) stemmedContainer.innerHTML = details.stemmedTokens.map(t => `<span class="token-tag stemmed">${escapeHtml(t)}</span>`).join('');

    // TF-IDF Terms step
    const termsContainer = document.getElementById('nlpVectorTerms');
    if (termsContainer) {
      termsContainer.innerHTML = details.vectorTerms.map(v => `
        <span class="token-tag">
          ${escapeHtml(v.term)}: <strong>${v.weight}</strong>
        </span>
      `).join('') || '<span style="color:var(--text-muted)">No non-stopword vector terms found</span>';
    }

    // Similarity Scores breakdown step
    const simContainer = document.getElementById('nlpScoresTable');
    if (simContainer) {
      simContainer.innerHTML = '';
      details.scores.forEach(s => {
        const pct = Math.round(s.totalScore * 100);
        const item = document.createElement('div');
        item.className = 'sim-item';
        item.innerHTML = `
          <div class="sim-item-header">
            <span class="sim-question">${escapeHtml(s.question)}</span>
            <span class="sim-score-badge">${pct}% Cosine Match</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); display:flex; gap:1rem; margin-top:0.2rem;">
            <span>Category: <strong>${escapeHtml(s.category)}</strong></span>
            <span>CosSim: <strong>${s.cosSim}</strong></span>
            <span>Jaccard: <strong>${s.jaccardSim}</strong></span>
            <span>Boost: <strong>${s.boost}</strong></span>
          </div>
        `;
        simContainer.appendChild(item);
      });
    }
  }

  /**
   * Analytics Dashboard Renderer
   */
  function renderAnalytics() {
    const totalElem = document.getElementById('statTotalQueries');
    const matchElem = document.getElementById('statMatchRate');
    const helpElem = document.getElementById('statHelpfulRate');
    const countElem = document.getElementById('statKbCount');

    if (totalElem) totalElem.textContent = analyticsStats.totalQueries;

    if (matchElem) {
      const rate = analyticsStats.totalQueries > 0
        ? Math.round((analyticsStats.successfulMatches / analyticsStats.totalQueries) * 100)
        : 100;
      matchElem.textContent = `${rate}%`;
    }

    if (helpElem) {
      const totalFeedback = analyticsStats.helpfulVotes + analyticsStats.unhelpfulVotes;
      const rate = totalFeedback > 0
        ? Math.round((analyticsStats.helpfulVotes / totalFeedback) * 100)
        : 100;
      helpElem.textContent = `${rate}%`;
    }

    if (countElem) countElem.textContent = activeFaqs.length;

    // Unresolved Queries Table
    const tableBody = document.getElementById('unresolvedTableBody');
    if (tableBody) {
      tableBody.innerHTML = '';
      if (analyticsStats.unresolvedQueries.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No unresolved queries logged yet!</td></tr>`;
      } else {
        analyticsStats.unresolvedQueries.forEach((item, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${escapeHtml(item.time)}</td>
            <td><strong>${escapeHtml(item.query)}</strong></td>
            <td>${escapeHtml(item.dataset)}</td>
            <td>
              <button class="primary-btn" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="openFaqModalWithQuery('${escapeJsString(item.query)}')">
                <i class="fas fa-plus"></i> Add to KB
              </button>
            </td>
          `;
          tableBody.appendChild(tr);
        });
      }
    }
  }

  function initCodeCopyBtn() {
    const copyBtn = document.getElementById('copyCodeBtn');
    const snippet = document.getElementById('pythonCodeSnippet');
    if (!copyBtn || !snippet) return;

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(snippet.textContent);
      showToast('Python code copied to clipboard!');
      window.soundEffects.playClickSound();
    });
  }

  window.openFaqModalWithQuery = function(query) {
    const navKb = document.querySelector('.nav-tab[data-tab="kb"]');
    if (navKb) navKb.click();
    openFaqModal({
      id: '',
      category: 'General',
      question: query,
      answer: '',
      keywords: ''
    });
  };

  /**
   * Helper Utilities
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';
    toast.innerHTML = `<i class="fas ${icon}" style="color:var(--accent-cyan)"></i> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeJsString(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
});
