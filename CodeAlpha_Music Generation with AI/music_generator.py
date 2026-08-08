import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import music21

# Device selection
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

class MusicLSTM(nn.Module):
    def __init__(self, vocab_size, embedding_dim=64, hidden_dim=128, num_layers=2, dropout=0.3):
        super(MusicLSTM, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers=num_layers, 
                            batch_first=True, dropout=dropout)
        self.fc = nn.Linear(hidden_dim, vocab_size)
        
    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        # Take the output of the last time step
        last_out = lstm_out[:, -1, :]
        logits = self.fc(last_out)
        return logits

class NotesDataset(Dataset):
    def __init__(self, sequences, targets):
        self.sequences = torch.tensor(sequences, dtype=torch.long)
        self.targets = torch.tensor(targets, dtype=torch.long)
        
    def __len__(self):
        return len(self.sequences)
        
    def __getitem__(self, idx):
        return self.sequences[idx], self.targets[idx]

def parse_midi_files(dataset_dir):
    """
    Parses all MIDI files in a directory and returns a list of notes/chords.
    """
    notes = []
    midi_files = [os.path.join(dataset_dir, f) for f in os.listdir(dataset_dir) if f.endswith('.mid') or f.endswith('.midi')]
    
    if not midi_files:
        raise ValueError(f"No MIDI files found in {dataset_dir}")
        
    for file_path in midi_files:
        print(f"Parsing {file_path}...")
        try:
            # Parse MIDI file
            midi_data = music21.converter.parse(file_path)
            
            # Extract notes and chords
            notes_in_file = []
            elements = midi_data.flatten().notes
            for el in elements:
                if isinstance(el, music21.note.Note):
                    notes_in_file.append(str(el.pitch))
                elif isinstance(el, music21.chord.Chord):
                    # Sort pitches by pitch height to keep chord notes ordered
                    sorted_pitches = sorted(el.pitches, key=lambda p: p.ps)
                    notes_in_file.append('.'.join(str(p) for p in sorted_pitches))
                elif isinstance(el, music21.note.Rest):
                    notes_in_file.append('rest')
            
            notes.extend(notes_in_file)
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            
    return notes

def prepare_sequences(notes, seq_length=16):
    """
    Prepares training sequences and labels from list of notes, and builds vocabulary.
    """
    # Create vocab
    unique_notes = sorted(list(set(notes)))
    
    # Ensure we always have 'rest' in vocabulary
    if 'rest' not in unique_notes:
        unique_notes.append('rest')
    unique_notes = sorted(unique_notes)
    
    vocab_size = len(unique_notes)
    note_to_int = {note: idx for idx, note in enumerate(unique_notes)}
    int_to_note = {idx: note for idx, note in enumerate(unique_notes)}
    
    # Check if notes list is too small
    if len(notes) <= seq_length:
        # Pad with rests
        notes = ['rest'] * (seq_length + 1 - len(notes)) + notes
        
    inputs = []
    targets = []
    
    # Sliding window
    for i in range(len(notes) - seq_length):
        seq_in = notes[i:i + seq_length]
        note_out = notes[i + seq_length]
        inputs.append([note_to_int[n] for n in seq_in])
        targets.append(note_to_int[note_out])
        
    return inputs, targets, note_to_int, int_to_note

def train_network(dataset_dir, model_save_path, vocab_save_path, 
                  seq_length=16, epochs=20, lr=0.005, hidden_dim=128, 
                  batch_size=32, progress_callback=None, cancel_check=None):
    """
    Trains the PyTorch LSTM network.
    progress_callback: function(epoch, total_epochs, loss)
    cancel_check: function() returning Boolean. If True, training aborts.
    """
    # Load and parse notes
    notes = parse_midi_files(dataset_dir)
    if not notes:
        raise ValueError("Could not extract notes from any MIDI files in the directory.")
        
    # Prepare training sequences
    inputs, targets, note_to_int, int_to_note = prepare_sequences(notes, seq_length)
    vocab_size = len(note_to_int)
    
    # Save vocab
    os.makedirs(os.path.dirname(vocab_save_path), exist_ok=True)
    with open(vocab_save_path, 'w') as f:
        json.dump({
            'note_to_int': note_to_int,
            'int_to_note': {str(k): v for k, v in int_to_note.items()},
            'seq_length': seq_length
        }, f, indent=4)
        
    # Build dataset and dataloader
    dataset = NotesDataset(inputs, targets)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=False)
    
    # Model, Loss, Optimizer
    model = MusicLSTM(vocab_size=vocab_size, hidden_dim=hidden_dim).to(device)
    loss_fn = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    model.train()
    
    print(f"Starting training on device: {device}...")
    print(f"Vocab size: {vocab_size}, Sequences: {len(inputs)}")
    
    for epoch in range(1, epochs + 1):
        if cancel_check and cancel_check():
            print("Training cancelled by user request.")
            break
            
        epoch_losses = []
        for x_batch, y_batch in dataloader:
            x_batch = x_batch.to(device)
            y_batch = y_batch.to(device)
            
            optimizer.zero_grad()
            outputs = model(x_batch)
            loss = loss_fn(outputs, y_batch)
            loss.backward()
            optimizer.step()
            
            epoch_losses.append(loss.item())
            
        avg_loss = np.mean(epoch_losses)
        print(f"Epoch {epoch}/{epochs} - Loss: {avg_loss:.4f}")
        
        if progress_callback:
            progress_callback(epoch, epochs, float(avg_loss))
            
    # Save model checkpoint
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    torch.save(model.state_dict(), model_save_path)
    print(f"Saved trained model to {model_save_path}")
    return avg_loss

