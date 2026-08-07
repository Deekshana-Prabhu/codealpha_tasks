// Color mapping matching backend BGR palette (converted to RGB for HTML/CSS)
const COLOR_PALETTE = [
    'rgb(0, 255, 255)',    // Neon Cyan
    'rgb(255, 0, 255)',    // Neon Magenta
    'rgb(255, 255, 0)',    // Neon Yellow
    'rgb(0, 255, 0)',      // Neon Green
    'rgb(255, 128, 0)',    // Neon Orange
    'rgb(0, 128, 255)',    // Neon Sky Blue
    'rgb(128, 0, 255)',    // Violet
    'rgb(255, 0, 127)',    // Neon Pink
    'rgb(0, 255, 128)',    // Neon Mint
    'rgb(128, 255, 0)'     // Neon Lime
];

function getTrackColor(trackId) {
    return COLOR_PALETTE[trackId % COLOR_PALETTE.length];
}

// State management
let activeClasses = [];
let chartInstance = null;
const chartLimit = 30; // maximum timeline data points
const chartLabels = [];
const chartData = [];

// DOM Elements
const srcWebcam = document.getElementById('src-webcam');
const srcFile = document.getElementById('src-file');
const fileUploaderWrapper = document.getElementById('file-uploader-wrapper');
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const uploadStatus = document.getElementById('upload-status');
const modelSelect = document.getElementById('model-select');
const trackerSelect = document.getElementById('tracker-select');
const confSlider = document.getElementById('conf-slider');
const confVal = document.getElementById('conf-val');
const iouSlider = document.getElementById('iou-slider');
const iouVal = document.getElementById('iou-val');
const classFilters = document.getElementById('class-filters');
const streamImg = document.getElementById('stream-img');
const noFeed = document.getElementById('no-feed');
const hudSourceLbl = document.getElementById('hud-source-lbl');
const hudProcessorLbl = document.getElementById('hud-processor-lbl');
const hudTimeLbl = document.getElementById('hud-time-lbl');
const statFps = document.getElementById('stat-fps');
const statCount = document.getElementById('stat-count');
const trackerTableBody = document.getElementById('tracker-table-body');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    fetchClasses();
    setupEventListeners();
    updateProcessorLabel();
    startTimeUpdate();
});

// --- Chart Setup (Chart.js) ---
function initChart() {
    const ctx = document.getElementById('live-chart').getContext('2d');
    
    // Create gradient fill
    const purpleGradient = ctx.createLinearGradient(0, 0, 0, 120);
    purpleGradient.addColorStop(0, 'rgba(155, 81, 224, 0.4)');
    purpleGradient.addColorStop(1, 'rgba(155, 81, 224, 0.0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Object Count',
                data: chartData,
                borderColor: '#00f2fe',
                borderWidth: 2,
                backgroundColor: purpleGradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointBackgroundColor: '#00f2fe'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(11, 8, 22, 0.9)',
                    titleColor: '#8e8a9f',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 5,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#8e8a9f',
                        font: { family: 'Outfit', size: 9 },
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updateChart(count) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    chartLabels.push(timeStr);
    chartData.push(count);
    
    if (chartLabels.length > chartLimit) {
        chartLabels.shift();
        chartData.shift();
    }
    
    chartInstance.update('none'); // Update without full transition to conserve CPU
}

// --- Fetch and Render Classes ---
async function fetchClasses() {
    try {
        const res = await fetch('/classes');
        const classes = await res.json();
        
        // Build class tags cloud
        classes.forEach(cls => {
            const span = document.createElement('span');
            span.className = 'class-tag';
            span.textContent = cls.replace('_', ' ');
            span.dataset.class = cls;
            
            span.addEventListener('click', () => toggleClassFilter(span, cls));
            classFilters.appendChild(span);
        });
    } catch (e) {
        console.error("Error loading class list", e);
    }
}

function toggleClassFilter(element, className) {
    const allTag = classFilters.querySelector('[data-class="all"]');
    
    if (className === 'all') {
        // Clear all active tags, set all objects active
        const tags = classFilters.querySelectorAll('.class-tag:not([data-class="all"])');
        tags.forEach(t => t.classList.remove('active'));
        allTag.classList.add('active');
        activeClasses = [];
    } else {
        allTag.classList.remove('active');
        element.classList.toggle('active');
        
        // Accumulate active filters
        activeClasses = [];
        const activeTags = classFilters.querySelectorAll('.class-tag.active:not([data-class="all"])');
        activeTags.forEach(t => {
            activeClasses.push(t.dataset.class);
        });
        
        // If all filters are manually disabled, fall back to "All Objects"
        if (activeClasses.length === 0) {
            allTag.classList.add('active');
        }
    }
    
    syncSettings();
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Input Source Selection Toggle
    srcWebcam.addEventListener('click', () => {
        srcWebcam.classList.add('active');
        srcFile.classList.remove('active');
        fileUploaderWrapper.style.display = 'none';
        setWebcamSource();
    });

    srcFile.addEventListener('click', () => {
        srcFile.classList.add('active');
        srcWebcam.classList.remove('active');
        fileUploaderWrapper.style.display = 'block';
    });

    // Sliders input monitoring
    confSlider.addEventListener('input', (e) => {
        confVal.textContent = e.target.value;
    });
    confSlider.addEventListener('change', syncSettings);

    iouSlider.addEventListener('input', (e) => {
        iouVal.textContent = e.target.value;
    });
    iouSlider.addEventListener('change', syncSettings);

    // Dropdowns
    modelSelect.addEventListener('change', () => {
        // Re-load classes as model changes might shift indexes or labels
        syncSettings().then(fetchClasses);
        updateProcessorLabel();
    });
    trackerSelect.addEventListener('change', () => {
        syncSettings();
        updateProcessorLabel();
    });

    // File Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            uploadVideoFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadVideoFile(e.target.files[0]);
        }
    });
}

