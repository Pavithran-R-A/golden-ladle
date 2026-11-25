// Every sound in the game, synthesized with WebAudio: no audio files, nothing
// loaded over the network. The context starts on the first user gesture, so the
// title screen is silent until the player presses a key or clicks.

export function createAudio() {
  let context = null;
  let master = null;
  let sizzleGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  /** A tiny music loop: a warm bass walk over a soft pluck, one step each 240 ms. */
  const MUSIC_NOTES = [130.81, 164.81, 196.0, 146.83, 130.81, 196.0, 220.0, 164.81];

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      // A looping band of filtered noise for the grill sizzle; silent until a grill slot is hot.
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 5200;
      filter.Q.value = 0.6;
      sizzleGain = context.createGain();
      sizzleGain.gain.value = 0;
      noise.connect(filter);
      filter.connect(sizzleGain);
      sizzleGain.connect(master);
      noise.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, seconds, type, volume, when) {
    if (!context || muted) return;
    const start = context.currentTime + (when || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume || 0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  function thud() {
    if (!context || muted) return;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(180, start);
    oscillator.frequency.exponentialRampToValueAtTime(60, start + 0.09);
    gain.gain.setValueAtTime(0.35, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.12);
  }

  return {
    /** Call on any gesture (start button, first key) so sound is allowed. */
    unlock() {
      if (ensure()) this.startMusic();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    startMusic() {
      if (!context || musicTimer !== null) return;
      musicTimer = window.setInterval(() => {
        if (muted) return;
        const note = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
        tone(note, 0.22, 'triangle', 0.07);
        if (musicStep % 2 === 0) tone(note * 2, 0.12, 'sine', 0.04);
        musicStep += 1;
      }, 240);
    },
    stopMusic() {
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    /** How hot the grill sounds: 0 when nothing grills, 1 when both slots are full. */
    setSizzle(level) {
      if (!context || !sizzleGain) return;
      sizzleGain.gain.linearRampToValueAtTime(muted ? 0 : 0.05 * level, context.currentTime + 0.2);
    },
    chop() {
      thud();
      tone(900, 0.05, 'square', 0.08);
    },
    pickup() {
      tone(520, 0.07, 'sine', 0.12);
    },
    place() {
      tone(340, 0.08, 'triangle', 0.14);
    },
    ready() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1318, 0.16, 'sine', 0.12, 0.09);
    },
    coin() {
      tone(988, 0.1, 'sine', 0.16);
      tone(1319, 0.22, 'sine', 0.16, 0.08);
    },
    buzz() {
      tone(140, 0.22, 'sawtooth', 0.12);
    },
    bell() {
      tone(1568, 0.3, 'sine', 0.14);
      tone(2093, 0.35, 'sine', 0.1, 0.05);
    },
    jingle() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((note, index) => tone(note, 0.25, 'triangle', 0.14, index * 0.12));
    },
    pop() {
      tone(700, 0.06, 'sine', 0.1);
    },
  };
}
