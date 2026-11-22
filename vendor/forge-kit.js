export function createStore(name) {
  const key = "forge-save:" + name;
  return {
    load() {
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch (err) {
        return null;
      }
    },
    save(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        /* sandboxed preview has no storage */
      }
    },
  };
}

export const SFX_PRESETS = [
  { id: "jump", label: "Jump", freq: 520, dur: 0.08, type: "square" },
  { id: "coin", label: "Coin", freq: 880, dur: 0.1, type: "triangle" },
  { id: "pause", label: "Pause", freq: 220, dur: 0.12, type: "sine" },
  { id: "win", label: "Win", freq: 660, dur: 0.18, type: "triangle" },
];

export function createSfx() {
  let ctx = null;
  function context() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type) {
    try {
      const audio = context();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + dur);
    } catch (err) {
      /* audio starts after a gesture */
    }
  }
  return {
    play(id) {
      const preset = SFX_PRESETS.find((item) => item.id === id) || SFX_PRESETS[0];
      tone(preset.freq, preset.dur, preset.type);
    },
    jump() { this.play("jump"); },
    coin() { this.play("coin"); },
    pause() { this.play("pause"); },
    win() { this.play("win"); },
  };
}

export function createParticles() {
  const list = [];
  return {
    burst(x, y, color) {
      for (let i = 0; i < 8; i++) {
        list.push({ x, y, vx: Math.cos(i) * 40, vy: Math.sin(i) * 40 - 20, life: 0.4, color });
      }
    },
    step(dt) {
      for (const particle of list) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
    },
    draw(ctx) {
      for (const particle of list) {
        ctx.globalAlpha = Math.max(0, particle.life * 2);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 3, 3);
      }
      ctx.globalAlpha = 1;
    },
  };
}
