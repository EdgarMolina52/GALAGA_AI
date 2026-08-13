class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true; // Global toggle
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playOscillator({ type = 'square', freq = 440, freqEnd = null, duration = 0.1, vol = 0.1, attack = 0.01, release = 0.05 }) {
        if (!this.ctx || !this.enabled) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playShoot() {
        this.playOscillator({
            type: 'square',
            freq: 880,
            freqEnd: 220,
            duration: 0.1,
            vol: 0.05
        });
    }

    playEnemyShoot() {
        this.playOscillator({
            type: 'sawtooth',
            freq: 220,
            freqEnd: 110,
            duration: 0.2,
            vol: 0.05
        });
    }

    playLaser() {
        this.playOscillator({
            type: 'sawtooth',
            freq: 440,
            freqEnd: 880,
            duration: 0.1,
            vol: 0.05
        });
    }

    playExplosion() {
        if (!this.ctx || !this.enabled) return;
        // White noise generation
        const duration = 0.3;
        const bufferSize = this.ctx.sampleRate * duration; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Use a filter to make it sound like an explosion
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start();
    }

    playPowerUpPickup() {
        if (!this.ctx || !this.enabled) return;
        const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
        const duration = 0.1;
        
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator({
                    type: 'sine',
                    freq: freq,
                    duration: duration,
                    vol: 0.1
                });
            }, i * duration * 1000);
        });
    }

    playPowerUpUse() {
        this.playOscillator({
            type: 'triangle',
            freq: 600,
            freqEnd: 1200,
            duration: 0.3,
            vol: 0.1
        });
    }

    playBossWarning() {
        if (!this.ctx || !this.enabled) return;
        // Repetitive siren
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.playOscillator({
                    type: 'square',
                    freq: 200,
                    freqEnd: 150,
                    duration: 0.4,
                    vol: 0.1
                });
            }, i * 500);
        }
    }

    playLevelComplete() {
        if (!this.ctx || !this.enabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C major chord arpeggio
        const duration = 0.15;
        
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator({
                    type: 'square',
                    freq: freq,
                    duration: i === notes.length - 1 ? 0.6 : duration,
                    vol: 0.08
                });
            }, i * duration * 1000);
        });
    }

    playGameOver() {
        if (!this.ctx || !this.enabled) return;
        const notes = [440, 415.30, 392.00, 349.23]; // descending notes
        const duration = 0.3;
        
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator({
                    type: 'sawtooth',
                    freq: freq,
                    duration: i === notes.length - 1 ? 1.0 : duration,
                    vol: 0.1
                });
            }, i * duration * 1000);
        });
    }
}

export const audioManager = new AudioManager();
