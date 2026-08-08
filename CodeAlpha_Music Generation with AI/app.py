import os
import uuid
import time
import threading
from flask import Flask, render_template, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

import midi_dataset_generator
import music_generator

app = Flask(__name__)

# Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BASE_DIR, 'datasets')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
STATIC_OUTPUT_DIR = os.path.join(BASE_DIR, 'static', 'output')
STATIC_UPLOADS_DIR = os.path.join(DATASETS_DIR, 'uploaded')

# Ensure directories exist
os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(STATIC_OUTPUT_DIR, exist_ok=True)
os.makedirs(STATIC_UPLOADS_DIR, exist_ok=True)

# Generate presets on startup
print("Initializing datasets...")
midi_dataset_generator.generate_all_presets()

# Global training state
training_state = {
    'running': False,
    'epoch': 0,
    'total_epochs': 0,
    'loss': 0.0,
    'history': [],
    'dataset_name': '',
    'status': 'Idle',
    'error': None
}
cancel_training = False
state_lock = threading.Lock()

def pretrain_on_startup():
    """
    Train a quick model on Tamil Hits on startup if it doesn't exist,
    so the user can generate music immediately.
    """
    model_path = os.path.join(MODELS_DIR, 'tamil_hits', 'model.pth')
    vocab_path = os.path.join(MODELS_DIR, 'tamil_hits', 'vocab.json')
    
    if not os.path.exists(model_path):
        print("Pre-training basic Tamil Hits model for instant generation...")
        try:
            music_generator.train_network(
                dataset_dir=os.path.join(DATASETS_DIR, 'tamil_hits'),
                model_save_path=model_path,
                vocab_save_path=vocab_path,
                seq_length=16,
                epochs=5,
                lr=0.01,
                hidden_dim=128,
                batch_size=32
            )
            print("Pre-training complete.")
        except Exception as e:
            print(f"Pre-training failed: {e}")

# Pre-train in background so server starts up instantly
threading.Thread(target=pretrain_on_startup, daemon=True).start()


def training_worker(dataset_name, epochs, lr, seq_length, hidden_dim, batch_size):
    global cancel_training, training_state
    
    dataset_dir = os.path.join(DATASETS_DIR, dataset_name)
    model_save_path = os.path.join(MODELS_DIR, dataset_name, 'model.pth')
    vocab_save_path = os.path.join(MODELS_DIR, dataset_name, 'vocab.json')
    
    def progress_callback(epoch, total_epochs, loss):
        with state_lock:
            training_state['epoch'] = epoch
            training_state['total_epochs'] = total_epochs
            training_state['loss'] = loss
            training_state['history'].append({'epoch': epoch, 'loss': loss})
            training_state['status'] = f"Training epoch {epoch}/{total_epochs}..."
            
    def cancel_check():
        return cancel_training

    try:
        with state_lock:
            training_state['running'] = True
            training_state['epoch'] = 0
            training_state['total_epochs'] = epochs
            training_state['loss'] = 0.0
            training_state['history'] = []
            training_state['dataset_name'] = dataset_name
            training_state['status'] = "Preprocessing MIDI files..."
            training_state['error'] = None
            
        music_generator.train_network(
            dataset_dir=dataset_dir,
            model_save_path=model_save_path,
            vocab_save_path=vocab_save_path,
            seq_length=seq_length,
            epochs=epochs,
            lr=lr,
            hidden_dim=hidden_dim,
            batch_size=batch_size,
            progress_callback=progress_callback,
            cancel_check=cancel_check
        )
        
        with state_lock:
            training_state['running'] = False
            training_state['status'] = "Completed successfully!" if not cancel_training else "Cancelled by user."
            
    except Exception as e:
        print(f"Error in training worker: {e}")
        with state_lock:
            training_state['running'] = False
            training_state['status'] = "Failed"
            training_state['error'] = str(e)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    """
    Returns a list of available datasets (subdirectories of datasets/) 
    along with their contained files.
    """
    datasets = {}
    try:
        for folder in os.listdir(DATASETS_DIR):
            folder_path = os.path.join(DATASETS_DIR, folder)
            if os.path.isdir(folder_path):
                files = [f for f in os.listdir(folder_path) if f.endswith('.mid') or f.endswith('.midi')]
                datasets[folder] = {
                    'name': folder.replace('_', ' ').title(),
                    'folder': folder,
                    'files': files,
                    'count': len(files),
                    'model_exists': os.path.exists(os.path.join(MODELS_DIR, folder, 'model.pth'))
                }
        return jsonify({'success': True, 'datasets': datasets})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/train', methods=['POST'])