def sample_with_temperature(logits, temperature=1.0):
    """
    Helper to sample an index from a probability distribution.
    """
    if temperature <= 0.0:
        return torch.argmax(logits, dim=-1).item()
        
    logits = logits / temperature
    probabilities = torch.softmax(logits, dim=-1)
    
    # PyTorch Multinomial sampling
    sampled_idx = torch.multinomial(probabilities, 1).item()
    return sampled_idx

def generate_melody(model_path, vocab_path, output_midi_path, 
                    seed_notes=None, length=100, temperature=1.0, bpm=120, note_duration=0.5):
    """
    Generates music from a trained model and saves it as a MIDI file.
    """
    # Load vocab
    if not os.path.exists(vocab_path):
        raise FileNotFoundError(f"Vocabulary file not found: {vocab_path}")
        
    with open(vocab_path, 'r') as f:
        vocab_data = json.load(f)
        
    note_to_int = vocab_data['note_to_int']
    int_to_note = {int(k): v for k, v in vocab_data['int_to_note'].items()}
    seq_length = vocab_data['seq_length']
    vocab_size = len(note_to_int)
    
    # Load model
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
        
    # Get model hidden dim from weights
    state_dict = torch.load(model_path, map_location=device)
    hidden_dim = state_dict['lstm.weight_hh_l0'].shape[1] # Check hidden_size
    
    model = MusicLSTM(vocab_size=vocab_size, hidden_dim=hidden_dim).to(device)
    model.load_state_dict(state_dict)
    model.eval()
    
    # Prepare seed notes
    if not seed_notes:
        # Default seed: repeat a common note or rest
        default_note = 'rest' if 'rest' in note_to_int else list(note_to_int.keys())[0]
        seed_notes = [default_note] * seq_length
    else:
        # Sanitize seed notes: make sure they are in the vocabulary
        sanitized_seed = []
        for n in seed_notes:
            if n in note_to_int:
                sanitized_seed.append(n)
            else:
                # Find matching pitch if chord, or fallback
                sanitized_seed.append('rest')
        seed_notes = sanitized_seed
        
        # Adjust seed notes length
        if len(seed_notes) < seq_length:
            # Pad with rest
            seed_notes = ['rest'] * (seq_length - len(seed_notes)) + seed_notes
        else:
            # Take last seq_length notes
            seed_notes = seed_notes[-seq_length:]
            
    # Map seed to integers
    current_seq = [note_to_int[n] for n in seed_notes]
    generated_notes = []
    
    # Generate notes step-by-step
    with torch.no_grad():
        for _ in range(length):
            x = torch.tensor([current_seq], dtype=torch.long).to(device) # shape: [1, seq_length]
            logits = model(x) # shape: [1, vocab_size]
            
            # Sample next note
            next_idx = sample_with_temperature(logits[0], temperature)
            next_note = int_to_note[next_idx]
            
            generated_notes.append(next_note)
            
            # Slide window
            current_seq = current_seq[1:] + [next_idx]
            
    # Write generated notes to MIDI file
    s = music21.stream.Stream()
    s.append(music21.tempo.MetronomeMark(number=bpm))
    
    for note_str in generated_notes:
        if note_str == 'rest':
            r = music21.note.Rest(quarterLength=note_duration)
            s.append(r)
        elif '.' in note_str:
            # Chord
            pitch_names = note_str.split('.')
            c = music21.chord.Chord(pitch_names, quarterLength=note_duration)
            s.append(c)
        else:
            # Single note
            n = music21.note.Note(note_str, quarterLength=note_duration)
            s.append(n)
            
    os.makedirs(os.path.dirname(output_midi_path), exist_ok=True)
    s.write('midi', fp=output_midi_path)
    print(f"Generated melody and saved to {output_midi_path}")
    
    return generated_notes
