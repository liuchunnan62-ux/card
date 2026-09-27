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

    tone({ frequency = 440, endFrequency = frequency, duration = 0.18, gain = 0.12, type = "sine", delay = 0, exact = false }) {
      const ctx = this.audioContext;
      if (!ctx || !this.master) return;
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      // 乐音类音效（和弦、琶音、号角）需要准确音高，其余音效保留随机起伏避免听腻。
      const variation = exact ? 1 : 0.94 + Math.random() * 0.12;
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

    // 以准确音高依次或同时演奏一组音符：notes 为 [频率, 延迟, 时长] 列表。
    notes(list, { type = "triangle", gain = 0.07 } = {}) {
      list.forEach(([frequency, delay, duration]) => this.tone({ frequency, duration, gain, type, delay, exact: true }));
    }

    shimmer(delay = 0, gain = 0.035) {
      [0, 0.05, 0.1, 0.15, 0.2].forEach((offset, index) => this.tone({ frequency: 2093 + index * 262, endFrequency: 2350 + index * 262, duration: 0.14, gain, type: "sine", delay: delay + offset, exact: true }));
      this.noise({ duration: 0.4, gain: gain * 0.7, frequency: 7000, filterType: "highpass", delay });
    }

    cheer(delay = 0, length = 1.2) {
      for (let t = 0; t < length; t += 0.09) {
        this.noise({ duration: 0.35, gain: 0.035 + 0.02 * Math.sin(Math.PI * t / length), frequency: 900 + Math.random() * 900, filterType: "bandpass", delay: delay + t });
      }
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
        // —— 界面与成长 ——
        click: () => this.tone({ frequency: 820, endFrequency: 640, duration: 0.05, gain: 0.035, type: "sine" }),
        error: () => this.notes([[196, 0, 0.1], [156, 0.1, 0.16]], { type: "square", gain: 0.035 }),
        draw: () => {
          this.noise({ duration: 0.12, gain: 0.06, frequency: 2600, filterType: "highpass" });
          this.tone({ frequency: 480, endFrequency: 760, duration: 0.1, gain: 0.035, type: "triangle", delay: 0.04 });
        },
        cardPick: () => {
          this.noise({ duration: 0.07, gain: 0.05, frequency: 3200, filterType: "highpass" });
          this.tone({ frequency: 620, endFrequency: 940, duration: 0.07, gain: 0.03, type: "triangle", delay: 0.02 });
        },
        cardAdd: () => {
          this.noise({ duration: 0.1, gain: 0.05, frequency: 2800, filterType: "highpass" });
          this.notes([[659, 0.03, 0.1], [988, 0.09, 0.16]], { gain: 0.05 });
        },
        cardRemove: () => {
          this.noise({ duration: 0.1, gain: 0.045, frequency: 2000, filterType: "highpass" });
          this.notes([[659, 0.03, 0.1], [440, 0.09, 0.16]], { gain: 0.045 });
        },
        equip: () => {
          this.tone({ frequency: 1250, endFrequency: 980, duration: 0.07, gain: 0.05, type: "square" });
          this.tone({ frequency: 320, endFrequency: 210, duration: 0.18, gain: 0.1, type: "triangle", delay: 0.02 });
          this.notes([[784, 0.12, 0.12], [1175, 0.2, 0.22]], { type: "sine", gain: 0.05 });
        },
        coins: () => [0, 0.07, 0.14, 0.22].forEach((delay, index) => {
          this.tone({ frequency: 1760 + index * 110, endFrequency: 1700 + index * 110, duration: 0.12, gain: 0.045, type: "sine", delay, exact: true });
          this.tone({ frequency: 2637, duration: 0.06, gain: 0.02, type: "triangle", delay: delay + 0.01, exact: true });
        }),
        purchase: () => {
          this.play("coins");
          this.notes([[523, 0.26, 0.14], [784, 0.34, 0.3]], { gain: 0.06 });
        },
        reward: () => {
          this.tone({ frequency: 300, endFrequency: 1200, duration: 0.3, gain: 0.07, type: "triangle", exact: true });
          this.notes([[1047, 0.28, 0.4], [1319, 0.28, 0.4], [1568, 0.28, 0.45]], { type: "sine", gain: 0.045 });
          this.shimmer(0.3, 0.025);
        },
        train: () => {
          this.tone({ frequency: 220, endFrequency: 150, duration: 0.14, gain: 0.08, type: "triangle" });
          this.notes([[587, 0.1, 0.14], [880, 0.2, 0.22]], { type: "sine", gain: 0.05 });
        },
        cardLevelUp: () => {
          this.notes([[1047, 0, 0.12], [1319, 0.07, 0.12], [1568, 0.14, 0.12], [2093, 0.21, 0.4]], { type: "triangle", gain: 0.06 });
          this.shimmer(0.24);
        },
        heroLevelUp: () => {
          this.notes([[392, 0, 0.18], [523, 0.12, 0.18], [659, 0.24, 0.18]], { type: "triangle", gain: 0.08 });
          this.notes([[784, 0.4, 0.8], [988, 0.4, 0.8], [1175, 0.4, 0.8], [392, 0.4, 0.8]], { type: "triangle", gain: 0.055 });
          this.tone({ frequency: 130, endFrequency: 65, duration: 0.5, gain: 0.14, type: "sine", delay: 0.4 });
          this.shimmer(0.45, 0.03);
        },
        rescue: () => {
          this.tone({ frequency: 330, duration: 0.9, gain: 0.06, type: "sine", exact: true });
          this.notes([[659, 0, 0.7], [831, 0.12, 0.7], [988, 0.24, 0.8], [1319, 0.36, 0.9]], { type: "sine", gain: 0.05 });
          this.shimmer(0.4, 0.02);
        },
        save: () => this.notes([[880, 0, 0.14], [1320, 0.1, 0.28]], { type: "sine", gain: 0.05 }),
        emote: () => this.tone({ frequency: 560, endFrequency: 940, duration: 0.08, gain: 0.05, type: "sine" }),
        turnStart: () => {
          this.notes([[392, 0, 0.16], [523, 0.13, 0.32]], { type: "triangle", gain: 0.065 });
          this.notes([[784, 0.13, 0.28]], { type: "sine", gain: 0.025 });
        },
        endTurn: () => {
          this.tone({ frequency: 150, endFrequency: 70, duration: 0.2, gain: 0.1, type: "sine" });
          this.notes([[523, 0.02, 0.12], [392, 0.11, 0.2]], { type: "triangle", gain: 0.045 });
        },
        march: () => {
          [0, 0.18, 0.36].forEach(delay => this.tone({ frequency: 95, endFrequency: 55, duration: 0.25, gain: 0.16, type: "sine", delay }));
          this.notes([[294, 0.1, 0.2], [440, 0.3, 0.2], [587, 0.5, 0.55]], { type: "sawtooth", gain: 0.035 });
          this.notes([[587, 0.5, 0.55], [740, 0.5, 0.55]], { type: "triangle", gain: 0.04 });
        },
        newGame: () => {
          this.play("march");
          this.shimmer(0.55, 0.02);
        },
        // —— 胜利与通关 ——
        bossVictory: () => {
          this.tone({ frequency: 90, endFrequency: 45, duration: 0.8, gain: 0.2, type: "sine" });
          this.noise({ duration: 1.1, gain: 0.05, frequency: 6000, filterType: "highpass" });
          this.notes([[392, 0.05, 0.14], [392, 0.2, 0.14], [523, 0.35, 0.18], [659, 0.52, 0.18], [784, 0.7, 0.9]], { type: "sawtooth", gain: 0.04 });
          this.notes([[523, 0.7, 1], [659, 0.7, 1], [784, 0.7, 1], [262, 0.7, 1]], { type: "triangle", gain: 0.06 });
          this.shimmer(0.75, 0.03);
        },
        chapterClear: () => {
          const chords = [[523, 659, 784], [698, 880, 1047], [784, 988, 1175], [1047, 1319, 1568]];
          chords.forEach((tones, index) => {
            const delay = index * 0.32;
            const duration = index === 3 ? 1.5 : 0.3;
            this.notes(tones.map(freq => [freq, delay, duration]), { type: "triangle", gain: 0.05 });
            this.notes([[tones[0] / 2, delay, duration]], { type: "sawtooth", gain: 0.035 });
            this.tone({ frequency: 110, endFrequency: 55, duration: 0.3, gain: 0.14, type: "sine", delay });
          });
          this.noise({ duration: 1.8, gain: 0.06, frequency: 5500, filterType: "highpass", delay: 0.96 });
          this.shimmer(1, 0.035);
        },
        arenaWin: () => {
          this.cheer(0, 1.3);
          this.notes([[587, 0, 0.14], [740, 0.12, 0.14], [880, 0.24, 0.14], [1175, 0.38, 0.6]], { type: "sawtooth", gain: 0.035 });
          this.notes([[587, 0.38, 0.6], [880, 0.38, 0.6]], { type: "triangle", gain: 0.05 });
        },
        arenaChampion: () => {
          this.cheer(0, 2.2);
          this.play("chapterClear");
        },
        trialClear: () => {
          this.tone({ frequency: 98, duration: 2, gain: 0.14, type: "sine", exact: true });
          this.tone({ frequency: 262, endFrequency: 255, duration: 1.6, gain: 0.05, type: "sine", exact: true });
          this.tone({ frequency: 415, endFrequency: 409, duration: 1.3, gain: 0.03, type: "sine", exact: true });
          this.noise({ duration: 0.5, gain: 0.05, frequency: 500, filterType: "lowpass" });
          this.notes([[330, 0.5, 1.2], [415, 0.62, 1.1], [494, 0.74, 1], [659, 0.86, 1.1]], { type: "triangle", gain: 0.05 });
        },
        manaUp: () => {
          this.tone({ frequency: 300, endFrequency: 1600, duration: 0.7, gain: 0.07, type: "sine" });
          this.tone({ frequency: 450, endFrequency: 2400, duration: 0.7, gain: 0.03, type: "triangle", delay: 0.05 });
          this.shimmer(0.6, 0.035);
        },
        defeat: () => [0, 0.14, 0.28].forEach((delay, index) => this.tone({ frequency: [220, 165, 110][index], endFrequency: [165, 110, 55][index], duration: 0.38, gain: 0.09, type: "sawtooth", delay }))
      };
      (effects[name] || effects.ui)();
      return true;
    }
  }

  window.CardForge = window.CardForge || {};
  window.CardForge.SoundFX = new ProceduralSoundFX();
})();
