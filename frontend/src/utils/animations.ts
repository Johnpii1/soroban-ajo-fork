/**
 * Animation Utilities
 * Common animation configurations and helpers
 */

import { Variants } from 'framer-motion';

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Common transition configurations
 */
export const transitions = {
  fast: { duration: 0.15 },
  base: { duration: 0.2 },
  moderate: { duration: 0.3 },
  slow: { duration: 0.5 },
};

/**
 * Common spring configurations
 */
export const springs = {
  gentle: { type: 'spring', stiffness: 300, damping: 30 },
  bouncy: { type: 'spring', stiffness: 400, damping: 25 },
  soft: { type: 'spring', stiffness: 200, damping: 25 },
};

/**
 * Fade in variants
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

/**
 * Fade in from bottom variants
 */
export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  },
};

/**
 * Scale in variants
 */
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 }
  },
};

/**
 * Slide in from right variants (for toasts)
 */
export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    x: 100,
    transition: { duration: 0.2 }
  },
};

/**
 * Page transition variants
 */
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  },
};

/**
 * Stagger container variants for lists
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * List item variants
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2 }
  },
};

/**
 * Hover scale variants for buttons/cards
 */
export const hoverScaleVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.15 } },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

/**
 * Loading pulse variants
 */
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Spinner rotation variants
 */
export const spinVariants: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Shake variants for error states
 */
export const shakeVariants: Variants = {
  shake: {
    x: [-4, 4, -4, 4, 0],
    transition: { duration: 0.3 },
  },
};

/**
 * Bounce in variants for success states
 */
export const bounceInVariants: Variants = {
  hidden: { scale: 0.3, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 25,
    }
  },
};

/**
 * Get animation props based on reduced motion preference
 */
export const getAnimationProps = (
  reducedMotion: boolean,
  variants?: Variants
): object => {
  if (reducedMotion) {
    return { 
      initial: 'hidden', 
      animate: 'visible', 
      exit: 'exit',
      transition: { duration: 0 }
    };
  }
  
  return variants 
    ? { variants }
    : { initial: 'hidden', animate: 'visible', exit: 'exit' };
};

/**
 * Class names for Tailwind animation utilities
 */
export const animationClasses = {
  ripple: 'animate-ripple',
  shake: 'animate-shake',
  lift: 'animate-lift',
  slideInUp: 'animate-slide-in-up',
  bounceIn: 'animate-bounce-in',
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  fadeInUp: 'animate-fade-in-up',
  slideIn: 'animate-slide-in',
  slideOut: 'animate-slide-out',
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
};

/**
 * Transition utility classes
 */
export const transitionClasses = {
  fast: 'transition-all duration-150',
  base: 'transition-all duration-200',
  moderate: 'transition-all duration-300',
  slow: 'transition-all duration-500',
};

/**
 * Hover utility classes
 */
export const hoverClasses = {
  lift: 'hover:-translate-y-1 hover:shadow-lg',
  scale: 'hover:scale-105',
  glow: 'hover:shadow-glow-md',
};
