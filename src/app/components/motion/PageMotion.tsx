import { motion, type MotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

type PageSignalFrameProps = {
  children: ReactNode;
  className?: string;
};

type StaggerGroupProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

type SignalPanelProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function PageSignalFrame({ children, className }: PageSignalFrameProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.065, delayChildren: 0.03 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({ children, className, delay = 0 }: StaggerGroupProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 1 },
        show: { opacity: 1, transition: { staggerChildren: 0.055, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function SignalPanel({ children, className, delay = 0, ...props }: SignalPanelProps & MotionProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14, filter: 'blur(10px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.34, delay, ease },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionListItem({ children, className, delay = 0 }: SignalPanelProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, x: -8 },
        show: { opacity: 1, x: 0, transition: { duration: 0.22, delay, ease } },
      }}
    >
      {children}
    </motion.div>
  );
}
