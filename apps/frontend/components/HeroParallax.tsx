'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

export function HeroParallax() {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0px', '-40px']);

  return (
    <section ref={ref} className="relative overflow-hidden bg-forest-950 text-cream" aria-labelledby="hero-heading">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-clay-300">Reusable bottles · catalog</p>
          <h1 id="hero-heading" className="mb-5 text-4xl font-semibold leading-[1.05] sm:text-6xl">
            A bottle for the everyday.
          </h1>
          <p className="mb-8 max-w-lg text-lg text-sage-100">
            Reusable bottles, flasks and carafes. Compare them here and send a question about any of them. This site
            shows a catalog only: it does not take orders or payments.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#collection" className="rounded-full bg-cream px-6 py-3 font-semibold text-forest-950 hover:bg-white">
              See the collection
            </a>
            <a href="#lead-form" className="rounded-full border border-clay-300 px-6 py-3 font-semibold text-cream hover:bg-forest-800">
              Ask a question
            </a>
          </div>
        </div>
        <motion.div style={{ y: reduced ? 0 : y }} className="overflow-hidden rounded-[2rem] bg-sage-100">
          <Image src="/bottle-placeholder.svg" alt="" width={800} height={600} priority className="h-auto w-full" />
        </motion.div>
      </div>
    </section>
  );
}
