/**
 * Toast Component
 * Animated toast notifications with slide-in and progress bar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { prefersReducedMotion } from '../utils/animations';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  /**
   * Unique identifier
   */
  id: string | number;
  /**
   * Toast type
   */
  type?: ToastType;
  /**
   * Toast title
   */
  title?: string;
  /**
   * Toast message
   */
  message: string;
  /**
   * Duration in milliseconds (0 = infinite)
   */
  duration?: number;
  /**
   * Whether to show progress bar
   */
  showProgress?: boolean;
  /**
   * Callback when toast is dismissed
   */
  onDismiss?: (id: string | number) => void;
  /**
   * Position
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-success-50 dark:bg-success-900/20',
    borderColor: 'border-success-500',
    iconColor: 'text-success-500',
    titleColor: 'text-success-700 dark:text-success-300',
    messageColor: 'text-success-600 dark:text-success-400',
    progressColor: 'bg-success-500',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-error-50 dark:bg-error-900/20',
    borderColor: 'border-error-500',
    iconColor: 'text-error-500',
    titleColor: 'text-error-700 dark:text-error-300',
    messageColor: 'text-error-600 dark:text-error-400',
    progressColor: 'bg-error-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-warning-50 dark:bg-warning-900/20',
    borderColor: 'border-warning-500',
    iconColor: 'text-warning-500',
    titleColor: 'text-warning-700 dark:text-warning-300',
    messageColor: 'text-warning-600 dark:text-warning-400',
    progressColor: 'bg-warning-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-info-50 dark:bg-info-900/20',
    borderColor: 'border-info-500',
    iconColor: 'text-info-500',
    titleColor: 'text-info-700 dark:text-info-300',
    messageColor: 'text-info-600 dark:text-info-400',
    progressColor: 'bg-info-500',
  },
};

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

/**
 * Individual Toast component
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  showProgress = true,
  onDismiss,
  position = 'top-right',
}) => {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reducedMotion = mounted ? prefersReducedMotion() : false;
  const config = toastConfig[type];
  const Icon = config.icon;

  // Progress bar animation
  useEffect(() => {
    if (duration === 0 || reducedMotion || !showProgress) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, reducedMotion, showProgress]);

  // Auto dismiss
  useEffect(() => {
    if (duration === 0 || reducedMotion) return;

    const timer = setTimeout(() => {
      onDismiss?.(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onDismiss, reducedMotion]);

  const handleDismiss = useCallback(() => {
    onDismiss?.(id);
  }, [id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ 
        type: 'spring',
        stiffness: 400,
        damping: 30 
      }}
      className={clsx(
        'relative w-80 max-w-[calc(100vw-2rem)] rounded-lg border-l-4',
        'shadow-lg overflow-hidden',
        config.bgColor,
        config.borderColor,
        positionClasses[position]
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Progress Bar */}
      {showProgress && duration > 0 && !reducedMotion && (
        <motion.div
          className={clsx('absolute bottom-0 left-0 h-1', config.progressColor)}
          style={{ width: `${progress}%` }}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <p className={clsx('font-medium', config.titleColor)}>
                {title}
              </p>
            )}
            <p className={clsx(config.messageColor, title && 'mt-1')}>
              {message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className={clsx(
              'flex-shrink-0 p-1 rounded-md transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/10',
              config.iconColor
            )}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Toast Container for managing multiple toasts
 */
export interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string | number) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reducedMotion = mounted ? prefersReducedMotion() : false;

  return (
    <div
      className={clsx(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positionClasses[position]
      )}
      aria-label="Notifications"
    >
      <AnimatePresence mode={reducedMotion ? 'popLayout' : 'popLayout'}>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onDismiss={onDismiss} position={position} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
