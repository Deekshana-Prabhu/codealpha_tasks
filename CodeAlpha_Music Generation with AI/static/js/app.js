// GLOBAL APP CONTROLLER
document.addEventListener('DOMContentLoaded', () => {
    
    // API Endpoints
    const API_DATASETS = '/api/datasets';
    const API_TRAIN = '/api/train';
    const API_TRAIN_STATUS = '/api/train/status';
    const API_TRAIN_STOP = '/api/train/stop';
    const API_GENERATE = '/api/generate';
    const API_UPLOAD = '/api/upload';

    // State Variables
    let datasets = {};
    let activeDataset = 'tamil_hits';
    let trainingPollInterval = null;
    let chartInstance = null;
    
    // Playback state
    let generatedMelodyNotes = [];
    let isPlaying = false;
    let playbackPart = null;
    let totalPlaybackDuration = 0;
    let generatedBpm = 110;
    let generatedDurationValue = 0.5; // in quarter notes

    // Step Sequencer state
    const seqNotes = ['B5', 'A5', 'G5', 'E5', 'D5', 'B4', 'A4', 'G4', 'E4', 'D4', 'B3', 'A3'];
    const seqSteps = 16;
    let sequencerMatrix = Array(seqNotes.length).fill().map(() => Array(seqSteps).fill(false));
    let sequencerPlaying = false;
    let sequencerInterval = null;
    let currentSequencerStep = 0;
    let sequencerBpm = 110;

    // Canvas Visualizer state
    const canvas = document.getElementById('piano-roll-canvas');
    const ctx = canvas.getContext('2d');
    let visualizerNotesQueue = []; // Notes falling down: { pitch, time, duration, x, y, width, height, color }
    let animationFrameId = null;
    const pixelSpeed = 80; // pixels per second

    // Web Audio Synthesizer Configuration
    let synth = null;
    let reverb = null;
    let delay = null;
    let audioRecorder = null;
    let isRecording = false;

    // Map pitches to index keys on virtual piano (C4 is index 0)
    // Keys span C4 to B5 (14 white keys, 10 black keys)
    const pianoPitches = [
        'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
        'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
    ];
    
    const whitePitches = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];
    
    // Initialize Synthesizer
    function initSynth() {
        if (synth) return; // already initialized
        
        // Start Tone.js context on user gesture
        Tone.start();

        // Create Effects
        reverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).toDestination();
        delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.2, wet: 0.15 }).connect(reverb);
        
        // Setup PolySynth
        synth = new Tone.PolySynth(Tone.Synth).connect(delay);
        
        // Apply default ADSR
        updateSynthParameters();

        // Setup Recorder
        const dest = Tone.Destination;
        audioRecorder = new Tone.Recorder();
        dest.connect(audioRecorder);
    }

    function updateSynthParameters() {
        if (!synth) return;
        
        const attack = parseFloat(document.getElementById('synth-attack').value);
        const decay = parseFloat(document.getElementById('synth-decay').value);
        const sustain = parseFloat(document.getElementById('synth-sustain').value);
        const release = parseFloat(document.getElementById('synth-release').value);
        const voiceType = document.getElementById('synth-voice').value;

        // Update synth oscillator & envelope
        synth.set({
            envelope: {
                attack: attack,
                decay: decay,
                sustain: sustain,
                release: release
            }
        });

        // Set oscillator types
        let oscType = 'triangle';
        if (voiceType === 'sine') oscType = 'sine';
        else if (voiceType === 'square') oscType = 'square';
        else if (voiceType === 'triangle') oscType = 'triangle';
        else if (voiceType === 'fm') oscType = 'fmsine';
        else if (voiceType === 'piano') {
            // Physical piano approximation
            oscType = 'sine4'; // warm sine with harmonics
            synth.set({
                envelope: {
                    attack: 0.005,
                    decay: 0.6,
                    sustain: 0.1,
                    release: 1.2
                }
            });
            // Update inputs values visually
            document.getElementById('synth-attack').value = 0.005;
            document.getElementById('synth-decay').value = 0.6;
            document.getElementById('synth-sustain').value = 0.1;
            document.getElementById('synth-release').value = 1.2;
            document.getElementById('attack-val').innerText = '0.01';
            document.getElementById('decay-val').innerText = '0.60';
            document.getElementById('sustain-val').innerText = '0.10';
            document.getElementById('release-val').innerText = '1.20';
        }

        if (voiceType !== 'piano') {
            synth.set({
                oscillator: { type: oscType }
            });
        }
        
        // Update Effects Wet values
        const reverbWet = parseFloat(document.getElementById('fx-reverb').value);
        const delayWet = parseFloat(document.getElementById('fx-delay').value);
        reverb.wet.value = reverbWet;
        delay.wet.value = delayWet;
    }

    // DRAW PIANO KEYBOARD
    function drawVirtualKeyboard() {
        const keyboardEl = document.getElementById('piano-keyboard');
        keyboardEl.innerHTML = '';
        
        // Add white keys first
        whitePitches.forEach(pitch => {
            const key = document.createElement('div');
            key.className = 'piano-key white';
            key.setAttribute('data-key', pitch);
            key.addEventListener('mousedown', () => playKeyManual(pitch));
            key.addEventListener('mouseup', () => releaseKeyManual(pitch));
            key.addEventListener('mouseleave', () => releaseKeyManual(pitch));
            keyboardEl.appendChild(key);
        });

        // Add black keys overlayed
        pianoPitches.forEach(pitch => {
            if (pitch.includes('#')) {
                const key = document.createElement('div');
                key.className = 'piano-key black';
                key.setAttribute('data-key', pitch);
                key.addEventListener('mousedown', () => playKeyManual(pitch));
                key.addEventListener('mouseup', () => releaseKeyManual(pitch));
                key.addEventListener('mouseleave', () => releaseKeyManual(pitch));
                keyboardEl.appendChild(key);
            }
        });
    }

    function playKeyManual(pitch) {
        initSynth();
        try {
            synth.triggerAttack(pitch);
            highlightKey(pitch, true);
        } catch (e) {}
    }

    function releaseKeyManual(pitch) {
        if (!synth) return;
        try {
            synth.triggerRelease(pitch);
            highlightKey(pitch, false);
        } catch (e) {}
    }

    function highlightKey(pitch, active) {
        const keyEl = document.querySelector(`.piano-key[data-key="${pitch}"]`);
        if (keyEl) {
            if (active) keyEl.classList.add('active');
            else keyEl.classList.remove('active');
        }
    }

    // INTERACTIVE STEP SEQUENCER
    function buildSequencerGrid() {
        const grid = document.getElementById('sequencer-grid');
        grid.innerHTML = '';

        seqNotes.forEach((note, noteIdx) => {
            const row = document.createElement('div');
            row.className = 'sequencer-row';
            
            // Label
            const label = document.createElement('div');
            label.className = 'sequencer-label';
            label.innerText = note;
            row.appendChild(label);

            // Steps
            const stepsWrapper = document.createElement('div');
            stepsWrapper.className = 'sequencer-steps';

            for (let step = 0; step < seqSteps; step++) {
                const cell = document.createElement('button');
                cell.className = 'seq-cell';
                if (sequencerMatrix[noteIdx][step]) {
                    cell.classList.add('active');
                }
                
                cell.addEventListener('click', () => {
                    initSynth();
                    sequencerMatrix[noteIdx][step] = !sequencerMatrix[noteIdx][step];
                    cell.classList.toggle('active');
                    
                    if (sequencerMatrix[noteIdx][step]) {
                        synth.triggerAttackRelease(note, '8n');
                    }
                });

                stepsWrapper.appendChild(cell);
            }
            row.appendChild(stepsWrapper);
            grid.appendChild(row);
        });
    }

    function playSequencer() {
        if (sequencerPlaying) {
            stopSequencer();
            return;
        }

        initSynth();
        sequencerPlaying = true;
        document.getElementById('btn-play-seq').innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        document.getElementById('btn-play-seq').classList.add('btn-primary');
        
        currentSequencerStep = 0;
        const stepTimeMs = (60 / sequencerBpm) * 1000 / 2; // eighth notes

        sequencerInterval = setInterval(() => {
            document.querySelectorAll('.seq-cell').forEach(c => c.classList.remove('playing'));
            
            seqNotes.forEach((_, noteIdx) => {
                const rowEl = document.querySelector(`.sequencer-row:nth-child(${noteIdx + 1})`);
                if (rowEl) {
                    const cell = rowEl.querySelector(`.seq-cell:nth-child(${currentSequencerStep + 2})`); // +2 label
                    if (cell) {
                        cell.classList.add('playing');
                        
                        if (sequencerMatrix[noteIdx][currentSequencerStep]) {
                            synth.triggerAttackRelease(seqNotes[noteIdx], '8n');
                            highlightKey(seqNotes[noteIdx], true);
                            setTimeout(() => highlightKey(seqNotes[noteIdx], false), 150);
                        }
                    }
                }
            });

            currentSequencerStep = (currentSequencerStep + 1) % seqSteps;
        }, stepTimeMs);
    }

    function stopSequencer() {
        sequencerPlaying = false;
        clearInterval(sequencerInterval);
        document.getElementById('btn-play-seq').innerHTML = '<i class="fa-solid fa-play"></i> Listen';
        document.getElementById('btn-play-seq').classList.remove('btn-primary');
        document.querySelectorAll('.seq-cell').forEach(c => c.classList.remove('playing'));
    }

    // CHART.JS SETUP
    function initChart() {
        const ctxChart = document.getElementById('lossChart').getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctxChart, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Training Loss',
                    data: [],
                    borderColor: '#bf5af2',
                    backgroundColor: 'rgba(191, 90, 242, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: '#0a84ff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#8e8e93', font: { family: 'Inter', size: 10 } },
                        title: { display: true, text: 'Epoch', color: '#8e8e93' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#8e8e93', font: { family: 'Inter', size: 10 } },
                        title: { display: true, text: 'Loss', color: '#8e8e93' }
                    }
                }
            }
        });
    }

    // GET DATASETS
    function loadDatasets() {
        fetch(API_DATASETS)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    datasets = data.datasets;
                    populateDatasetSelector();
                }
            })
            .catch(err => console.error("Error loading datasets:", err));
    }

    function populateDatasetSelector() {
        const select = document.getElementById('dataset-select');
        const currentSelected = select.value || 'tamil_hits';
        select.innerHTML = '';

        let totalFiles = 0;
        const folders = Object.keys(datasets);
        
        folders.forEach(key => {
            const ds = datasets[key];
            const option = document.createElement('option');
            option.value = ds.folder;
            option.text = `${ds.name} (${ds.count} songs)`;
            if (key === currentSelected) {
                option.selected = true;
            }
            select.appendChild(option);
            totalFiles += ds.count;
        });

        document.getElementById('total-songs-count').innerText = `${totalFiles} songs total`;
        activeDataset = select.value || 'tamil_hits';
        updateDatasetFilesView();
    }

    function updateDatasetFilesView() {
        const ds = datasets[activeDataset];
        const list = document.getElementById('midi-files-list');
        list.innerHTML = '';

        if (!ds || ds.count === 0) {
            list.innerHTML = '<li class="text-muted">No files in this dataset</li>';
            return;
        }

        ds.files.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span><i class="fa-solid fa-play-circle" style="color: var(--secondary-color); margin-right: 8px;"></i> ${f}</span><i class="fa-solid fa-music"></i>`;
            li.addEventListener('click', () => {
                playExistingSong(activeDataset, f);
            });
            list.appendChild(li);
        });

        updateModelStatusBadge(ds.model_exists);
    }

    function updateModelStatusBadge(modelExists) {
        const indicator = document.getElementById('training-status-indicator');
        if (modelExists) {
            indicator.className = 'status-indicator success';
            indicator.innerText = 'Model Ready';
        } else {
            indicator.className = 'status-indicator idle';
            indicator.innerText = 'Untrained';
        }
    }

    // UPLOAD MIDI
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('midi-file-input');

    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#0a84ff';
        uploadZone.style.background = 'rgba(10, 132, 255, 0.05)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        uploadZone.style.background = 'transparent';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        uploadZone.style.background = 'transparent';
        if (e.dataTransfer.files.length > 0) {
            uploadMidiFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            uploadMidiFile(fileInput.files[0]);
        }
    });

    function uploadMidiFile(file) {
        const statusEl = document.getElementById('upload-status');
        statusEl.className = 'upload-status text-muted';
        statusEl.innerText = 'Uploading...';

        const formData = new FormData();
        formData.append('file', file);

        fetch(API_UPLOAD, {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                statusEl.className = 'upload-status text-success';
                statusEl.innerText = 'Upload successful!';
                loadDatasets();
                setTimeout(() => { statusEl.innerText = ''; }, 3000);
            } else {
                statusEl.className = 'upload-status text-danger';
                statusEl.innerText = `Error: ${data.message}`;
            }
        })
        .catch(err => {
            statusEl.className = 'upload-status text-danger';
            statusEl.innerText = 'Upload failed.';
            console.error(err);
        });
    }

    // START TRAINING
    document.getElementById('btn-start-train').addEventListener('click', () => {
        const epochs = parseInt(document.getElementById('param-epochs').value);
        const seqLength = parseInt(document.getElementById('param-seq-length').value);
        const lr = parseFloat(document.getElementById('param-lr').value);
        const hiddenDim = parseInt(document.getElementById('param-hidden').value);
        
        const config = {
            dataset: activeDataset,
            epochs: epochs,
            seq_length: seqLength,
            lr: lr,
            hidden_dim: hiddenDim
        };

        document.getElementById('training-logs').innerHTML = 'Sending training request to server...<br>';
        document.getElementById('training-progress-box').style.display = 'block';
        initChart();

        fetch(API_TRAIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('btn-start-train').disabled = true;
                document.getElementById('btn-stop-train').disabled = false;
                
                const indicator = document.getElementById('training-status-indicator');
                indicator.className = 'status-indicator running';
                indicator.innerText = 'Training';
                
                startProgressPolling();
            } else {
                document.getElementById('training-logs').innerHTML += `<span class="text-danger">Failed to start training: ${data.message}</span><br>`;
            }
        })
        .catch(err => {
            document.getElementById('training-logs').innerHTML += `<span class="text-danger">Request failed. Check server.</span><br>`;
            console.error(err);
        });
    });

    // STOP TRAINING
    document.getElementById('btn-stop-train').addEventListener('click', () => {
        fetch(API_TRAIN_STOP, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('training-logs').innerHTML += `Stop request sent. Terminating...<br>`;
                }
            })
            .catch(err => console.error(err));
    });

    function startProgressPolling() {
        if (trainingPollInterval) clearInterval(trainingPollInterval);
        
        trainingPollInterval = setInterval(() => {
            fetch(API_TRAIN_STATUS)
                .then(res => res.json())
                .then(state => {
                    document.getElementById('progress-epoch-text').innerText = `Epoch ${state.epoch}/${state.total_epochs}`;
                    document.getElementById('progress-loss-text').innerText = `Loss: ${state.loss ? state.loss.toFixed(4) : '--'}`;
                    
                    const progressPercent = state.total_epochs > 0 ? (state.epoch / state.total_epochs) * 100 : 0;
                    document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;

                    const logsEl = document.getElementById('training-logs');
                    logsEl.innerHTML = `Status: ${state.status}<br>`;
                    if (state.error) {
                        logsEl.innerHTML += `<span class="text-danger">Error: ${state.error}</span><br>`;
                    }
                    
                    updateChart(state.history);

                    if (!state.running) {
                        clearInterval(trainingPollInterval);
                        document.getElementById('btn-start-train').disabled = false;
                        document.getElementById('btn-stop-train').disabled = true;
                        
                        const logsEnd = state.error ? `Training failed.` : `Training completed!`;
                        logsEl.innerHTML += `System: ${logsEnd}<br>`;
                        loadDatasets();
                    }
                })
                .catch(err => {
                    console.error("Error polling training status:", err);
                });
        }, 1000);
    }

    function updateChart(history) {
        if (!chartInstance || !history) return;
        const labels = history.map(h => `E${h.epoch}`);
        const data = history.map(h => h.loss);
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update('none');
    }

    // USE SEQUENCER AS SEED MELODY
    document.getElementById('btn-use-seed').addEventListener('click', () => {
        let notesList = [];
        for (let step = 0; step < seqSteps; step++) {
            let stepNotes = [];
            seqNotes.forEach((note, noteIdx) => {
                if (sequencerMatrix[noteIdx][step]) {
                    stepNotes.push(note);
                }
            });

            if (stepNotes.length > 0) {
                stepNotes.sort((a,b) => pianoPitches.indexOf(a) - pianoPitches.indexOf(b));
                notesList.push(stepNotes.join('.'));
            } else {
                notesList.push('rest');
            }
        }
        
        window.userSeedMelody = notesList;
        
        const btn = document.getElementById('btn-use-seed');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Melody Loaded as AI Seed!';
        btn.style.background = 'linear-gradient(135deg, var(--success-color), #24b049)';
        setTimeout(() => {
            btn.innerHTML = oldHtml;
            btn.style.background = '';
        }, 2000);
    });

    // GENERATE AI MUSIC
    document.getElementById('btn-generate').addEventListener('click', () => {
        initSynth();
        
        const genLength = parseInt(document.getElementById('gen-length').value);
        const temp = parseFloat(document.getElementById('gen-temp').value);
        const bpm = parseInt(document.getElementById('gen-bpm').value);
        const durationFloat = parseFloat(document.getElementById('gen-dur').value);
        
        let seed = [];
        if (window.userSeedMelody && window.userSeedMelody.length > 0) {
            seed = window.userSeedMelody;
        }

        const payload = {
            dataset: activeDataset,
            seed_notes: seed,
            length: genLength,
            temperature: temp,
            bpm: bpm,
            note_duration: durationFloat
        };

        document.getElementById('gen-loading').style.display = 'flex';
        document.getElementById('btn-generate').disabled = true;

        fetch(API_GENERATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('gen-loading').style.display = 'none';
            document.getElementById('btn-generate').disabled = false;

            if (data.success) {
                generatedMelodyNotes = data.notes;
                generatedBpm = bpm;
                generatedDurationValue = durationFloat;
                
                document.getElementById('btn-play-generated').disabled = false;
                document.getElementById('btn-record-audio').disabled = false;
                
                const dlLink = document.getElementById('link-download-midi');
                dlLink.href = data.midi_url;
                dlLink.classList.remove('disabled');

                // Auto-create notes timeline from notes list and play
                const notesTimeline = convertNotesListToTimeline(data.notes, bpm, durationFloat);
                setupPlaybackEngine(notesTimeline, bpm);
            } else {
                alert(`Generation failed: ${data.message}`);
            }
        })
        .catch(err => {
            document.getElementById('gen-loading').style.display = 'none';
            document.getElementById('btn-generate').disabled = false;
            alert('Server error generating music.');
            console.error(err);
        });
    });

    // PLAYBACK MANAGEMENT - UNIFIED TONE.TRANSPORT SYSTEM
    function convertNotesListToTimeline(notesList, bpm, noteDurVal) {
        const noteDurationSec = (60 / bpm) * noteDurVal * 4; // Length in seconds
        let noteEvents = [];
        let timeAcc = 0;

        notesList.forEach(noteStr => {
            if (noteStr !== 'rest') {
                if (noteStr.includes('.')) {
                    const pitches = noteStr.split('.');
                    pitches.forEach(p => {
                        noteEvents.push({
                            name: p,
                            time: timeAcc,
                            duration: noteDurationSec
                        });
                    });
                } else {
                    noteEvents.push({
                        name: noteStr,
                        time: timeAcc,
                        duration: noteDurationSec
                    });
                }
            }
            timeAcc += noteDurationSec;
        });

        totalPlaybackDuration = timeAcc;
        return noteEvents;
    }

    async function playExistingSong(datasetFolder, filename) {
        initSynth();
        stopPlayback();

        const url = `/api/datasets/${datasetFolder}/${filename}`;
        
        try {
            // Load and parse the MIDI file using `@tonejs/midi`
            const midi = await Midi.fromUrl(url);
            let noteEvents = [];

            midi.tracks.forEach(track => {
                track.notes.forEach(n => {
                    noteEvents.push({
                        name: n.name,
                        time: n.time,
                        duration: n.duration,
                        velocity: n.velocity
                    });
                });
            });

            // Sort noteEvents by chronological order
            noteEvents.sort((a, b) => a.time - b.time);
            
            // Calculate total duration
            if (noteEvents.length > 0) {
                const lastNote = noteEvents[noteEvents.length - 1];
                totalPlaybackDuration = lastNote.time + lastNote.duration;
            } else {
                totalPlaybackDuration = 0;
            }

            const songBpm = midi.header.tempos[0]?.bpm || 110;
            
            // Setup playback and run!
            setupPlaybackEngine(noteEvents, songBpm);
            startPlayback();
            
            // Update visual indicator
            console.log(`Now playing: ${filename} (BPM: ${Math.round(songBpm)}, Notes: ${noteEvents.length})`);
        } catch (e) {
            console.error("Failed to play MIDI file:", e);
            alert("Error parsing and playing this MIDI file.");
        }
    }

    function setupPlaybackEngine(noteEvents, bpm) {
        stopPlayback();
        
        // 1. Configure Tone.Transport BPM
        Tone.Transport.bpm.value = bpm;
        
        // 2. Prepare Part schedule
        playbackPart = new Tone.Part((time, event) => {
            try {
                // Play on synth with velocity mapping
                synth.triggerAttackRelease(event.name, event.duration, time, event.velocity || 0.8);
                
                // Keyboard lighting effect synced with Tone.js
                Tone.Draw.schedule(() => {
                    highlightKey(event.name, true);
                    setTimeout(() => highlightKey(event.name, false), event.duration * 1000 * 0.95);
                }, time);
            } catch (e) {}
        }, noteEvents).start(0);

        // Set duration limits
        playbackPart.loop = false;

        // 3. Prepare visualizer queue
        prepareWaterfallRoll(noteEvents);
    }

    function startPlayback() {
        if (!playbackPart) return;
        initSynth();
        
        isPlaying = true;
        
        // Toggle buttons state
        document.getElementById('btn-play-generated').innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        document.getElementById('btn-play-generated').disabled = false;
        document.getElementById('btn-stop-generated').disabled = false;

        // Start Transport
        Tone.Transport.start();

        // Trigger Audio Recording if recording active
        if (isRecording) {
            // keep recording
        }

        // Start Animation loop
        runWaterfallVisualizer();
        
        // Start time updater interval
        window.playbackTimeUpdater = setInterval(updatePlaybackProgressBar, 200);
    }

    function stopPlayback() {
        isPlaying = false;
        
        // Stop Transport & clear scheduled events
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (playbackPart) {
            playbackPart.dispose();
            playbackPart = null;
        }

        clearInterval(window.playbackTimeUpdater);
        cancelAnimationFrame(animationFrameId);

        // Reset UI Elements
        document.getElementById('btn-play-generated').innerHTML = '<i class="fa-solid fa-play"></i> Play';
        document.getElementById('btn-stop-generated').disabled = true;
        document.getElementById('playback-progress-bar').style.width = '0%';
        document.getElementById('playback-time').innerText = '0:00 / 0:00';
        
        // Terminate active key lights
        document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('active'));

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (isRecording) {
            toggleAudioRecording();
        }
    }

    function updatePlaybackProgressBar() {
        const elapsedSec = Tone.Transport.seconds;
        
        if (elapsedSec >= totalPlaybackDuration) {
            stopPlayback();
            return;
        }

        const percent = (elapsedSec / totalPlaybackDuration) * 100;
        document.getElementById('playback-progress-bar').style.width = `${percent}%`;

        const currentMinStr = Math.floor(elapsedSec / 60) + ":" + String(Math.floor(elapsedSec % 60)).padStart(2, '0');
        const totalMinStr = Math.floor(totalPlaybackDuration / 60) + ":" + String(Math.floor(totalPlaybackDuration % 60)).padStart(2, '0');
        
        document.getElementById('playback-time').innerText = `${currentMinStr} / ${totalMinStr}`;
    }

    // WATERFALL PIANO ROLL GRAPHICS
    function prepareWaterfallRoll(noteEvents) {
        visualizerNotesQueue = [];
        
        const keyWidth = canvas.width / 14; // 14 white keys
        
        const getPitchX = (pitch) => {
            const isBlack = pitch.includes('#');
            if (!isBlack) {
                const idx = whitePitches.indexOf(pitch);
                return idx * keyWidth;
            } else {
                const basePitch = pitch.replace('#', '');
                const idx = whitePitches.indexOf(basePitch + pitch.slice(-1));
                return (idx * keyWidth) + (keyWidth * 0.7);
            }
        };

        const getPitchWidth = (pitch) => {
            return pitch.includes('#') ? keyWidth * 0.6 : keyWidth * 0.85;
        };

        const getNoteColor = (pitch) => {
            const pitchIndex = pianoPitches.indexOf(pitch);
            if (pitchIndex < 0) return '#bf5af2';
            
            const hue = (pitchIndex / pianoPitches.length) * 120 + 260; // purple-pink
            return `hsla(${hue}, 85%, 65%, 0.85)`;
        };

        noteEvents.forEach(evt => {
            visualizerNotesQueue.push({
                pitch: evt.name,
                time: evt.time,
                duration: evt.duration,
                x: getPitchX(evt.name),
                width: getPitchWidth(evt.name),
                height: evt.duration * pixelSpeed,
                color: getNoteColor(evt.name)
            });
        });
    }

    function runWaterfallVisualizer() {
        if (!isPlaying) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const elapsedSeconds = Tone.Transport.seconds;

        // Draw note track borders
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        const keyWidth = canvas.width / 14;
        for (let i = 0; i <= 14; i++) {
            ctx.beginPath();
            ctx.moveTo(i * keyWidth, 0);
            ctx.lineTo(i * keyWidth, canvas.height);
            ctx.stroke();
        }

        // Draw falling notes
        visualizerNotesQueue.forEach(note => {
            // Note's Y position: touches bottom (canvas.height) at note.time
            const targetY = canvas.height - note.height - (note.time - elapsedSeconds) * pixelSpeed;

            // Only paint if visible on screen
            if (targetY > -50 && targetY < canvas.height + 50) {
                ctx.fillStyle = note.color;
                ctx.shadowColor = note.color;
                ctx.shadowBlur = 6;
                
                ctx.beginPath();
                ctx.roundRect(note.x, targetY, note.width, note.height, 4);
                ctx.fill();
                
                ctx.shadowBlur = 0;
            }
        });

        animationFrameId = requestAnimationFrame(runWaterfallVisualizer);
    }

    // AUDIO RECORDING (WAV EXPORT)
    function toggleAudioRecording() {
        if (!audioRecorder) {
            initSynth();
        }
        
        const btn = document.getElementById('btn-record-audio');
        
        if (!isRecording) {
            audioRecorder.start();
            isRecording = true;
            
            btn.innerHTML = '<i class="fa-solid fa-stop-circle"></i> Stop Record';
            btn.style.background = 'linear-gradient(135deg, var(--danger-color), #dd3328)';
            btn.classList.add('btn-glowing');

            if (!isPlaying) {
                startPlayback();
            }
        } else {
            isRecording = false;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            setTimeout(async () => {
                const recordingBlob = await audioRecorder.stop();
                const url = URL.createObjectURL(recordingBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `raga_ai_composition_${uuidSimple()}.wav`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                btn.innerHTML = '<i class="fa-solid fa-record-vinyl"></i> Record WAV';
                btn.style.background = '';
                btn.classList.remove('btn-glowing');
                btn.disabled = false;
            }, 600);
        }
    }

    function uuidSimple() {
        return Math.random().toString(36).substring(2, 10);
    }

    // PLAY GENERATED BUTTON
    document.getElementById('btn-play-generated').addEventListener('click', () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            if (generatedMelodyNotes.length === 0) return;
            const notesTimeline = convertNotesListToTimeline(generatedMelodyNotes, generatedBpm, generatedDurationValue);
            setupPlaybackEngine(notesTimeline, generatedBpm);
            startPlayback();
        }
    });

    document.getElementById('btn-stop-generated').addEventListener('click', stopPlayback);
    document.getElementById('btn-record-audio').addEventListener('click', toggleAudioRecording);

    // DOM EVENTS
    document.getElementById('dataset-select').addEventListener('change', (e) => {
        activeDataset = e.target.value;
        updateDatasetFilesView();
    });

    document.getElementById('gen-temp').addEventListener('input', (e) => {
        document.getElementById('temp-val').innerText = parseFloat(e.target.value).toFixed(1);
    });

    // Synth controls
    const synthInputs = ['synth-attack', 'synth-decay', 'synth-sustain', 'synth-release', 'synth-voice', 'fx-reverb', 'fx-delay'];
    synthInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            if (id.includes('attack') || id.includes('decay') || id.includes('sustain') || id.includes('release')) {
                const labelId = id.split('-')[1] + '-val';
                document.getElementById(labelId).innerText = parseFloat(e.target.value).toFixed(2);
            }
            if (id === 'fx-reverb' || id === 'fx-delay') {
                const labelId = id.split('-')[1] + '-val';
                document.getElementById(labelId).innerText = Math.round(parseFloat(e.target.value)*100) + '%';
            }
            updateSynthParameters();
        });
    });

    document.getElementById('btn-clear-seq').addEventListener('click', () => {
        sequencerMatrix = Array(seqNotes.length).fill().map(() => Array(seqSteps).fill(false));
        document.querySelectorAll('.seq-cell').forEach(c => c.classList.remove('active'));
    });

    document.getElementById('btn-play-seq').addEventListener('click', playSequencer);

    // INITIALIZATION RUNS
    drawVirtualKeyboard();
    buildSequencerGrid();
    initChart();
    loadDatasets();
});