def start_training():
    global cancel_training, training_thread
    
    with state_lock:
        if training_state['running']:
            return jsonify({'success': False, 'message': 'Training is already running!'}), 400
            
    data = request.json or {}
    dataset = data.get('dataset', 'tamil_hits')
    epochs = int(data.get('epochs', 20))
    lr = float(data.get('lr', 0.005))
    seq_length = int(data.get('seq_length', 16))
    hidden_dim = int(data.get('hidden_dim', 128))
    batch_size = int(data.get('batch_size', 32))
    
    dataset_dir = os.path.join(DATASETS_DIR, dataset)
    if not os.path.exists(dataset_dir) or not os.path.isdir(dataset_dir):
        return jsonify({'success': False, 'message': f'Dataset folder "{dataset}" does not exist.'}), 404
        
    midi_files = [f for f in os.listdir(dataset_dir) if f.endswith('.mid') or f.endswith('.midi')]
    if not midi_files:
        return jsonify({'success': False, 'message': f'No MIDI files found in dataset "{dataset}".'}), 400
        
    cancel_training = False
    training_thread = threading.Thread(
        target=training_worker,
        args=(dataset, epochs, lr, seq_length, hidden_dim, batch_size),
        daemon=True
    )
    training_thread.start()
    
    return jsonify({'success': True, 'message': 'Training started.'})


@app.route('/api/train/status', methods=['GET'])
def get_training_status():
    with state_lock:
        return jsonify(training_state)


@app.route('/api/train/stop', methods=['POST'])
def stop_training():
    global cancel_training
    with state_lock:
        if not training_state['running']:
            return jsonify({'success': False, 'message': 'Training is not running.'}), 400
        cancel_training = True
        training_state['status'] = "Stopping training..."
    return jsonify({'success': True, 'message': 'Cancellation requested.'})


@app.route('/api/generate', methods=['POST'])
def generate_music():
    data = request.json or {}
    dataset = data.get('dataset', 'tamil_hits')
    seed_notes = data.get('seed_notes', []) # List of note strings
    length = int(data.get('length', 100))
    temperature = float(data.get('temperature', 1.0))
    bpm = int(data.get('bpm', 120))
    note_duration = float(data.get('note_duration', 0.5))
    
    model_path = os.path.join(MODELS_DIR, dataset, 'model.pth')
    vocab_path = os.path.join(MODELS_DIR, dataset, 'vocab.json')
    
    if not os.path.exists(model_path) or not os.path.exists(vocab_path):
        return jsonify({
            'success': False, 
            'message': f'No trained model found for dataset "{dataset}". Please train the model first!'
        }), 404
        
    filename = f"gen_{dataset}_{uuid.uuid4().hex[:8]}.mid"
    output_path = os.path.join(STATIC_OUTPUT_DIR, filename)
    
    try:
        # Generate note sequence and save MIDI
        generated_notes = music_generator.generate_melody(
            model_path=model_path,
            vocab_path=vocab_path,
            output_midi_path=output_path,
            seed_notes=seed_notes,
            length=length,
            temperature=temperature,
            bpm=bpm,
            note_duration=note_duration
        )
        
        midi_url = f"/static/output/{filename}"
        return jsonify({
            'success': True,
            'midi_url': midi_url,
            'filename': filename,
            'notes': generated_notes
        })
    except Exception as e:
        print(f"Generation error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part in the request.'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected.'}), 400
        
    if file and (file.filename.endswith('.mid') or file.filename.endswith('.midi')):
        filename = secure_filename(file.filename)
        file.save(os.path.join(STATIC_UPLOADS_DIR, filename))
        return jsonify({
            'success': True, 
            'message': f'File {filename} uploaded successfully to "uploaded" dataset.',
            'filename': filename
        })
    else:
        return jsonify({'success': False, 'message': 'Invalid file format. Only .mid or .midi files allowed.'}), 400


@app.route('/api/datasets/<dataset_name>/<filename>', methods=['GET'])
def serve_dataset_midi(dataset_name, filename):
    try:
        return send_from_directory(os.path.join(DATASETS_DIR, dataset_name), filename)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 404


if __name__ == '__main__':
    # Start Flask development server on port 5005
    app.run(host='0.0.0.0', port=5005, debug=False)
