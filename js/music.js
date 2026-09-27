(function () {
  "use strict";

  // 原创程序化背景音乐：所有曲目都由 Web Audio 实时合成，无需任何音频文件。
  const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!match) return null;
    const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
    return 12 * (Number(match[3]) + 1) + NOTE_INDEX[match[1]] + accidental;
  }
  const hz = note => 440 * Math.pow(2, (note - 69) / 12);

  // 旋律记法：每个记号占 stepSize 个16分音符；音名开始新音，“-”延长上一个音，“.”休止，“|”仅用于分小节。
  function parseLine(text, stepSize = 2) {
    const events = [];
    let step = 0;
    let current = null;
    text.split(/\s+/).filter(token => token && token !== "|").forEach(token => {
      if (token === "-") { if (current) current.len += stepSize; }
      else if (token === ".") current = null;
      else {
        current = { step, note: midi(token), len: stepSize };
        events.push(current);
      }
      step += stepSize;
    });
    return events;
  }

  // 和弦记法：根音 + 性质（m=小三，无=大三），例如 "Dm"、"Bb"、"F#m"。
  function chord(name, octave = 3) {
    const match = /^([A-G][#b]?)(m?)$/.exec(name);
    const root = midi(`${match[1]}${octave}`);
    return [root, root + (match[2] ? 3 : 4), root + 7];
  }

  const hits = pattern => [...pattern].map((char, index) => (char === "x" ? index : -1)).filter(index => index >= 0);

  const TRACKS = {
    // 主界面：舒缓、带点怀旧的D小调，只有竖琴琶音、弦乐铺底与长笛主旋律。
    menu: {
      bpm: 80,
      chords: ["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "A"],
      melody: parseLine(`
        A4 - - - F4 - G4 A4 | Bb4 - - - A4 - F4 - | C5 - - - A4 - G4 F4 | G4 - - - - - . . |
        A4 - - - D5 - - C5 | D5 - - - F5 - E5 D5 | Bb4 - - - A4 - G4 - | C#5 - - - E5 - - -`),
      melodyVoice: { type: "sine", gain: 0.085, attack: 0.05, release: 0.35, cutoff: 2600, vibrato: 4.5 },
      melodyOn: pass => pass % 2 === 1,
      pad: { type: "triangle", gain: 0.03, attack: 0.9, cutoff: 1400 },
      arp: { pattern: [0, 1, 2, 1, 0, 2, 1, 2], octave: 4, every: 2, type: "triangle", gain: 0.045, len: 0.5 },
      bass: { steps: [0, 8], type: "sine", gain: 0.11, octave: 2, len: 7 },
      reverb: 0.42
    },

    // 冒险战斗：A小调，驱动感强的八分音符贝斯与标准鼓组。
    adventure: {
      bpm: 126,
      chords: ["Am", "F", "C", "G", "Am", "F", "G", "E"],
      melody: parseLine(`
        E5 - A5 - G5 E5 D5 C5 | D5 - - C5 A4 - - - | C5 - E5 - G5 - E5 C5 | D5 - - - B4 - G4 - |
        E5 - A5 - B5 - C6 - | A5 - G5 F5 E5 - D5 - | D5 - E5 - F5 - D5 - | E5 - - - G#4 - B4 -`),
      melodyVoice: { type: "square", gain: 0.05, attack: 0.01, release: 0.12, cutoff: 2200 },
      melodyOn: pass => pass % 2 === 1,
      pad: { type: "sawtooth", gain: 0.018, attack: 0.25, cutoff: 900 },
      arp: { pattern: [0, 2, 1, 2, 0, 2, 1, 2], octave: 4, every: 2, type: "triangle", gain: 0.035, len: 0.8, when: pass => pass % 2 === 0 },
      bass: { steps: [0, 2, 4, 6, 8, 10, 12, 14], octaveJump: [4, 12], type: "sawtooth", gain: 0.085, octave: 2, len: 1.6, cutoff: 520 },
      drums: { kick: hits("x.....x.x......."), snare: hits("....x.......x..."), hat: hits("x.x.x.x.x.x.x.x."), fill: hits("........x.x.xxxx") },
      reverb: 0.2
    },

    // 竞技场：D调混合利底亚，号角式主题、四拍底鼓与观众感的铜管和弦。
    arena: {
      bpm: 138,
      chords: ["D", "C", "G", "D", "Bm", "G", "A", "A"],
      melody: parseLine(`
        D5 - - A4 D5 - F#5 - | E5 - - C5 G4 - - - | B4 - D5 - G5 - F#5 E5 | F#5 - - - - - . . |
        F#5 - - D5 B4 - D5 - | G5 - - F#5 E5 - D5 - | E5 - - - A5 - - - | C#6 - - - A5 - E5 -`),
      melodyVoice: { type: "sawtooth", gain: 0.045, attack: 0.03, release: 0.18, cutoff: 1900, double: 7 },
      melodyOn: pass => pass % 2 === 1,
      stabs: { steps: hits("x.....x.......x."), type: "sawtooth", gain: 0.03, len: 1.5, cutoff: 1600 },
      bass: { steps: [0, 3, 6, 8, 11, 14], type: "square", gain: 0.06, octave: 2, len: 1.5, cutoff: 480 },
      drums: { kick: hits("x...x...x...x..."), snare: hits("....x.......x..."), hat: hits("..x...x...x...x."), fill: hits("..........x.xxxx"), tom: true },
      reverb: 0.25
    },

    // 统领试炼：E弗里吉亚属调，太鼓般的低鼓、持续低音与肃穆的拨弦旋律。
    trial: {
      bpm: 94,
      chords: ["E", "F", "E", "Dm", "Am", "F", "Dm", "E"],
      melody: parseLine(`
        E5 - F5 - G#5 - F5 E5 | F5 - - - C5 - A4 - | B4 - C5 B4 G#4 - E4 - | F4 - A4 - D5 - - - |
        C5 - E5 - A5 - G#5 - | A5 - - F5 C5 - - - | D5 - F5 - E5 D5 C5 - | B4 - - - G#4 - E4 -`),
      melodyVoice: { type: "triangle", gain: 0.085, attack: 0.005, release: 0.5, cutoff: 3200, pluck: true },
      melodyOn: pass => pass % 2 === 1,
      pad: { type: "sine", gain: 0.04, attack: 1.2, cutoff: 1100, detune: 8 },
      arp: { pattern: [0, 2, 1, 2], octave: 4, every: 4, type: "triangle", gain: 0.04, len: 1, pluck: true, when: pass => pass % 2 === 0 },
      drone: { note: midi("E2"), gain: 0.06 },
      drums: { taiko: hits("x.....x...x....."), rim: hits("....x.......x.x."), fill: hits("........x...x.xx") },
      reverb: 0.4
    }
  };

  class ProceduralMusic {
    constructor() {
      this.storageKey = "rift-expedition-music-v1";
      const saved = this.readSettings();
      this.muted = saved.muted === true;
      this.volume = Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.5;
      this.ctx = null;
      this.bus = null;
      this.reverbSend = null;
      this.noiseBuffer = null;
      this.trackName = null;
      this.voice = null;
      this.timer = null;
      this.unlockBound = false;
    }

    get tracks() { return TRACKS; }

    readSettings() {
      try { return JSON.parse(localStorage.getItem(this.storageKey) || "{}"); }
      catch { return {}; }
    }

    saveSettings() {
      try { localStorage.setItem(this.storageKey, JSON.stringify({ muted: this.muted, volume: this.volume })); }
      catch { /* Music preferences are optional. */ }
    }

    ensureContext() {
      if (this.ctx) return this.ctx;
      const ctx = window.CardForge?.SoundFX?.ensureContext?.();
      if (!ctx) return null;
      this.ctx = ctx;
      this.bus = ctx.createGain();
      this.bus.gain.value = this.volume;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 3;
      this.bus.connect(compressor).connect(ctx.destination);

      const seconds = 2.4;
      const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
      for (let channel = 0; channel < 2; channel += 1) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      }
      const reverb = ctx.createConvolver();
      reverb.buffer = impulse;
      this.reverbSend = ctx.createGain();
      this.reverbSend.connect(reverb).connect(this.bus);

      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const noise = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i += 1) noise[i] = Math.random() * 2 - 1;
      return ctx;
    }

    // 浏览器要求用户交互后才能播放音频：首次点击或按键时解锁并开始当前曲目。
    bindUnlock() {
      if (this.unlockBound || typeof document === "undefined") return;
      this.unlockBound = true;
      const unlock = () => {
        if (this.muted || !this.trackName) return;
        const ctx = this.ensureContext();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume().then(() => this.startVoice()).catch(() => {});
        else this.startVoice();
      };
      document.addEventListener("pointerdown", unlock, true);
      document.addEventListener("keydown", unlock, true);
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend?.().catch(() => {});
        else if (!this.muted && this.trackName) this.ctx.resume?.().catch(() => {});
      });
    }

    // 设置当前场景应播放的曲目；同名曲目重复调用不会重新开始。传入 null 则淡出静音。
    setTrack(name) {
      const next = TRACKS[name] ? name : null;
      this.bindUnlock();
      if (next === this.trackName && (this.voice || !next)) return false;
      this.trackName = next;
      this.startVoice();
      return true;
    }

    startVoice() {
      if (this.voice?.name === this.trackName && !this.muted) return;
      this.stopVoice();
      if (this.muted || !this.trackName) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state === "suspended") return;
      const track = TRACKS[this.trackName];
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
      gain.connect(this.bus);
      const send = ctx.createGain();
      send.gain.value = track.reverb || 0;
      gain.connect(send).connect(this.reverbSend);
      this.voice = { name: this.trackName, track, gain, step: 0, nextTime: ctx.currentTime + 0.08 };
      this.timer = setInterval(() => this.schedule(), 25);
      this.schedule();
    }

    stopVoice() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      const voice = this.voice;
      this.voice = null;
      if (!voice || !this.ctx) return;
      const now = this.ctx.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => { try { voice.gain.disconnect(); } catch { /* already detached */ } }, 1200);
    }

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (this.bus) this.bus.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
      this.saveSettings();
    }

    toggleMuted(force) {
      this.muted = typeof force === "boolean" ? force : !this.muted;
      this.saveSettings();
      if (this.muted) this.stopVoice();
      else {
        const ctx = this.ensureContext();
        if (ctx?.state === "suspended") ctx.resume().then(() => this.startVoice()).catch(() => {});
        else this.startVoice();
      }
      return this.muted;
    }

    schedule() {
      const voice = this.voice;
      if (!voice || !this.ctx) return;
      const stepSeconds = 60 / voice.track.bpm / 4;
      while (voice.nextTime < this.ctx.currentTime + 0.15) {
        this.playStep(voice, voice.step, voice.nextTime, stepSeconds);
        voice.step += 1;
        voice.nextTime += stepSeconds;
      }
    }

    playStep(voice, absoluteStep, time, stepSeconds) {
      const track = voice.track;
      const barSteps = 16;
      const loopSteps = track.chords.length * barSteps;
      const pass = Math.floor(absoluteStep / loopSteps);
      const loopStep = absoluteStep % loopSteps;
      const bar = Math.floor(loopStep / barSteps);
      const step = loopStep % barSteps;
      const tones = chord(track.chords[bar]);
      const out = voice.gain;
      const lastBar = bar === track.chords.length - 1;

      if (track.pad && step === 0) {
        tones.forEach(note => this.note(out, { ...track.pad, note: note + 12, time, dur: barSteps * stepSeconds, release: 0.6 }));
      }
      if (track.drone && loopStep === 0) {
        this.note(out, { type: "sawtooth", note: track.drone.note, time, dur: loopSteps * stepSeconds, gain: track.drone.gain, attack: 1.5, release: 1.5, cutoff: 260 });
      }
      if (track.bass && track.bass.steps.includes(step)) {
        const jump = track.bass.octaveJump?.includes(step) ? 12 : 0;
        this.note(out, { ...track.bass, note: tones[0] - 12 * (3 - track.bass.octave) + jump, time, dur: track.bass.len * stepSeconds, attack: 0.008, release: 0.08 });
      }
      if (track.arp && step % track.arp.every === 0 && (!track.arp.when || track.arp.when(pass))) {
        const index = track.arp.pattern[(step / track.arp.every) % track.arp.pattern.length];
        this.note(out, { ...track.arp, note: tones[index] + 12 * (track.arp.octave - 3), time, dur: track.arp.every * track.arp.len * stepSeconds, attack: 0.005, release: 0.18, cutoff: 2400 });
      }
      if (track.stabs && track.stabs.steps.includes(step) && pass % 2 === 0) {
        tones.forEach(note => this.note(out, { ...track.stabs, note: note + 12, time, dur: track.stabs.len * stepSeconds, attack: 0.01, release: 0.12 }));
      }
      if (track.melodyOn(pass)) {
        track.melody.filter(event => event.step === loopStep).forEach(event => {
          const voiceCfg = track.melodyVoice;
          const dur = event.len * stepSeconds;
          this.note(out, { ...voiceCfg, note: event.note, time, dur });
          if (voiceCfg.double) this.note(out, { ...voiceCfg, note: event.note - voiceCfg.double, time, dur, gain: voiceCfg.gain * 0.6 });
        });
      }

      const drums = track.drums;
      if (!drums) return;
      const fill = lastBar && pass % 2 === 1;
      if (fill) {
        if (drums.fill.includes(step)) {
          if (drums.tom || drums.taiko) this.tom(out, time, drums.taiko ? 70 : 150 - step * 4, drums.taiko ? 0.4 : 0.22);
          else this.snare(out, time, 0.11 + step * 0.004);
        }
        if (step === 0) this.kick(out, time, drums.taiko ? 0.5 : 0.32);
        return;
      }
      if (drums.kick?.includes(step)) this.kick(out, time, 0.32);
      if (drums.snare?.includes(step)) this.snare(out, time, 0.12);
      if (drums.hat?.includes(step)) this.hat(out, time, step % 4 === 0 ? 0.035 : 0.022);
      if (drums.taiko?.includes(step)) this.tom(out, time, step === 0 ? 62 : 78, step === 0 ? 0.5 : 0.34);
      if (drums.rim?.includes(step)) this.rim(out, time);
      if (bar % 4 === 3 && step === 14 && drums.hat) this.crashLite(out, time);
    }

    note(out, { note, time, dur, type = "sine", gain = 0.05, attack = 0.02, release = 0.2, cutoff = 2000, detune = 0, vibrato = 0, pluck = false }) {
      const ctx = this.ctx;
      const end = time + dur;
      const env = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, time);
      if (pluck) filter.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.25), time + Math.min(dur, 0.4));
      env.gain.setValueAtTime(0.0001, time);
      if (pluck) {
        env.gain.exponentialRampToValueAtTime(gain, time + attack + 0.002);
        env.gain.exponentialRampToValueAtTime(0.0001, end + release);
      } else {
        env.gain.exponentialRampToValueAtTime(gain, time + Math.min(attack, dur * 0.6) + 0.002);
        env.gain.setValueAtTime(gain, Math.max(time + attack, end - 0.01));
        env.gain.exponentialRampToValueAtTime(0.0001, end + release);
      }
      filter.connect(env).connect(out);
      const voices = detune ? [-detune, detune] : [0];
      voices.forEach(cents => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(hz(note), time);
        osc.detune.setValueAtTime(cents, time);
        if (vibrato) {
          const lfo = ctx.createOscillator();
          const depth = ctx.createGain();
          lfo.frequency.value = vibrato;
          depth.gain.setValueAtTime(0, time);
          depth.gain.linearRampToValueAtTime(hz(note) * 0.006, time + Math.min(0.4, dur));
          lfo.connect(depth).connect(osc.frequency);
          lfo.start(time);
          lfo.stop(end + release + 0.05);
        }
        osc.connect(filter);
        osc.start(time);
        osc.stop(end + release + 0.05);
      });
    }

    kick(out, time, gain) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
      env.gain.setValueAtTime(gain, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
      osc.connect(env).connect(out);
      osc.start(time);
      osc.stop(time + 0.3);
    }

    tom(out, time, frequency, gain) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.frequency.setValueAtTime(frequency * 1.6, time);
      osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.08);
      env.gain.setValueAtTime(gain, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);
      osc.connect(env).connect(out);
      osc.start(time);
      osc.stop(time + 0.6);
      this.noiseHit(out, time, { gain: gain * 0.25, duration: 0.08, frequency: 400, filterType: "lowpass" });
    }

    snare(out, time, gain) {
      this.noiseHit(out, time, { gain, duration: 0.16, frequency: 1800, filterType: "highpass" });
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(140, time + 0.08);
      env.gain.setValueAtTime(gain * 0.6, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      osc.connect(env).connect(out);
      osc.start(time);
      osc.stop(time + 0.12);
    }

    hat(out, time, gain) { this.noiseHit(out, time, { gain, duration: 0.045, frequency: 7500, filterType: "highpass" }); }
    rim(out, time) { this.noiseHit(out, time, { gain: 0.05, duration: 0.05, frequency: 2600, filterType: "bandpass" }); }
    crashLite(out, time) { this.noiseHit(out, time, { gain: 0.03, duration: 0.9, frequency: 5200, filterType: "highpass" }); }

    noiseHit(out, time, { gain, duration, frequency, filterType }) {
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      source.buffer = this.noiseBuffer;
      filter.type = filterType;
      filter.frequency.value = frequency;
      env.gain.setValueAtTime(gain, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      source.connect(filter).connect(env).connect(out);
      source.start(time, Math.random() * 0.5);
      source.stop(time + duration + 0.02);
    }
  }

  window.CardForge = window.CardForge || {};
  window.CardForge.Music = new ProceduralMusic();
})();
