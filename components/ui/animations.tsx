"use client";

import { motion, type Variants } from "framer-motion";

/** Smooth, professional easing — not bouncy (cubic-bezier) */
const ease = [0.25, 0.1, 0.25, 1] as const;
/** Softer easing for scroll-triggered animations */
const easeSoft = [0.33, 0, 0.2, 1] as const;
const duration = 0.4;
const durationView = 0.55;

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const motionConfig = {
  transition: { duration, ease },
} as const;

/** Default viewport options for on-scroll trigger — super smooth, fire once */
const viewportOnce = { once: true, amount: 0.15, margin: "0px 0px -40px 0px" };

/**
 * Fade in and move up slightly. Use for section headers, hero, single cards.
 */
export function FadeInUp({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{ duration, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade in + move up when the element enters the viewport. Super smooth, runs once.
 */
export function FadeInUpInView({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeInUp}
      transition={{ duration: durationView, ease: easeSoft, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Simple fade in. Use when you only want opacity.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container for staggered children. Use with StaggerItem on list/grid children.
 */
const staggerContainer: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.06,
      staggerDirection: 1,
    },
  },
};

/**
 * Item that animates in when used inside StaggerChildren. Slight fade + small Y.
 */
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

type ElementTag = "div" | "ul" | "section";

export function StaggerChildren({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: ElementTag;
}) {
  const Tag = as === "ul" ? motion.ul : as === "section" ? motion.section : motion.div;
  return (
    <Tag
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * Stagger children when container enters viewport. Super smooth, runs once.
 */
export function StaggerChildrenInView({
  children,
  className,
  as = "div",
  staggerDelay = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  as?: ElementTag;
  staggerDelay?: number;
}) {
  const Tag = as === "ul" ? motion.ul : as === "section" ? motion.section : motion.div;
  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            staggerDirection: 1,
          },
        },
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
  viewTrigger = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: ElementTag | "li";
  /** Use softer, longer transition when parent is StaggerChildrenInView */
  viewTrigger?: boolean;
}) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      variants={staggerItem}
      transition={
        viewTrigger
          ? { duration: durationView, ease: easeSoft }
          : { duration, ease }
      }
      className={className}
    >
      {children}
    </Tag>
  );
}
