import os
import music21

def create_midi_file(filepath, tracks_data, bpm=100):
    """
    Creates a multi-track MIDI file.
    tracks_data: list of tracks, where each track is a list of tuples (pitch/chord_list/rest, quarter_length)
    """
    score = music21.stream.Score()
    score.append(music21.tempo.MetronomeMark(number=bpm))
    
    for track_notes in tracks_data:
        part = music21.stream.Part()
        for item, duration in track_notes:
            if item == 'rest' or item == 'Rest':
                r = music21.note.Rest(quarterLength=duration)
                part.append(r)
            elif isinstance(item, list):
                c = music21.chord.Chord(item, quarterLength=duration)
                part.append(c)
            else:
                n = music21.note.Note(item, quarterLength=duration)
                part.append(n)
        score.append(part)
            
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    score.write('midi', fp=filepath)
    print(f"Generated multi-track MIDI: {filepath} ({len(tracks_data)} tracks)")

def generate_all_presets():
    # 1. WHY THIS KOLAVERI DI (F minor - Spotify Key)
    # Melody
    kolaveri_mel = [
        # Intro Synth Riff
        ('C4', 0.5), ('D#4', 0.5), ('G4', 0.5), ('G4', 1.0),
        ('C4', 0.5), ('D#4', 0.5), ('G4', 0.5), ('F4', 1.0),
        ('C4', 0.5), ('D#4', 0.5), ('G4', 0.5), ('G4', 1.0),
        ('D#4', 0.5), ('G4', 0.5), ('F4', 1.5),
        # Chorus: "Why this kolaveri kolaveri kolaveri di"
        ('G4', 0.5), ('G#4', 0.5), ('G4', 0.5), ('F4', 1.5),
        ('G4', 0.5), ('G#4', 0.5), ('G4', 0.5), ('F4', 1.5),
        ('G4', 0.5), ('G#4', 0.5), ('G#4', 0.5), ('A#4', 1.5),
        ('A#4', 0.5), ('G#4', 0.5), ('G4', 0.5), ('F4', 1.0), ('F4', 1.0),
        # Verse 2 hook
        ('G4', 0.5), ('G#4', 0.5), ('G4', 0.5), ('F4', 1.5),
        ('G4', 0.5), ('G#4', 0.5), ('G4', 0.5), ('F4', 1.5),
        ('G4', 0.5), ('G#4', 0.5), ('G#4', 0.5), ('A#4', 1.5),
        ('A#4', 0.5), ('G#4', 0.5), ('G4', 0.5), ('F4', 1.0), ('F4', 1.0),
    ] * 3
    
    # Backing Chords (Fm, D#m, C#)
    f_min = ['F3', 'G#3', 'C4']
    d_sharp = ['D#3', 'G3', 'A#3']
    c_sharp = ['C#3', 'F3', 'G#3']
    
    kolaveri_har = [
        # Intro
        (f_min, 1.5), (d_sharp, 1.5), (f_min, 1.5), (c_sharp, 1.5),
        # Chorus
        (f_min, 2.0), (f_min, 2.0),
        (d_sharp, 2.0), (d_sharp, 2.0),
        (c_sharp, 2.0), (c_sharp, 2.0),
        (f_min, 2.0), (f_min, 2.0),
        # Verse 2
        (f_min, 2.0), (f_min, 2.0),
        (d_sharp, 2.0), (d_sharp, 2.0),
        (c_sharp, 2.0), (c_sharp, 2.0),
        (f_min, 2.0), (f_min, 2.0),
    ] * 3

    # 2. MUNBE VAA (A# minor - Spotify Key)
    # Melody
    munbe_vaa_mel = [
        # "Munbe vaa en anbe vaa"
        ('A#4', 1.0), ('A#4', 0.5), ('G#4', 1.5),
        ('G#4', 0.5), ('F#4', 0.5), ('G#4', 0.5), ('F4', 1.0), ('F4', 1.0),
        ('F4', 0.5), ('F#4', 0.5), ('A#4', 1.5), ('rest', 0.5),
        # "Oone vaa uyire vaa"
        ('A#4', 1.0), ('A#4', 0.5), ('G#4', 1.5),
        ('G#4', 0.5), ('A#4', 0.5), ('C5', 0.5), ('A#4', 1.5),
        ('A#4', 0.5), ('C#5', 0.5), ('C5', 1.5),
        ('C5', 0.5), ('C#5', 0.5), ('A#4', 1.0), ('A#4', 1.0),
    ] * 3

    # Backing Chords (A#m, F#, G#, Fm)
    a_sharp_m = ['A#2', 'C#3', 'F3']
    f_sharp_maj = ['F#2', 'A#2', 'C#3']
    g_sharp_maj = ['G#2', 'C3', 'D#3']
    f_min_low = ['F2', 'G#2', 'C3']

    munbe_vaa_har = [
        (a_sharp_m, 2.0), (f_sharp_maj, 2.0),
        (g_sharp_maj, 2.0), (f_min_low, 2.0),
        (a_sharp_m, 2.0), (f_sharp_maj, 2.0),
        (g_sharp_maj, 2.0), (a_sharp_m, 2.0),
    ] * 3

    # 3. VASEEGARA (D# minor - Spotify Key)
    # Melody
    vaseegara_mel = [
        # "Vaseegaraa en nenjinikka"
        ('D4', 0.75), ('D#4', 0.25), ('D4', 0.5), ('D#4', 0.5), ('D4', 0.5), ('D#4', 0.5), ('F4', 0.75), ('D4', 0.25), ('D#4', 1.5),
        # "Un pon madiyil thoonginaal poadhum"
        ('D#4', 0.5), ('D4', 0.5), ('D#4', 0.5), ('F4', 0.5), ('D4', 0.5), ('D#4', 1.0), ('D#4', 0.5), ('D4', 0.5), ('D#4', 0.5), ('F4', 0.5), ('G4', 1.0), ('D#4', 0.5), ('D4', 1.5),
        # "Adhae kanam en kannuranga"
        ('D4', 0.75), ('D#4', 0.25), ('D4', 0.5), ('D#4', 0.5), ('D4', 0.5), ('D#4', 0.5), ('F4', 0.75), ('D4', 0.25), ('D#4', 1.5),
        # "Mun jenmangalin yeakkangal theerum"
        ('D#4', 0.5), ('D4', 0.5), ('D#4', 0.5), ('F4', 0.5), ('D4', 0.5), ('D#4', 1.0), ('C4', 0.5), ('D#4', 0.5), ('D4', 0.5), ('C4', 0.5), ('A#3', 2.0),
    ] * 3

    # Backing Chords (D#m, G#m, A#, C#)
    d_sharp_m = ['D#3', 'F#3', 'A#3']
    g_sharp_m = ['G#2', 'B2', 'D#3']
    a_sharp_maj = ['A#2', 'D3', 'F3']
    c_sharp_maj = ['C#3', 'F3', 'G#3']

    vaseegara_har = [
        (d_sharp_m, 3.0), (g_sharp_m, 3.0),
        (a_sharp_maj, 3.0), (c_sharp_maj, 3.0),
        (d_sharp_m, 3.0), (g_sharp_m, 3.0),
        (a_sharp_maj, 3.0), (d_sharp_m, 3.0),
    ] * 3

    # 4. PUDHU VELLAI MAZHAI (D minor - Spotify Key)
    # Melody
    pudhu_vellai_mel = [
        # "Pudhu vellai mazhai inge pozhiginradhu"
        ('C4', 0.5), ('D4', 0.5), ('F4', 1.0), ('Eb4', 0.5), ('F4', 0.5), ('Eb4', 0.5), ('F4', 0.5), ('F4', 0.5), ('D4', 1.5),
        ('C4', 0.5), ('D4', 0.5), ('D4', 0.5), ('G4', 1.0), ('F4', 0.5), ('Eb4', 0.5), ('F4', 0.5), ('F4', 0.5), ('D4', 1.5),
        # "Ingu sollaadha idam koodak kulirginradhu"
        ('C4', 0.5), ('D4', 0.5), ('D4', 0.5), ('G4', 0.5), ('G4', 0.5), ('G4', 0.5), ('F4', 0.5), ('G4', 0.5), ('A4', 0.5), ('A4', 0.5), ('G4', 0.5), ('F4', 0.5), ('Eb4', 0.5), ('Eb4', 0.5), ('F4', 0.5), ('F4', 0.5), ('D4', 1.5),
    ] * 3

    # Harmony Chords (Dm, Gm, Am, F)
    d_min_backing = ['D3', 'F3', 'A3']
    g_min_backing = ['G3', 'Bb3', 'D4']
    a_min_backing = ['A3', 'C4', 'E4']
    f_maj_backing = ['F3', 'A3', 'C4']

    pudhu_vellai_har = [
        (d_min_backing, 3.0), (g_min_backing, 3.0),
        (a_min_backing, 3.0), (f_maj_backing, 3.0),
        (d_min_backing, 4.0), (g_min_backing, 4.0),
    ] * 3

    # 5. ROWDY BABY (C# Minor - Spotify Key)
    rowdy_baby_mel = [
        # "Rowdy baby... rowdy baby..."
        ('C#5', 0.25), ('C#5', 0.25), ('E5', 0.5), ('C#5', 0.5), ('B4', 0.5),
        ('C#5', 0.5), ('B4', 0.5), ('G#4', 1.0),
        ('C#5', 0.25), ('C#5', 0.25), ('E5', 0.5), ('C#5', 0.5), ('B4', 0.5),
        ('C#5', 0.5), ('E5', 0.5), ('F#5', 1.0),
        # Bridge
        ('G#5', 0.25), ('F#5', 0.25), ('E5', 0.25), ('C#5', 0.25), ('B4', 0.5), ('C#5', 0.5),
        ('E5', 0.25), ('F#5', 0.25), ('E5', 0.25), ('C#5', 0.25), ('B4', 0.5), ('G#4', 0.5),
    ] * 4

    c_sharp_m_backing = ['C#3', 'E3', 'G#3']
    b_maj_backing = ['B2', 'D#3', 'F#3']
    a_maj_backing = ['A2', 'C#3', 'E3']

    rowdy_baby_har = [
        (c_sharp_m_backing, 2.0), (b_maj_backing, 2.0),
        (c_sharp_m_backing, 2.0), (b_maj_backing, 2.0),
        (c_sharp_m_backing, 2.0), (b_maj_backing, 2.0),
        (a_maj_backing, 2.0), (b_maj_backing, 2.0),
    ] * 4

    # 6. BACH MINUET IN G (Standard Classical)
    bach_minuet_mel = [
        ('D5', 1.0), ('G4', 0.5), ('A4', 0.5), ('B4', 0.5), ('C5', 0.5),
        ('D5', 1.0), ('G4', 1.0), ('G4', 1.0),
        ('E5', 1.0), ('C5', 0.5), ('D5', 0.5), ('E5', 0.5), ('F#5', 0.5),
        ('G5', 1.0), ('G4', 1.0), ('G4', 1.0),
        ('C5', 1.0), ('D5', 0.5), ('C5', 0.5), ('B4', 0.5), ('A4', 0.5),
        ('B4', 1.0), ('C5', 0.5), ('B4', 0.5), ('A4', 0.5), ('G4', 0.5),
        ('F#4', 1.0), ('G4', 0.5), ('A4', 0.5), ('B4', 1.0),
        ('A4', 2.0), ('rest', 1.0)
    ] * 3

    g_maj = ['G2', 'B2', 'D3']
    c_maj_low = ['C2', 'E2', 'G2']
    d_maj_low = ['D2', 'F#2', 'A2']

    bach_minuet_har = [
        (g_maj, 3.0), (g_maj, 3.0),
        (c_maj_low, 3.0), (g_maj, 3.0),
        (c_maj_low, 3.0), (g_maj, 3.0),
        (d_maj_low, 3.0), (d_maj_low, 3.0),
    ] * 3

    # 7. BRAHMAMOKATE (Carnatic Classical - Raga Bowli)
    brahmamokate_mel = [
        ('G4', 1.0), ('G4', 1.0), ('Ab4', 0.5), ('G4', 0.5), ('E4', 1.0),
        ('Db4', 1.0), ('C4', 2.0),
        ('Db4', 1.0), ('E4', 1.0), ('G4', 1.0), ('Ab4', 1.0),
        ('G4', 2.0), ('rest', 1.0),
        ('C4', 0.5), ('Db4', 0.5), ('E4', 1.0), ('E4', 1.0), ('G4', 1.0),
        ('G4', 0.5), ('Ab4', 0.5), ('G4', 1.0), ('E4', 0.5), ('Db4', 0.5), ('C4', 1.5),
        ('E4', 1.0), ('G4', 1.0), ('C5', 1.0), ('C5', 1.0),
        ('C5', 2.0), ('rest', 1.0),
        ('C5', 1.0), ('Ab4', 1.0), ('G4', 1.0), ('E4', 1.0),
        ('Db4', 1.0), ('C4', 2.0)
    ] * 3

    drone_cg = ['C3', 'G3']
    brahmamokate_har = [
        (drone_cg, 4.0), (drone_cg, 4.0),
    ] * 12

    # 8. ALAIPAYUTHEY (Carnatic Classical - Raga Kanada)
    alaipayuthey_mel = [
        ('G4', 0.5), ('A4', 0.5), ('Bb4', 1.0), ('G4', 0.5), ('F4', 0.5), ('G4', 1.5),
        ('G4', 0.5), ('C5', 1.0), ('B4', 0.5), ('C5', 0.5), ('D5', 1.0), ('C5', 1.0),
        ('F5', 0.5), ('Eb5', 0.5), ('D5', 1.0), ('C5', 0.5), ('Bb4', 0.5), ('G4', 2.0),
        ('F4', 1.0), ('G4', 1.0), ('A4', 1.5), ('Bb4', 0.5),
        ('A4', 1.0), ('G4', 1.0), ('F4', 2.0),
        ('E4', 1.0), ('F4', 1.0), ('G4', 1.5), ('A4', 0.5),
        ('G4', 1.0), ('F4', 1.0), ('D4', 2.0),
    ] * 3

    drone_gd = ['G2', 'D3']
    alaipayuthey_har = [
        (drone_gd, 4.0), (drone_gd, 4.0),
    ] * 12

    # 9. BHO SHAMBO (Carnatic Classical - Raga Revati)
    bho_shambo_mel = [
        ('G4', 1.0), ('G4', 1.0), ('Bb4', 1.0), ('G4', 0.5), ('F4', 0.5),
        ('Db4', 1.0), ('C4', 2.0),
        ('Db4', 1.0), ('F4', 1.0), ('G4', 1.0), ('Bb4', 1.0),
        ('C5', 1.0), ('Bb4', 0.5), ('G4', 0.5), ('F4', 1.0), ('Db4', 1.0), ('C4', 2.0),
        ('Bb4', 1.0), ('C5', 1.0), ('Bb4', 1.0), ('G4', 1.0),
        ('F4', 1.0), ('G4', 1.0), ('Bb4', 2.0),
        ('G4', 1.0), ('F4', 1.0), ('Db4', 1.0), ('C4', 1.0),
        ('Db4', 1.0), ('F4', 1.0), ('G4', 2.0),
    ] * 3

    bho_shambo_har = [
        (drone_cg, 4.0), (drone_cg, 4.0),
    ] * 12

    # Generate the files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Tamil Songs (Majority)
    create_midi_file(os.path.join(base_dir, 'datasets', 'tamil_hits', 'why_this_kolaveri_di.mid'), [kolaveri_mel, kolaveri_har], bpm=125)
    create_midi_file(os.path.join(base_dir, 'datasets', 'tamil_hits', 'munbe_vaa.mid'), [munbe_vaa_mel, munbe_vaa_har], bpm=85)
    create_midi_file(os.path.join(base_dir, 'datasets', 'tamil_hits', 'vaseegara.mid'), [vaseegara_mel, vaseegara_har], bpm=90)
    create_midi_file(os.path.join(base_dir, 'datasets', 'tamil_hits', 'pudhu_vellai_mazhai.mid'), [pudhu_vellai_mel, pudhu_vellai_har], bpm=80)
    create_midi_file(os.path.join(base_dir, 'datasets', 'tamil_hits', 'rowdy_baby.mid'), [rowdy_baby_mel, rowdy_baby_har], bpm=130)
    
    # Classical Songs
    create_midi_file(os.path.join(base_dir, 'datasets', 'classical', 'bach_minuet_g.mid'), [bach_minuet_mel, bach_minuet_har], bpm=110)
    create_midi_file(os.path.join(base_dir, 'datasets', 'classical', 'brahmamokate.mid'), [brahmamokate_mel, brahmamokate_har], bpm=95)
    create_midi_file(os.path.join(base_dir, 'datasets', 'classical', 'alaipayuthey.mid'), [alaipayuthey_mel, alaipayuthey_har], bpm=100)
    create_midi_file(os.path.join(base_dir, 'datasets', 'classical', 'bho_shambo.mid'), [bho_shambo_mel, bho_shambo_har], bpm=90)

if __name__ == '__main__':
    generate_all_presets()
