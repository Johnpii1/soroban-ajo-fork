/**
 * Card Component
 * Enhanced card with hover lift and shadow animations
 */

import React, { HTMLAttributes, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { prefersReducedMotion } from '../utils/animations';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card variant
   */
  variant?: 'default' | 'outline' | 'elevated' | 'glass';
  /**
   * Whether to show hover lift effect
   */
  hoverable?: boolean;
  /**
   * Whether to show fade-in animation on mount
   */
  animateIn?: boolean;
  /**
   * Delay for fade-in animation (ms)
   */
  animationDelay?: number;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  outline: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-900/50',
  glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50',
};

const paddingStyles = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * Card component with hover animations
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hoverable = false,
  animateIn = false,
  animationDelay = 0,
  onClick,
  padding = 'md',
  className,
  children,
  ...props
}) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(!animateIn);

  useEffect(() => {
    setMounted(true);
    if (animateIn) {
      const timer = setTimeout(() => setIsVisible(true), animationDelay);
      return () => clearTimeout(timer);
    }
  }, [animateIn, animationDelay]);

  const reducedMotion = mounted ? prefersReducedMotion() : false;

  const isClickable = !!onClick || hoverable;

  const cardContent = (
    <div
      className={clsx(
        // Base styles
        'rounded-xl',
        // Variant
        variantStyles[variant],
        // Padding
        paddingStyles[padding],
        // Cursor
        isClickable && 'cursor-pointer',
        // Transitions
        !reducedMotion && 'transition-all duration-300',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );

  // If hoverable, wrap with motion.div for hover effects
  if (hoverable && !reducedMotion) {
    return (
      <motion.div
        initial={animateIn ? { opacity: 0, y: 10 } : undefined}
        animate={isVisible ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4 }}
        className="w-full"
      >
        <motion.div
          className="w-full"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          {cardContent}
        </motion.div>
      </motion.div>
    );
  }

  // If just animate in, use motion.div
  if (animateIn && !reducedMotion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isVisible ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
};

/**
 * Card Header Component
 */
export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={clsx('pb-3 border-b border-gray-200 dark:border-gray-700 mb-3', className)}
    {...props}
  >
    {children}
  </div>
);

/**
 * Card Body Component
 */
export const CardBody: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={clsx('', className)} {...props}>
    {children}
  </div>
);

/**
 * Card Footer Component
 */
export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={clsx('pt-3 border-t border-gray-200 dark:border-gray-700 mt-3', className)}
    {...props}
  >
    {children}
  </div>
);

export default Card;
