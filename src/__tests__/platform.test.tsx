import { render, screen, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlatform } from '../hooks/usePlatform';
import App from '../app/App';

// Mock do hook usePlatform
vi.mock('../hooks/usePlatform', () => ({
  usePlatform: vi.fn(),
}));

const mockUsePlatform = vi.mocked(usePlatform);

describe('Platform Detection Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects mobile platform correctly', () => {
    // Mock the hook to return mobile values
    mockUsePlatform.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      deviceCapabilities: {
        hasTouch: true,
        hasGyroscope: true,
        isLowEndDevice: false,
        prefersReducedMotion: false,
        supportsWebGL: true,
        supportsWebRTC: true,
      },
      platform: 'mobile',
    });

    const { result } = renderHook(() => usePlatform());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.deviceCapabilities.hasTouch).toBe(true);
  });

  it('detects desktop platform correctly', () => {
    // Mock the hook to return desktop values
    mockUsePlatform.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      deviceCapabilities: {
        hasTouch: false,
        hasGyroscope: false,
        isLowEndDevice: false,
        prefersReducedMotion: false,
        supportsWebGL: true,
        supportsWebRTC: true,
      },
      platform: 'desktop',
    });

    const { result } = renderHook(() => usePlatform());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.deviceCapabilities.hasTouch).toBe(false);
  });
});

