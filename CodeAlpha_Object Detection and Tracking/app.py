import cv2
import threading
import time
import os
import json
import glob
from flask import Flask, Response, jsonify, request, render_template
from ultralytics import YOLO
from tracker import SortTracker
import numpy as np

app = Flask(__name__, template_folder='templates', static_folder='static')

# Clean uploads directory on startup to remove any stale files
os.makedirs('uploads', exist_ok=True)
for f in glob.glob("uploads/*"):
    try:
        os.remove(f)
    except Exception as e:
        print(f"Startup clean error: {e}")

# Global configuration settings
settings = {
    'conf_threshold': 0.25,
    'iou_threshold': 0.45,
    'selected_tracker': 'custom_sort',  # 'custom_sort', 'botsort', 'bytetrack'
    'selected_classes': [],            # Empty list means all classes
    'model_size': 'yolov8n',           # 'yolov8n' (nano), 'yolov8s' (small)
    'source_type': 'webcam',           # 'webcam', 'file'
    'file_path': '',
    'mirror_feed': True                # Mirror webcam video feed by default
}

# Global statistics
stats = {
    'fps': 0,
    'total_detected': 0,
    'class_counts': {},
    'tracked_objects': []
}

# Thread controls
processing_thread = None
thread_lock = threading.Lock()
stop_thread = False
latest_frame = None
active_camera_index = None
active_camera_backend = cv2.CAP_DSHOW

def find_working_camera():
    """
    Scans for the first active camera device index on the machine (0 to 3) once,
    trying both DirectShow (more stable on Windows) and default backends.
    """
    for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, None]:
        for index in [0, 1, 2, 3]:
            try:
                if backend is not None:
                    temp_cap = cv2.VideoCapture(index, backend)
                else:
                    temp_cap = cv2.VideoCapture(index)
                    
                if temp_cap is not None and temp_cap.isOpened():
                    # Warm up sensor by reading a frame
                    ret, _ = temp_cap.read()
                    if ret:
                        temp_cap.release()
                        print(f"Found working camera device at index: {index} with backend: {backend}")
                        return index, backend
                    temp_cap.release()
            except Exception:
                pass
    print("No working camera device detected. Falling back to index 0, CAP_DSHOW.")
    return 0, cv2.CAP_DSHOW

def safe_delete_file(filepath):
    """
    Windows has strict file lock policies. This helper forces garbage collection 
    and retries deletion in a separate thread context to prevent lock collisions.
    """
    import gc
    gc.collect()
    for i in range(10):
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                print(f"Successfully deleted temporary video file: {filepath}")
                break
        except Exception as e:
            print(f"Delete attempt {i+1} failed: {e}")
            time.sleep(0.2)

