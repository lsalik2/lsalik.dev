import { describe, it, expect } from 'vitest';
import { fullscreenMode, isIosPhone } from '../../src/lib/fullscreen-mode';

describe('fullscreenMode', () => {
  it('uses the Fullscreen API wherever it exists (desktop, Android, iPad)', () => {
    expect(fullscreenMode({ fullscreenApi: true, standalone: false, iosPhone: false })).toBe('fullscreen');
    expect(fullscreenMode({ fullscreenApi: true, standalone: false, iosPhone: true })).toBe('fullscreen');
  });

  it('offers the home-screen hint on an iPhone without the API', () => {
    expect(fullscreenMode({ fullscreenApi: false, standalone: false, iosPhone: true })).toBe('install-hint');
  });

  it('shows nothing once launched from the home screen (already chrome-less)', () => {
    expect(fullscreenMode({ fullscreenApi: false, standalone: true, iosPhone: true })).toBe('none');
  });

  it('shows nothing on other browsers without the API', () => {
    expect(fullscreenMode({ fullscreenApi: false, standalone: false, iosPhone: false })).toBe('none');
  });
});

describe('isIosPhone', () => {
  it('recognises iPhone and iPod user agents', () => {
    expect(isIosPhone('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15')).toBe(true);
    expect(isIosPhone('Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X)')).toBe(true);
  });

  it('does not match iPad, Android, or desktop', () => {
    expect(isIosPhone('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')).toBe(false);
    expect(isIosPhone('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe(false);
    expect(isIosPhone('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
  });
});
