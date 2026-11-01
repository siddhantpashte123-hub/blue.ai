import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/helpers';

interface MonochromeOrbProps {
  size?: 'sm' | 'md' | 'lg';
  state?: 'idle' | 'streaming' | 'listening';
  className?: string;
}

export const MonochromeOrb: React.FC<MonochromeOrbProps> = ({
  size = 'lg',
  state = 'idle',
  className,
}) => {
  const dimensions = {
    sm: 'w-7 h-7',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  }[size];

  const isActive = state === 'streaming' || state === 'listening';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center select-none',
        dimensions,
        className
      )}
    >
      {/* Outer Breathing Halo */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.18, 1] : [1, 1.06, 1],
          opacity: isActive ? [0.18, 0.42, 0.18] : [0.08, 0.18, 0.08],
        }}
        transition={{
          duration: isActive ? 1.4 : 3.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 rounded-full border border-black dark:border-white"
      />

      {/* Precision Dashed Orbit Ring */}
      <motion.svg
        viewBox="0 0 100 100"
        animate={{ rotate: 360 }}
        transition={{
          duration: isActive ? 4.5 : 22,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute inset-0.5 w-[calc(100%-4px)] h-[calc(100%-4px)] text-black dark:text-white"
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth={size === 'sm' ? '3.5' : '2'}
          strokeDasharray="10 8 3 8"
          strokeLinecap="round"
          opacity="0.72"
        />
      </motion.svg>

      {/* Counter-rotating Inner Geometric Ring */}
      {size !== 'sm' && (
        <motion.svg
          viewBox="0 0 100 100"
          animate={{ rotate: -360 }}
          transition={{
            duration: isActive ? 3.2 : 16,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] text-black dark:text-white"
        >
          <circle
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeDasharray="24 14"
            strokeLinecap="round"
            opacity="0.4"
          />
        </motion.svg>
      )}

      {/* Solid Contrast Core Sphere */}
      <motion.div
        animate={{
          scale:
            state === 'listening'
              ? [0.92, 1.15, 0.92]
              : state === 'streaming'
              ? [0.95, 1.08, 0.95]
              : [1, 1.03, 1],
        }}
        transition={{
          duration: state === 'listening' ? 0.8 : state === 'streaming' ? 1.1 : 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn(
          'relative rounded-full bg-black dark:bg-white flex items-center justify-center shadow-sm',
          size === 'sm'
            ? 'w-3.5 h-3.5'
            : size === 'md'
            ? 'w-5 h-5'
            : 'w-8 h-8'
        )}
      >
        {/* Inverted Pupil */}
        <motion.div
          animate={{
            scale: isActive ? [0.6, 1.15, 0.6] : 1,
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn(
            'rounded-full bg-white dark:bg-black',
            size === 'sm'
              ? 'w-1 h-1'
              : size === 'md'
              ? 'w-1.5 h-1.5'
              : 'w-2.5 h-2.5'
          )}
        />
      </motion.div>
    </div>
  );
};
