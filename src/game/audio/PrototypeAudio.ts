const VOLUME_BOOST = 5;

export default class PrototypeAudio {
  private context: AudioContext | null = null;
  private ambience: OscillatorNode | null = null;
  private ambienceGain: GainNode | null = null;
  private celloVoices: OscillatorNode[] = [];
  private celloVoiceGains: GainNode[] = [];
  private celloVibratos: OscillatorNode[] = [];
  private celloVibratoDepths: GainNode[] = [];
  private celloFilter: BiquadFilterNode | null = null;
  private celloMaster: GainNode | null = null;
  private celloBreath: OscillatorNode | null = null;
  private celloBreathDepth: GainNode | null = null;
  private flameSource: AudioBufferSourceNode | null = null;
  private flameFilter: BiquadFilterNode | null = null;
  private flameGain: GainNode | null = null;

  async ensureStarted(): Promise<void> {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.startAmbience(this.context);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // Visual interaction remains fully functional when Web Audio is unavailable.
    }
  }

  playLighterClick(): void {
    const context = this.getRunningContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(920, now);
    oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.035);
    gain.gain.setValueAtTime(0.018 * VOLUME_BOOST, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  playIgnition(): void {
    const context = this.getRunningContext();
    if (!context) return;

    const duration = 0.48;
    const sampleCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      const progress = index / sampleCount;
      const roughness = 0.6 + Math.sin(progress * Math.PI * 72) * 0.34;
      channel[index] = (Math.random() * 2 - 1) * roughness * (1 - progress);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(210, context.currentTime + duration);
    filter.Q.value = 3.1;
    gain.gain.setValueAtTime(0.052 * VOLUME_BOOST, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();

    const snap = context.createOscillator();
    const snapGain = context.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(1850, context.currentTime);
    snap.frequency.exponentialRampToValueAtTime(310, context.currentTime + 0.075);
    snapGain.gain.setValueAtTime(0.038 * VOLUME_BOOST, context.currentTime);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);
    snap.connect(snapGain).connect(context.destination);
    snap.start();
    snap.stop(context.currentTime + 0.1);

    const groan = context.createOscillator();
    const groanGain = context.createGain();
    groan.type = 'sawtooth';
    groan.frequency.setValueAtTime(74, context.currentTime);
    groan.frequency.exponentialRampToValueAtTime(31, context.currentTime + 0.64);
    groanGain.gain.setValueAtTime(0.01 * VOLUME_BOOST, context.currentTime);
    groanGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.64);
    groan.connect(groanGain).connect(context.destination);
    groan.start();
    groan.stop(context.currentTime + 0.65);

    const metalRing = context.createOscillator();
    const metalRingGain = context.createGain();
    metalRing.type = 'triangle';
    metalRing.frequency.setValueAtTime(178, context.currentTime);
    metalRing.frequency.exponentialRampToValueAtTime(82, context.currentTime + 0.7);
    metalRingGain.gain.setValueAtTime(0.014 * VOLUME_BOOST, context.currentTime);
    metalRingGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.7);
    metalRing.connect(metalRingGain).connect(context.destination);
    metalRing.start();
    metalRing.stop(context.currentTime + 0.71);
    source.addEventListener('ended', () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    }, { once: true });
    groan.addEventListener('ended', () => {
      groan.disconnect();
      groanGain.disconnect();
    }, { once: true });
    metalRing.addEventListener('ended', () => {
      metalRing.disconnect();
      metalRingGain.disconnect();
    }, { once: true });
    snap.addEventListener('ended', () => {
      snap.disconnect();
      snapGain.disconnect();
    }, { once: true });
  }

  playDoorKnock(accent = 1): void {
    const context = this.getRunningContext();
    if (!context) return;

    const now = context.currentTime;
    const duration = 1.05;
    const weight = Math.min(1.18, Math.max(0.82, accent));
    const sampleCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      const time = index / context.sampleRate;
      const impact = Math.exp(-time * 9.5);
      const grain = Math.sin(index * 0.41) * 0.24 + Math.random() * 2 - 1;
      channel[index] = grain * impact;
    }

    const impact = context.createBufferSource();
    const impactFilter = context.createBiquadFilter();
    const impactGain = context.createGain();
    impact.buffer = buffer;
    impactFilter.type = 'lowpass';
    impactFilter.frequency.setValueAtTime(310, now);
    impactFilter.frequency.exponentialRampToValueAtTime(105, now + duration);
    impactFilter.Q.value = 1.7;
    impactGain.gain.setValueAtTime(0.075 * VOLUME_BOOST * weight, now);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    impact.connect(impactFilter).connect(impactGain).connect(context.destination);
    impact.start(now);

    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(67 * weight, now);
    body.frequency.exponentialRampToValueAtTime(38, now + 0.72);
    bodyGain.gain.setValueAtTime(0.048 * VOLUME_BOOST * weight, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    body.connect(bodyGain).connect(context.destination);
    body.start(now);
    body.stop(now + duration);

    const celloFilter = context.createBiquadFilter();
    const celloGain = context.createGain();
    celloFilter.type = 'lowpass';
    celloFilter.frequency.value = 230;
    celloFilter.Q.value = 2.4;
    celloGain.gain.setValueAtTime(0.0001, now);
    celloGain.gain.exponentialRampToValueAtTime(0.013 * VOLUME_BOOST * weight, now + 0.045);
    celloGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    celloFilter.connect(celloGain).connect(context.destination);

    // B-flat 1 and B1 form a low minor second: close enough to feel like the
    // wood and cello are beating against each other instead of playing a chord.
    const celloVoices = [58.27, 61.74].map((frequency, index) => {
      const voice = context.createOscillator();
      voice.type = index === 0 ? 'sawtooth' : 'triangle';
      voice.frequency.value = frequency;
      voice.detune.value = index === 0 ? -5 : 4;
      voice.connect(celloFilter);
      voice.start(now);
      voice.stop(now + duration);
      return voice;
    });

    impact.addEventListener('ended', () => {
      impact.disconnect();
      impactFilter.disconnect();
      impactGain.disconnect();
    }, { once: true });
    body.addEventListener('ended', () => {
      body.disconnect();
      bodyGain.disconnect();
    }, { once: true });
    celloVoices[1].addEventListener('ended', () => {
      celloVoices.forEach((voice) => voice.disconnect());
      celloFilter.disconnect();
      celloGain.disconnect();
    }, { once: true });
  }

  playWrongRhythm(): void {
    const context = this.getRunningContext();
    if (!context) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(96, now);
    oscillator.frequency.exponentialRampToValueAtTime(31, now + 0.55);
    gain.gain.setValueAtTime(0.017 * VOLUME_BOOST, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.6);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  }

  playDoorOpening(): void {
    const context = this.getRunningContext();
    if (!context) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(47, now);
    oscillator.frequency.linearRampToValueAtTime(29, now + 2.8);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 2.8);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025 * VOLUME_BOOST, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 2.85);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    }, { once: true });
  }

  startFlameCrackle(): void {
    const context = this.getRunningContext();
    if (!context || this.flameSource) return;

    const duration = 4;
    const sampleCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.012;
    }

    const crackleCount = 34;
    for (let crackle = 0; crackle < crackleCount; crackle += 1) {
      const start = Math.floor(Math.random() * (sampleCount - 900));
      const length = 90 + Math.floor(Math.random() * 520);
      const strength = 0.24 + Math.random() * 0.52;
      for (let offset = 0; offset < length; offset += 1) {
        const envelope = Math.exp(-offset / (length * 0.16));
        channel[start + offset] += (Math.random() * 2 - 1) * strength * envelope;
      }
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 1380;
    filter.Q.value = 1.05;
    gain.gain.value = 0.028 * VOLUME_BOOST;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();

    this.flameSource = source;
    this.flameFilter = filter;
    this.flameGain = gain;
  }

  destroy(): void {
    try {
      this.ambience?.stop();
      this.ambience?.disconnect();
      this.ambienceGain?.disconnect();
      for (const voice of this.celloVoices) voice.stop();
      for (const voice of this.celloVoices) voice.disconnect();
      for (const gain of this.celloVoiceGains) gain.disconnect();
      for (const vibrato of this.celloVibratos) vibrato.stop();
      for (const vibrato of this.celloVibratos) vibrato.disconnect();
      for (const depth of this.celloVibratoDepths) depth.disconnect();
      this.celloBreath?.stop();
      this.celloBreath?.disconnect();
      this.celloBreathDepth?.disconnect();
      this.celloFilter?.disconnect();
      this.celloMaster?.disconnect();
      this.flameSource?.stop();
      this.flameSource?.disconnect();
      this.flameFilter?.disconnect();
      this.flameGain?.disconnect();
      void this.context?.close().catch(() => undefined);
    } catch {
      // Audio shutdown should never prevent scene cleanup.
    }
    this.ambience = null;
    this.ambienceGain = null;
    this.celloVoices = [];
    this.celloVoiceGains = [];
    this.celloVibratos = [];
    this.celloVibratoDepths = [];
    this.celloFilter = null;
    this.celloMaster = null;
    this.celloBreath = null;
    this.celloBreathDepth = null;
    this.flameSource = null;
    this.flameFilter = null;
    this.flameGain = null;
    this.context = null;
  }

  private startAmbience(context: AudioContext): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 47;
    gain.gain.value = 0.0012 * VOLUME_BOOST;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    this.ambience = oscillator;
    this.ambienceGain = gain;
    this.startCelloDrone(context);
  }

  private startCelloDrone(context: AudioContext): void {
    const now = context.currentTime;
    const filter = context.createBiquadFilter();
    const master = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 540;
    filter.Q.value = 1.35;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.013 * VOLUME_BOOST, now + 4.5);
    filter.connect(master).connect(context.destination);

    const real = new Float32Array([0, 0, 0, 0, 0, 0, 0]);
    const imaginary = new Float32Array([0, 1, 0.58, 0.34, 0.2, 0.12, 0.07]);
    const bowedWave = context.createPeriodicWave(real, imaginary, {
      disableNormalization: false
    });
    const frequencies = [73.42, 87.31, 110]; // D2, F2, A2: a low D-minor chord.
    const levels = [0.54, 0.31, 0.22];
    const detunes = [-4, 2, -2];

    frequencies.forEach((frequency, index) => {
      const voice = context.createOscillator();
      const voiceGain = context.createGain();
      const vibrato = context.createOscillator();
      const vibratoDepth = context.createGain();

      voice.setPeriodicWave(bowedWave);
      voice.frequency.value = frequency;
      voice.detune.value = detunes[index];
      voiceGain.gain.value = levels[index];
      vibrato.type = 'sine';
      vibrato.frequency.value = 4.35 + index * 0.18;
      vibratoDepth.gain.value = 3.2 + index * 0.55;

      vibrato.connect(vibratoDepth).connect(voice.detune);
      voice.connect(voiceGain).connect(filter);
      voice.start();
      vibrato.start();
      this.celloVoices.push(voice);
      this.celloVoiceGains.push(voiceGain);
      this.celloVibratos.push(vibrato);
      this.celloVibratoDepths.push(vibratoDepth);
    });

    const breath = context.createOscillator();
    const breathDepth = context.createGain();
    breath.type = 'sine';
    breath.frequency.value = 0.045;
    breathDepth.gain.value = 0.009;
    breath.connect(breathDepth).connect(master.gain);
    breath.start();

    this.celloFilter = filter;
    this.celloMaster = master;
    this.celloBreath = breath;
    this.celloBreathDepth = breathDepth;
  }

  private getRunningContext(): AudioContext | null {
    return this.context?.state === 'running' ? this.context : null;
  }
}
