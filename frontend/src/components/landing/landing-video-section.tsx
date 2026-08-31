'use client';

import { LandingShell } from '@/components/landing/landing-shell';
import { Play } from 'lucide-react';
import { useRef, useState } from 'react';

const VIDEO_SRC = '/careflowdemo.mp4';

export function LandingVideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  async function handlePlay() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    try {
      await video.play();
      setHasStarted(true);
    } catch {
      // Browser blocked autoplay-style play; user can use native controls.
    }
  }

  return (
    <section id="video" className="w-full bg-white py-14 sm:py-16 lg:py-20">
      <LandingShell>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 sm:text-sm">Product walkthrough</p>
          <h2 className="mt-3 text-2xl font-bold text-navy-900 sm:text-3xl lg:text-4xl">Watch CareFlow in action</h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            See the full clinic workflow — calendar booking, visit documentation, medicines, charges, PDFs, and admin
            modules — in one guided demo video.
          </p>
        </div>

        <div className="relative mx-auto mt-10 w-full max-w-5xl">
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-navy-900 shadow-[0_24px_80px_rgba(15,39,68,0.18)] sm:rounded-[2rem]">
            <div className="flex items-center gap-2 border-b border-white/10 bg-navy-800 px-4 py-3 sm:px-5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs font-medium text-slate-400 sm:text-sm">CareFlow demo video</span>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
                controls
                playsInline
                preload="metadata"
                poster="/landing/video-poster.svg"
                onPlay={() => setHasStarted(true)}
                onEnded={() => setHasStarted(false)}
              >
                <source src={VIDEO_SRC} type="video/mp4" />
                Your browser does not support embedded video playback.
              </video>

              {!hasStarted ? (
                <button
                  type="button"
                  aria-label="Play CareFlow demo video"
                  className="absolute inset-0 flex items-center justify-center bg-navy-900/20 transition hover:bg-navy-900/30"
                  onClick={() => void handlePlay()}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-900/40 transition hover:scale-105 hover:bg-brand-600 sm:h-20 sm:w-20">
                    <Play className="ml-1 h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" />
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </LandingShell>
    </section>
  );
}
