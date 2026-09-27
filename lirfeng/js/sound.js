(function () {
  "use strict";

  class ProceduralSoundFX {
    constructor() {
      this.audioContext = null;
      this.master = null;
      this.storageKey = "rift-expedition-sound-v1";
      const saved = this.readSettings();
      this.muted = saved.muted === true;
      this.volume = Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.58;
    }

    readSettings() {
      try { return JSON.parse(localStorage.getItem(this.storageKey) || "{}"); }
      catch { return {}; }
    }

    saveSettings() {
      try { localStorage.setItem(this.storageKey, JSON.stringify({ muted: this.muted, volume: this.volume })); }
      catch { /* Audio preferences are optional. */ }
    }

    ensureContext() {
      if (this.audioContext) return this.audioContext;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.audioContext = new AudioContextClass();
      this.master = this.audioContext.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.audioContext.destination);
      return this.audioContext;
    }

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (this.master) this.master.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.02);
      this.saveSettings();
    }

    toggleMuted(force) {
      this.muted = typeof force === "boolean" ? force : !this.muted;
      this.saveSettings();
      if (!this.muted) this.play("ui");
      return this.muted;
    }

    tone({ frequency = 440, endFrequency = frequency, duration = 0.18, gain = 0.12, type = "sine", delay = 0 }) {
      const ctx = this.audioContext;
      if (!ctx || !this.master) return;
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      const variation = 0.94 + Math.random() * 0.12;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, frequency * variation), start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency * variation), start + duration);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.018, duration * 0.2));
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope).connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    }

    noise({ duration = 0.15, gain = 0.12, frequency = 900, filterType = "bandpass", delay = 0 }) {
      const ctx = this.audioContext;
      if (!ctx || !this.master) return;
      const start = ctx.currentTime + delay;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const envelope = ctx.createGain();
      source.buffer = buffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(frequency, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.36), start + duration);
      filter.Q.value = filterType === "bandpass" ? 1.2 : 0.6;
      envelope.gain.setValueAtTime(Math.max(0.0002, gain), start);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter).connect(envelope).connect(this.master);
      source.start(start);
      source.stop(start + duration + 0.02);
    }

    play(name) {
      if (this.muted) return false;
      const ctx = this.ensureContext();
      if (!ctx) return false;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const effects = {
        ui: () => this.tone({ frequency: 520, endFrequency: 720, duration: 0.09, gain: 0.07, type: "sine" }),
        summon: () => {
          this.tone({ frequency: 118, endFrequency: 62, duration: 0.24, gain: 0.14, type: "triangle" });
          this.noise({ duration: 0.13, gain: 0.07, frequency: 430, filterType: "lowpass", delay: 0.03 });
        },
        melee: () => {
          this.noise({ duration: 0.12, gain: 0.16, frequency: 1500, filterType: "highpass" });
          this.tone({ frequency: 190, endFrequency: 58, duration: 0.18, gain: 0.18, type: "triangle", delay: 0.055 });
          this.tone({ frequency: 980, endFrequency: 310, duration: 0.075, gain: 0.07, type: "square", delay: 0.065 });
        },
        ranged: () => {
          this.tone({ frequency: 620, endFrequency: 150, duration: 0.13, gain: 0.1, type: "triangle" });
          this.noise({ duration: 0.2, gain: 0.1, frequency: 2300, filterType: "highpass", delay: 0.025 });
          this.tone({ frequency: 170, endFrequency: 82, duration: 0.08, gain: 0.11, type: "sine", delay: 0.14 });
        },
        volley: () => {
          [0, 0.045, 0.09].forEach(delay => {
            this.noise({ duration: 0.16, gain: 0.065, frequency: 2500, filterType: "highpass", delay });
            this.tone({ frequency: 560, endFrequency: 135, duration: 0.11, gain: 0.055, type: "triangle", delay });
          });
        },
        fire: () => {
          this.noise({ duration: 0.34, gain: 0.17, frequency: 1000, filterType: "bandpass" });
          this.tone({ frequency: 210, endFrequency: 48, duration: 0.32, gain: 0.18, type: "sawtooth", delay: 0.02 });
        },
        darkSpell: () => {
          this.tone({ frequency: 340, endFrequency: 72, duration: 0.36, gain: 0.14, type: "sawtooth" });
          this.noise({ duration: 0.3, gain: 0.1, frequency: 560, filterType: "lowpass", delay: 0.04 });
        },
        heal: () => [0, 0.08, 0.16].forEach((delay, index) => this.tone({ frequency: 520 + index * 180, endFrequency: 700 + index * 210, duration: 0.28, gain: 0.07, type: "sine", delay })),
        buff: () => {
          this.tone({ frequency: 180, endFrequency: 620, duration: 0.32, gain: 0.12, type: "triangle" });
          this.tone({ frequency: 360, endFrequency: 920, duration: 0.25, gain: 0.055, type: "sine", delay: 0.08 });
        },
        death: () => {
          this.noise({ duration: 0.28, gain: 0.13, frequency: 420, filterType: "lowpass" });
          this.tone({ frequency: 145, endFrequency: 38, duration: 0.38, gain: 0.15, type: "sawtooth" });
        },
        heroHit: () => {
          this.tone({ frequency: 105, endFrequency: 42, duration: 0.3, gain: 0.2, type: "triangle" });
          this.noise({ duration: 0.17, gain: 0.12, frequency: 680, filterType: "bandpass", delay: 0.025 });
        },
        bossHowl: () => {
          this.tone({ frequency: 240, endFrequency: 78, duration: 0.75, gain: 0.16, type: "sawtooth" });
          this.tone({ frequency: 360, endFrequency: 118, duration: 0.66, gain: 0.09, type: "triangle", delay: 0.07 });
          this.noise({ duration: 0.72, gain: 0.065, frequency: 510, filterType: "bandpass" });
        },
        victory: () => [0, 0.1, 0.2, 0.34].forEach((delay, index) => this.tone({ frequency: [392, 523, 659, 784][index], duration: 0.34, gain: 0.08, type: "triangle", delay })),
        defeat: () => [0, 0.14, 0.28].forEach((delay, index) => this.tone({ frequency: [220, 165, 110][index], endFrequency: [165, 110, 55][index], duration: 0.38, gain: 0.09, type: "sawtooth", delay }))
      };
      (effects[name] || effects.ui)();
      return true;
    }
  }

  window.CardForge = window.CardForge || {};
  window.CardForge.SoundFX = new ProceduralSoundFX();
})();
