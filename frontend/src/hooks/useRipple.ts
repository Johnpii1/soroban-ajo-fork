/**
 * useRipple Hook
 * Creates a ripple effect on click
 */

import { useState, useCallback, useRef, MouseEvent } from 'react';

export interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface UseRippleOptions {
  /**
   * Duration of the ripple animation in milliseconds
   */
  duration?: number;
  /**
   * Whether the ripple is disabled
   */
  disabled?: boolean;
}

/**
 * Hook to create ripple effects on clickable elements
 */
export const useRipple = (options: UseRippleOptions = {}) => {
  const { duration = 600, disabled = false } = options;
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleCount = useRef(0);

  const createRipple = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      
      // Calculate the center of the ripple
      // Use the click position relative to the button
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Create new ripple
      const newRipple: Ripple = {
        id: rippleCount.current++,
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, duration);
    },
    [disabled, duration]
  );

  const clearRipples = useCallback(() => {
    setRipples([]);
  }, []);

  return {
    ripples,
    createRipple,
    clearRipples,
    isRippling: ripples.length > 0,
  };
};

export default useRipple;
