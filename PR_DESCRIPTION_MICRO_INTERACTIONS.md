# Micro-interactions and Animations - Issue #319

## Overview
This PR implements micro-interactions and animations across the frontend using Tailwind CSS and Framer Motion to enhance UI/UX with smooth, purposeful animations while maintaining 60fps performance and accessibility.

## Changes Made

### 1. Tailwind Configuration (tailwind.config.js)
Added custom animations and keyframes:
- `ripple` - Click ripple effect
- `shake` - Error shake animation
- `lift` - Hover lift effect
- `slide-in-up` - Slide in from top
- `bounce-in` - Bounce entrance animation

Added shadow utilities:
- `error-glow` - Error state glow
- `success-glow` - Success state glow

### 2. Animation Utilities (src/utils/animations.ts)
Created comprehensive animation utilities including:
- `prefersReducedMotion()` - Check for reduced motion preference
- Common transition and spring configurations
- Reusable Framer Motion variants (fadeIn, fadeInUp, scaleIn, etc.)
- Animation class names for Tailwind
- Accessibility helpers

### 3. Ripple Effect (src/hooks/useRipple.ts + src/components/animations/Ripple.tsx)
- Hook for managing ripple state
- Ripple component with Framer Motion animations
- Supports custom colors and duration

### 4. Button Component (src/components/Button.tsx)
Enhanced button with:
- Hover scale (1.02x) and tap scale (0.95x) animations
- Ripple effect on click
- Loading spinner with fade animation
- Disabled state handling
- Reduced motion support
- Multiple variants (primary, secondary, outline, ghost, danger)
- Multiple sizes (sm, md, lg)

### 5. Input Component (src/components/Input.tsx)
Enhanced input with:
- Focus ring and shadow animations
- Error shake animation
- Success state glow
- Character count display
- Left/right icon support
- Helper text and error messages with animations
- Reduced motion support

### 6. Card Component (src/components/Card.tsx)
Enhanced card with:
- Hover lift animation (4px up)
- Shadow transition on hover
- Fade-in animation on mount
- Multiple variants (default, outline, elevated, glass)
- Multiple padding sizes
- Card header, body, and footer sub-components

### 7. Toast Component (src/components/Toast.tsx)
Animated notifications with:
- Slide-in from right
- Progress bar animation
- Auto-dismiss with configurable duration
- Multiple types (success, error, warning, info)
- Spring-based animations
- Toast container for managing multiple toasts

### 8. Page Transitions (src/components/PageTransition.tsx)
- Page wrapper with route change animations
- FadeIn component for mount animations
- StaggeredList for list animations
- StaggeredItem for list item animations

## Performance Considerations
- Only animating `transform` and `opacity` properties
- Using `will-change` where appropriate
- Framer Motion handles animation optimization
- No layout-triggering properties animated
- Respects `prefers-reduced-motion` accessibility setting

## Accessibility
- All animations respect `prefers-reduced-motion` media query
- Focus states remain intact on interactive elements
- Proper ARIA attributes on toast notifications
- Keyboard navigation support for clickable cards

## Dependencies Added
- `framer-motion` - Animation library

## Testing Checklist
- [x] Hover and click interactions work correctly
- [x] Touch devices (mobile) work correctly
- [x] Page transitions animate smoothly
- [x] prefers-reduced-motion behavior works
- [x] No animation jank or layout shifts
- [x] Works on both desktop and mobile

## Related Issues
- Closes #319

## Notes
- Animations are kept subtle and purposeful
- Focus on enhancing UX rather than over-animating
- Consistent animation timing across components (150ms for micro, 300ms for larger)
