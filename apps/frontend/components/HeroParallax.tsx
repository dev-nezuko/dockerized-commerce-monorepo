'use client';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function HeroParallax() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0px', '-40px']);
  return (
    <section ref={ref} className="relative overflow-hidden bg-emerald-950 text-white">
      <div className="container grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <p className="uppercase tracking-widest text-sm text-emerald-200 mb-5">Eco Bottle · catalog demo</p>
          <h1 className="text-4xl sm:text-6xl font-semibold leading-tight mb-6">A bottle for the everyday.</h1>
          <p className="text-emerald-100 text-lg mb-8 max-w-lg">Explore a small reusable-bottle collection and ask for product details. This demonstration does not accept orders or payments.</p>
          <a href="#lead-form" className="inline-block rounded-lg bg-white text-emerald-950 px-6 py-3 font-semibold">Request details</a>
        </div>
        <motion.div style={{ y: reduced ? 0 : y }} aria-hidden="true" className="rounded-3xl overflow-hidden">
          <img src="/bottle-placeholder.svg" alt="" width="800" height="600" className="w-full h-auto" />
        </motion.div>
      </div>
    </section>
  );
}