// --- UI Display Updates ---
function updateProcessorLabel() {
    const model = modelSelect.options[modelSelect.selectedIndex].text.split(' ')[0];
    const tracker = trackerSelect.options[trackerSelect.selectedIndex].text.split(' ')[0];
    hudProcessorLbl.textContent = `${model} + ${tracker}`;
}

function startTimeUpdate() {
    setInterval(() => {
        const now = new Date();
        hudTimeLbl.textContent = `TIME: ${now.toTimeString().split(' ')[0]}`;
    }, 1000);
}

// --- API Sync Services ---
async function syncSettings() {
    const payload = {
        conf_threshold: parseFloat(confSlider.value),
        iou_threshold: parseFloat(iouSlider.value),
        selected_tracker: trackerSelect.value,
        model_size: modelSelect.value,
        selected_classes: activeClasses
    };
    
    try {
        const res = await fetch('/update_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (e) {
        console.error("Failed syncing settings with backend", e);
    }
}

async function setWebcamSource() {
    try {
        const res = await fetch('/set_webcam', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            hudSourceLbl.textContent = "WEBCAM LIVE";
            resetStreamFeed();
        }
    } catch (e) {
        console.error("Failed setting webcam source", e);
    }
}

function resetStreamFeed() {
    // Appending timestamp to image URL forces the browser to discard cache and re-establish stream connection
    streamImg.src = '/video_feed?t=' + new Date().getTime();
    streamImg.style.display = 'block';
    noFeed.style.display = 'none';
}

// --- File Upload Handler ---
function uploadVideoFile(file) {
    const formData = new FormData();
    formData.append('video', file);

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    uploadStatus.textContent = 'Uploading...';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload_video', true);

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = percentComplete + '%';
            uploadStatus.textContent = `Uploading ${percentComplete}%`;
        }
    });

    xhr.onload = function() {
        if (xhr.status === 200) {
            const resp = JSON.parse(xhr.responseText);
            if (resp.success) {
                uploadStatus.textContent = 'Upload Successful! Initializing stream...';
                hudSourceLbl.textContent = `FILE: ${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}`;
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    resetStreamFeed();
                }, 1000);
            } else {
                uploadStatus.textContent = 'Upload Failed!';
            }
        } else {
            uploadStatus.textContent = 'Upload Error occurred.';
        }
    };

    xhr.onerror = function() {
        uploadStatus.textContent = 'Upload Connection interrupted.';
    };

    xhr.send(formData);
}

// --- SSE Realtime Metrics Listeners ---
const eventSource = new EventSource('/stats');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    // 1. Update FPS and Object Count UI
    statFps.textContent = data.fps.toFixed(1);
    statCount.textContent = data.total_detected;

    // 2. Feed Timeline Chart
    updateChart(data.total_detected);

    // 3. Update Register Table
    trackerTableBody.innerHTML = '';
    
    if (data.tracked_objects.length === 0) {
        trackerTableBody.innerHTML = `
            <tr>
                <td colspan="3" class="row-placeholder">No active tracks detected.</td>
            </tr>
        `;
    } else {
        data.tracked_objects.forEach(obj => {
            const color = getTrackColor(obj.id);
            // Create CSS background that is translucent matching the tag outline
            const badgeBg = color.replace('rgb', 'rgba').replace(')', ', 0.15)');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <span class="id-badge" style="background-color: ${color}; box-shadow: 0 0 6px ${color}; color: #000;">
                        ${obj.id}
                    </span>
                </td>
                <td style="color: ${color}; font-weight: 500;">
                    ${obj.class.replace('_', ' ')}
                </td>
                <td>
                    <span class="conf-badge">${(obj.conf * 100).toFixed(0)}%</span>
                </td>
            `;
            trackerTableBody.appendChild(tr);
        });
    }
};

eventSource.onerror = function(err) {
    console.error("SSE Connection failed", err);
    // Display error overlay on stream container if SSE breaks
    statFps.textContent = '0.0';
};