def create_dummy_frame(text="NO CAMERA FEED"):
    """
    Generates a dark placeholder frame containing diagnostic HUD layouts 
    so the web client remains active even if camera is busy or unplugged.
    """
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # HUD graphics overlay
    cv2.line(frame, (20, 240), (620, 240), (30, 30, 30), 1)
    cv2.line(frame, (320, 20), (320, 460), (30, 30, 30), 1)
    cv2.drawMarker(frame, (320, 240), (80, 80, 80), cv2.MARKER_CROSS, 20, 1)
    cv2.putText(frame, "DIAGNOSTIC: OFFLINE", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1, cv2.LINE_AA)
    
    # Message text
    (w_txt, h_txt), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
    cv2.putText(frame, text, (320 - w_txt//2, 240 + h_txt//2), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 2, cv2.LINE_AA)
    return frame

def get_color(track_id):
    """
    Returns a distinct, vibrant BGR color for each track ID.
    """
    palette = [
        (0, 255, 255),    # Neon Cyan
        (255, 0, 255),    # Neon Magenta
        (255, 255, 0),    # Neon Yellow
        (0, 255, 0),      # Neon Green
        (0, 128, 255),    # Neon Orange
        (255, 128, 0),    # Neon Sky Blue
        (128, 0, 255),    # Violet
        (255, 0, 127),    # Neon Pink
        (0, 255, 128),    # Neon Mint
        (128, 255, 0)     # Neon Lime
    ]
    return palette[track_id % len(palette)]

def video_processing_loop():
    """
    Continuous background loop that grabs frames, runs YOLO inference,
    runs the selected tracking algorithm, overlays details, and buffers the output frame.
    """
    global latest_frame, stats, stop_thread, active_camera_index, active_camera_backend
    
    current_source_type = None
    current_file_path = None
    current_model_size = None
    
    cap = None
    model = None
    custom_tracker = SortTracker()
    
    frame_count = 0
    start_time = time.time()
    
    while not stop_thread:
        # 1. Fetch current settings safely
        with thread_lock:
            model_to_load = settings['model_size']
            source_type = settings['source_type']
            file_path = settings['file_path']
            conf_threshold = settings['conf_threshold']
            iou_threshold = settings['iou_threshold']
            selected_tracker = settings['selected_tracker']
            selected_classes = list(settings['selected_classes'])
            mirror_feed = settings.get('mirror_feed', True)
            
        # 2. Check if model size changed
        if model is None or current_model_size != model_to_load:
            model = YOLO(f"{model_to_load}.pt")
            current_model_size = model_to_load
            
        # 3. Check if input source changed
        if cap is None or current_source_type != source_type or (source_type == 'file' and current_file_path != file_path):
            if cap is not None:
                cap.release()
                # Clean up uploaded video in background thread to avoid main loop blocks
                if current_source_type == 'file' and current_file_path:
                    threading.Thread(target=safe_delete_file, args=(current_file_path,)).start()
            
            if source_type == 'webcam':
                if active_camera_index is None:
                    active_camera_index, active_camera_backend = find_working_camera()
                cap = cv2.VideoCapture(active_camera_index, active_camera_backend)
            else:
                if file_path and os.path.exists(file_path):
                    cap = cv2.VideoCapture(file_path)
                else:
                    # Fallback to webcam
                    if active_camera_index is None:
                        active_camera_index, active_camera_backend = find_working_camera()
                    cap = cv2.VideoCapture(active_camera_index, active_camera_backend)
                    with thread_lock:
                        settings['source_type'] = 'webcam'
                        settings['file_path'] = ''
                        source_type = 'webcam'
            
            current_source_type = source_type
            current_file_path = file_path
            frame_count = 0
            start_time = time.time()
            custom_tracker = SortTracker()  # Reset tracking IDs

        # 4. Check if cap opened successfully, if not show dummy frame
        if cap is None or not cap.isOpened():
            dummy = create_dummy_frame("SELECTING CAMERA SOURCE...")
            _, jpeg = cv2.imencode('.jpg', dummy)
            latest_frame = jpeg.tobytes()
            stats['fps'] = 0.0
            time.sleep(1.0)
            if source_type == 'webcam':
                if active_camera_index is None:
                    active_camera_index, active_camera_backend = find_working_camera()
                if cap is not None:
                    cap.release()
                cap = cv2.VideoCapture(active_camera_index, active_camera_backend)
            continue

        ret, frame = cap.read()
        if not ret:
            if source_type == 'file':
                # Loop video file automatically
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                dummy = create_dummy_frame("WEBCAM SIGNAL LOST / CAMERA BUSY")
                _, jpeg = cv2.imencode('.jpg', dummy)
                latest_frame = jpeg.tobytes()
                stats['fps'] = 0.0
                time.sleep(1.0)
                # Try releasing and re-opening to recover!
                if cap is not None:
                    cap.release()
                cap = cv2.VideoCapture(active_camera_index, active_camera_backend)
                continue

        # Flip frame if webcam and mirror feed active
        if source_type == 'webcam' and mirror_feed:
            frame = cv2.flip(frame, 1)

        # Resize frames wider than 1080px to maintain consistent speed
        h, w = frame.shape[:2]
        if w > 1080:
            new_w = 1080
            new_h = int(h * (1080 / w))
            frame = cv2.resize(frame, (new_w, new_h))

        t1 = time.time()
        
        # 4. Resolve selected class indices to filter inference output
        class_indices = []
        if selected_classes:
            for idx, name in model.names.items():
                if name in selected_classes:
                    class_indices.append(idx)
        
        # 5. Run inference depending on selected tracking mode
        if selected_tracker in ['botsort', 'bytetrack']:
            # Built-in Ultralytics tracking
            classes_arg = class_indices if class_indices else None
            tracker_file = "botsort.yaml" if selected_tracker == 'botsort' else "bytetrack.yaml"
            
            results = model.track(
                source=frame,
                persist=True,
                tracker=tracker_file,
                conf=conf_threshold,
                iou=iou_threshold,
                classes=classes_arg,
                verbose=False
            )
        else:
            # Predict and feed into Custom SORT Tracker
            classes_arg = class_indices if class_indices else None
            results = model.predict(
                source=frame,
                conf=conf_threshold,
                iou=iou_threshold,
                classes=classes_arg,
                verbose=False
            )

        # 6. Process results and overlay bounding boxes + IDs
        tracked_objects_data = []
        class_counts_local = {}
        processed_frame = frame.copy()
        
        if selected_tracker in ['botsort', 'bytetrack'] and len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for box in boxes:
                if box.id is not None:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    track_id = int(box.id[0].item())
                    conf = float(box.conf[0].item())
                    cls_id = int(box.cls[0].item())
                    cls_name = model.names[cls_id]
                    
                    tracked_objects_data.append({
                        'id': track_id,
                        'class': cls_name,
                        'conf': conf,
                        'bbox': [x1, y1, x2, y2]
                    })
                    
                    class_counts_local[cls_name] = class_counts_local.get(cls_name, 0) + 1
                    
                    # Draw visual indicators
                    color = get_color(track_id)
                    cv2.rectangle(processed_frame, (x1, y1), (x2, y2), color, 2)
                    label = f"ID:{track_id} {cls_name} {conf:.2f}"
                    
                    # Label text overlay background
                    (w_txt, h_txt), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    cv2.rectangle(processed_frame, (x1, y1 - h_txt - 8), (x1 + w_txt + 4, y1), color, -1)
                    cv2.putText(processed_frame, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
        else:
            # Extract raw detections for Custom SORT Tracker
            detections = []
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = box.conf[0].item()
                    cls_id = box.cls[0].item()
                    detections.append([x1, y1, x2, y2, conf, cls_id])
            
            # Apply Custom Tracker
            tracks = custom_tracker.update(detections)
            for track in tracks:
                x1, y1, x2, y2, track_id, cls_id, conf = track
                x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                cls_name = model.names[int(cls_id)]
                
                # Check class filters post-update (safeguard)
                if selected_classes and cls_name not in selected_classes:
                    continue
                
                tracked_objects_data.append({
                    'id': track_id,
                    'class': cls_name,
                    'conf': conf,
                    'bbox': [x1, y1, x2, y2]
                })
                
                class_counts_local[cls_name] = class_counts_local.get(cls_name, 0) + 1
                
                # Draw visual indicators
                color = get_color(track_id)
                cv2.rectangle(processed_frame, (x1, y1), (x2, y2), color, 2)
                label = f"ID:{track_id} {cls_name} {conf:.2f}"
                
                # Label text overlay background
                (w_txt, h_txt), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(processed_frame, (x1, y1 - h_txt - 8), (x1 + w_txt + 4, y1), color, -1)
                cv2.putText(processed_frame, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # 7. FPS Calculation & Stats Sync
        t2 = time.time()
        frame_count += 1
        elapsed = t2 - start_time
        if elapsed >= 1.0:
            current_fps = round(frame_count / elapsed, 1)
            frame_count = 0
            start_time = time.time()
        else:
            current_fps = stats['fps']

        stats['fps'] = current_fps
        stats['total_detected'] = len(tracked_objects_data)
        stats['class_counts'] = class_counts_local
        stats['tracked_objects'] = [
            {'id': item['id'], 'class': item['class'], 'conf': round(item['conf'], 2)}
            for item in tracked_objects_data
        ]

        # 8. Encode processed frame to JPEG for MJPEG stream
        _, jpeg = cv2.imencode('.jpg', processed_frame)
        latest_frame = jpeg.tobytes()
        
        # Control video files processing rate to roughly match normal execution speed
        if source_type == 'file':
            proc_time = t2 - t1
            delay = max(0.01, 0.033 - proc_time)  # Target ~30 FPS
            time.sleep(delay)
            
    if cap is not None:
        cap.release()

def start_processing():
    """Starts the video processing worker thread."""
    global processing_thread, stop_thread
    with thread_lock:
        if processing_thread is None:
            stop_thread = False
            processing_thread = threading.Thread(target=video_processing_loop)
            processing_thread.daemon = True
            processing_thread.start()

def stop_processing():
    """Stops the video processing worker thread."""
    global processing_thread, stop_thread
    with thread_lock:
        if processing_thread is not None:
            stop_thread = True
            processing_thread.join()
            processing_thread = None

# --- Flask Routes ---

@app.route('/')
def index():
    """Renders the main dashboard page."""
    start_processing()
    return render_template('index.html')

def gen_frames():
    """Yields processed JPEG frames back to the client as an MJPEG multipart boundary stream."""
    global latest_frame
    while True:
        if latest_frame is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + latest_frame + b'\r\n')
        time.sleep(0.033)  # limit streamer polling overhead

@app.route('/video_feed')
def video_feed():
    """Endpoint displaying processed webcam or video stream."""
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stats')
def stats_sse():
    """SSE endpoint streaming real-time tracking metrics as events."""
    def event_stream():
        while True:
            yield f"data: {json.dumps(stats)}\n\n"
            time.sleep(0.2)  # Emit 5 times per second
    return Response(event_stream(), mimetype='text/event-stream')

@app.route('/classes')
def get_classes():
    """Fetches list of all classes supported by the active YOLO model."""
    global settings
    with thread_lock:
        model_size = settings['model_size']
    model = YOLO(f"{model_size}.pt")
    classes = sorted(list(model.names.values()))
    return jsonify(classes)

@app.route('/update_settings', methods=['POST'])
def update_settings():
    """Updates active parameters (model type, confidence, target classes, tracker type)."""
    global settings
    data = request.json
    
    with thread_lock:
        if 'conf_threshold' in data:
            settings['conf_threshold'] = float(data['conf_threshold'])
        if 'iou_threshold' in data:
            settings['iou_threshold'] = float(data['iou_threshold'])
        if 'selected_tracker' in data:
            settings['selected_tracker'] = data['selected_tracker']
        if 'model_size' in data:
            settings['model_size'] = data['model_size']
        if 'selected_classes' in data:
            settings['selected_classes'] = list(data['selected_classes'])
        if 'mirror_feed' in data:
            settings['mirror_feed'] = bool(data['mirror_feed'])
            
    return jsonify({'success': True, 'settings': settings})

@app.route('/upload_video', methods=['POST'])
def upload_video():
    """Saves an uploaded video clip with a unique filename, updating active source type to file."""
    global settings
    if 'video' not in request.files:
        return jsonify({'error': 'No file sent'}), 400
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file chosen'}), 400
        
    import uuid
    # Extract extension and generate a unique filename to prevent Windows file-locking conflicts
    ext = os.path.splitext(file.filename)[1] or '.mp4'
    unique_filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join('uploads', unique_filename)
    file.save(filepath)
    
    with thread_lock:
        settings['source_type'] = 'file'
        settings['file_path'] = filepath
        
    return jsonify({'success': True, 'filename': file.filename})

@app.route('/set_webcam', methods=['POST'])
def set_webcam():
    """Resets the input source back to local webcam."""
    global settings
    with thread_lock:
        settings['source_type'] = 'webcam'
        settings['file_path'] = ''
    return jsonify({'success': True})

@app.route('/get_settings', methods=['GET'])
def get_settings():
    """Returns current active settings for frontend synchronization."""
    global settings
    with thread_lock:
        return jsonify(settings)

@app.after_request
def add_header(r):
    """
    Forces browser to retrieve the latest HTML, CSS, and JS files by
    disabling static caching during development.
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

if __name__ == '__main__':
    # Probe and set working camera index once on startup
    active_camera_index, active_camera_backend = find_working_camera()
    # Force loading base YOLO model initially
    start_processing()
    print("Dashboard server running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, threaded=True)
