"use client";

/** Plays a short pleasant chime using the Web Audio API — no audio file needed. */
export function playSaleSound() {
    if (typeof window === "undefined") return;
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.value = freq;

            const start = ctx.currentTime + i * 0.12;
            const end = start + 0.25;

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, end);

            osc.start(start);
            osc.stop(end);
        });
    } catch {
        // AudioContext blocked or unsupported — silently ignore
    }
}
