import { describe, it, expect, vi } from 'vitest';
import { playSaleSound } from '../../app/lib/sound';

describe('playSaleSound', () => {
    it('does not throw when AudioContext is unavailable', () => {
        expect(() => playSaleSound()).not.toThrow();
    });

    it('does not throw when AudioContext throws', () => {
        vi.stubGlobal('AudioContext', class { constructor() { throw new Error('blocked'); } });
        expect(() => playSaleSound()).not.toThrow();
        vi.unstubAllGlobals();
    });

    it('does not throw regardless of AudioContext availability', () => {
        // jsdom may or may not have AudioContext — either way must not throw
        expect(() => playSaleSound()).not.toThrow();
    });
});
