"""Compose an original 60-second uplifting background track for the video.

Writes public/music.wav (44.1 kHz stereo). No samples or downloads: every sound is synthesised here,
so the track is free to use anywhere.

    python3 make_music.py

Structure follows the video's scenes at 120 BPM (one bar = 2 s, chords C – G – Am – F):
  0–5 s   intro: warm pad
  5–13 s  target: pad + plucked arpeggio + soft kick
  13–29 s day by day: bass, hi-hats and snare join, riser into the chorus
  29–56 s rankings and race: full chorus with lead melody and claps
  56–60 s summary: final chord rings out
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
LENGTH = 60.0
N = int(SR * LENGTH)
rng = np.random.default_rng(7)

# MIDI numbers. Progression I–V–vi–IV in C major.
CHORDS = [
    [48, 52, 55, 60, 64],  # C
    [43, 50, 55, 59, 62],  # G
    [45, 52, 57, 60, 64],  # Am
    [41, 48, 53, 57, 60],  # F
]
ROOTS = [36, 31, 33, 29]
# Lead motif per chord: (beat offset, midi, length in beats)
MOTIF = [
    [(0, 76, 1), (1, 79, 1), (2, 81, 1.5), (3.5, 79, 0.5)],
    [(0, 79, 1.5), (1.5, 74, 0.5), (2, 74, 1), (3, 71, 1)],
    [(0, 72, 1), (1, 76, 1), (2, 81, 1), (3, 79, 1)],
    [(0, 77, 1.5), (1.5, 76, 0.5), (2, 72, 1), (3, 74, 1)],
]


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    """ADSR envelope over n samples (times in seconds)."""
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n)
    e = np.concatenate([np.linspace(0, 1, a_n, endpoint=False), np.linspace(1, s, d_n, endpoint=False),
                        np.full(s_n, s), np.linspace(s, 0, r_n)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # one-pole filter; fine for short buffers
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def saw(f: float, t: np.ndarray, harmonics: int = 12) -> np.ndarray:
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        if f * k > 9000:
            break
        out += np.sin(2 * np.pi * f * k * t) / k
    return out


L = np.zeros(N)
R = np.zeros(N)


def add(sig: np.ndarray, start: float, gain: float = 1.0, pan: float = 0.0) -> None:
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * np.sqrt((1 - pan) / 2)
    R[i:i + len(sig)] += sig * gain * np.sqrt((1 + pan) / 2)


def bars(a: float, b: float):
    return range(int(a / BAR), int(np.ceil(b / BAR)))


# Pad: detuned saws, slow swell, across the whole piece.
for b in bars(0, 56):
    chord = CHORDS[b % 4]
    n = int(BAR * SR * 1.05)
    t = np.arange(n) / SR
    tone = sum(saw(hz(m), t, 8) + saw(hz(m) * 1.004, t, 8) for m in chord[1:])
    e = env(n, 0.5, 0.3, 0.85, 0.4)
    add(lowpass(tone * e, 1400 if b < 14 else 2600) * 0.05, b * BAR, pan=-0.2)
    add(lowpass(tone * e, 1400 if b < 14 else 2600) * 0.05, b * BAR + 0.012, pan=0.2)
# Final chord rings out.
t = np.arange(int(4.5 * SR)) / SR
final = sum(saw(hz(m), t, 8) + saw(hz(m) * 1.004, t, 8) for m in [48, 55, 60, 64, 67, 72])
add(lowpass(final * env(len(t), 0.05, 0.5, 0.6, 3.5), 2600) * 0.06, 56.0)

# Plucked arpeggio, 16th notes, from 5 s.
pattern = [0, 2, 3, 4, 3, 2, 1, 2]
for b in bars(5, 56):
    chord = CHORDS[b % 4]
    for k in range(16):
        start = b * BAR + k * BEAT / 4
        if start < 5 or start >= 56:
            continue
        m = chord[1:][pattern[k % 8] % 4] + 12
        n = int(0.32 * SR)
        t = np.arange(n) / SR
        tone = np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(2 * np.pi * hz(m) * 2 * t) + 0.15 * np.sin(2 * np.pi * hz(m) * 3 * t)
        add(tone * np.exp(-t * 14) * 0.07, start, pan=0.35 if k % 2 else -0.35)

# Drums.
def kick() -> np.ndarray:
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare(tail: float = 18) -> np.ndarray:
    n = int(0.25 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - lowpass(noise, 1800)
    return noise * np.exp(-t * tail) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4


def hat() -> np.ndarray:
    n = int(0.05 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    return (noise - lowpass(noise, 7000)) * np.exp(-t * 80)


K, SN, H = kick(), snare(), hat()
duck = np.ones(N)
for b in bars(5, 56):
    for q in range(4):
        s = b * BAR + q * BEAT
        if s >= 56:
            continue
        if s < 13 and q % 2:  # half-time kick in the target scene
            continue
        add(K, s, 0.55 if s < 13 else 0.8)
        i = int(s * SR); d = int(0.25 * SR)
        duck[i:i + d] = np.minimum(duck[i:i + d], 0.55 + 0.45 * np.linspace(0, 1, len(duck[i:i + d])))
        if s >= 13:
            if q in (1, 3):
                add(SN, s, 0.32 if s < 29 else 0.42)
            add(H, s + BEAT / 2, 0.16, pan=0.3)
            if s >= 29:
                add(H, s + BEAT / 4, 0.08, pan=-0.3)
                add(H, s + 3 * BEAT / 4, 0.08, pan=-0.3)

# Snare roll and noise riser into the chorus (27–29 s).
for k in range(16):
    add(snare(26), 27 + k * 0.125, 0.12 + 0.02 * k)
n = int(2 * SR); t = np.arange(n) / SR
noise = rng.standard_normal(n)
riser = (noise - lowpass(noise, 600 + 4000 * 0)) * (t / 2) ** 2
add(riser * 0.25, 27.0)
# Crash on the downbeat of the chorus.
n = int(2 * SR); t = np.arange(n) / SR
noise = rng.standard_normal(n)
add((noise - lowpass(noise, 4000)) * np.exp(-t * 2.2) * 0.22, 29.0)

# Bass from 13 s: root on eighth notes with a little bite.
for b in bars(13, 56):
    root = ROOTS[b % 4]
    for e8 in range(8):
        s = b * BAR + e8 * BEAT / 2
        if s < 13 or s >= 56:
            continue
        n = int(BEAT / 2 * SR); t = np.arange(n) / SR
        tone = np.tanh(2.2 * (np.sin(2 * np.pi * hz(root) * t) + 0.3 * np.sin(2 * np.pi * hz(root) * 2 * t)))
        add(tone * env(n, 0.005, 0.08, 0.7, 0.05) * 0.22, s)

# Lead melody in the chorus, 29–56 s, with a little vibrato and delay.
for b in bars(29, 56):
    for off, m, ln in MOTIF[b % 4]:
        s = b * BAR + off * BEAT
        if s < 29 or s >= 56:
            continue
        n = int(ln * BEAT * SR); t = np.arange(n) / SR
        f = hz(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4, 0, 1))
        ph = 2 * np.pi * np.cumsum(f) / SR
        tone = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph) + 0.12 * np.sin(4 * ph)
        sig = tone * env(n, 0.01, 0.1, 0.75, 0.08) * 0.075
        add(sig, s, pan=0.1)
        add(sig * 0.35, s + 3 * BEAT / 4, pan=-0.5)  # delay echo

# Mix: sidechain pad/arp under the kick, gentle fades, soft limiter.
mix = np.stack([L, R]) * duck
t = np.arange(N) / SR
fade = np.clip(t / 1.5, 0, 1) * np.clip((LENGTH - t) / 2.5, 0, 1)
mix *= fade
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) * 0.89

out = Path(__file__).resolve().parent / 'public' / 'music.wav'
out.parent.mkdir(exist_ok=True)
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype('<i2').tobytes())
print(f'wrote {out} ({LENGTH:.0f} s)')
