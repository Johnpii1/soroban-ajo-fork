/**
 * Input Component
 * Enhanced input with focus, error, and success animations
 */

import React, { forwardRef, InputHTMLAttributes, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { prefersReducedMotion } from '../utils/animations';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Label for the input
   */
  label?: string;
  /**
   * Error message
   */
  error?: string;
  /**
   * Success message
   */
  success?: boolean;
  /**
   * Helper text
   */
  helperText?: string;
  /**
   * Left icon
   */
  leftIcon?: React.ReactNode;
  /**
   * Right icon
   */
  rightIcon?: React.ReactNode;
  /**
   * Whether to show character count
   */
  showCharCount?: boolean;
  /**
   * Input size
   */
  inputSize?: 'sm' | 'md' | 'lg';
}

/**
 * Input component with animations
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      showCharCount,
      inputSize = 'md',
      className,
      disabled,
      maxLength,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [mounted, setMounted] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value as string || '');
    const size = inputSize;

    useEffect(() => {
      setMounted(true);
    }, []);

    const reducedMotion = mounted ? prefersReducedMotion() : false;

    // Sync with external value
    useEffect(() => {
      setLocalValue(value as string || '');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      onChange?.(e);
    };

    const hasError = !!error;
    const isSuccess = success && !hasError;

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const getBorderColor = () => {
      if (hasError) return 'border-error-500 focus:ring-error-500';
      if (isSuccess) return 'border-success-500 focus:ring-success-500';
      if (isFocused) return 'border-primary-500 focus:ring-primary-500';
      return 'border-gray-300 dark:border-gray-600 focus:ring-primary-500';
    };

    const getShadowColor = () => {
      if (hasError) return 'shadow-error-glow';
      if (isSuccess) return 'shadow-success-glow';
      if (isFocused) return 'shadow-glow-sm';
      return '';
    };

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            className={clsx(
              'block text-sm font-medium mb-1',
              'text-gray-700 dark:text-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div
              className={clsx(
                'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
                iconSizes[size]
              )}
            >
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <div className={clsx(
            'w-full rounded-lg border bg-white dark:bg-gray-800',
            'transition-all duration-200',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0',
            // Sizing
            sizeStyles[size],
            // Border and ring
            getBorderColor(),
            // Shadow on focus
            isFocused && getShadowColor(),
            // Disabled
            disabled && 'opacity-50 cursor-not-allowed bg-gray-100'
          )}>
            <input
              ref={ref}
              type={props.type || 'text'}
              value={localValue}
              onChange={handleChange}
              disabled={disabled}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              maxLength={maxLength}
              className={clsx(
                'w-full bg-transparent outline-none',
                'disabled:cursor-not-allowed',
                // Left/Right icon padding
                leftIcon && 'pl-0',
                rightIcon && 'pr-0',
                className
              )}
              aria-invalid={hasError}
              aria-describedby={error ? `${props.id}-error` : undefined}
              {...props}
            />
          </div>

          {/* Right Icon */}
          {rightIcon && (
            <div
              className={clsx(
                'absolute right-3 top-1/2 -translate-y-1/2',
                iconSizes[size],
                hasError && 'text-error-500',
                isSuccess && 'text-success-500'
              )}
            >
              {rightIcon}
            </div>
          )}

          {/* Error Shake Animation */}
          <AnimatePresence>
            {hasError && !reducedMotion && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none rounded-lg"
              >
                <motion.div
                  className="w-full h-full border-2 border-error-500 rounded-lg"
                  initial={{ x: 0 }}
                  animate={{ x: [0, -4, 4, -4, 4, 0] }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Character Count */}
        <AnimatePresence>
          {showCharCount && maxLength && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={clsx(
                'mt-1 text-sm text-right',
                localValue.length >= maxLength
                  ? 'text-error-500'
                  : 'text-gray-500'
              )}
            >
              {localValue.length}/{maxLength}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Helper Text / Error Message */}
        <AnimatePresence mode="wait">
          {(error || helperText) && (
            <motion.div
              key={error || helperText}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className={clsx(
                'mt-1 text-sm',
                hasError
                  ? 'text-error-600 dark:text-error-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
              id={error ? `${props.id}-error` : undefined}
              role={hasError ? 'alert' : undefined}
            >
              {error || helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
