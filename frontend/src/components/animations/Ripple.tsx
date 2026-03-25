/**
 * Ripple Component
 * Visual ripple effect for buttons and clickable elements
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Ripple as RippleType } from '../../hooks/useRipple';

export interface RippleProps {
  /**
   * Array of ripple objects containing position and id
   */
  ripples: RippleType[];
  /**
   * Color of the ripple (default: white with opacity)
   */
  color?: string;
  /**
   * Class name for the container
   */
  className?: string;
}

/**
 * Individual ripple element
 */
const RippleElement: React.FC<{
  ripple: RippleType;
  color?: string;
}> = memo(({ ripple, color = 'rgba(255, 255, 255, 0.5)' }) => {
  return (
    <motion.span
      key={ripple.id}
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 4, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="absolute rounded-full pointer-events-none"
      style={{
        left: ripple.x,
        top: ripple.y,
        width: '100%',
        height: '100%',
        transformOrigin: 'center',
        backgroundColor: color,
      }}
      aria-hidden="true"
    />
  );
});

RippleElement.displayName = 'RippleElement';

/**
 * Ripple container component
 */
export const Ripple: React.FC<RippleProps> = ({
  ripples,
  color,
  className,
}) => {
  if (ripples.length === 0) return null;

  return (
    <span
      className={clsx(
        'absolute inset-0 overflow-hidden rounded-inherit pointer-events-none',
        className
      )}
      aria-hidden="true"
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <RippleElement
            key={ripple.id}
            ripple={ripple}
            color={color}
          />
        ))}
      </AnimatePresence>
    </span>
  );
};

export default Ripple;
