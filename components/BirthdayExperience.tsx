'use client';

import { useEffect, useState } from 'react';
import DomeGallery from '@/components/DomeGallery';
import InteractionFlow from '@/components/InteractionFlow';
import type { BirthdayConfig } from '@/lib/birthday';
import { Heart, Volume2, VolumeX } from 'lucide-react';

export default function BirthdayExperience({ birthday }: { birthday: BirthdayConfig }) {
  const [showGallery, setShowGallery] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  useEffect(() => {
    if (showGallery) return;

    const cleanHappyBirthday = () => {
      document.querySelectorAll('h1').forEach((heading) => {
        if (!heading.textContent?.startsWith('Happy Birthday,')) return;
        const firstTextNode = Array.from(heading.childNodes).find(
          (node): node is Text => node.nodeType === Node.TEXT_NODE,
        );
        if (firstTextNode) firstTextNode.textContent = firstTextNode.textContent.replace(/!+$/, '');
      });
    };

    const observer = new MutationObserver(cleanHappyBirthday);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    cleanHappyBirthday();
    return () => observer.disconnect();
  }, [showGallery]);

  return (
    <main className="w-screen h-screen bg-[#060010] overflow-hidden">
      {!showGallery ? (
        <InteractionFlow name={birthday.name} onFlowComplete={() => setShowGallery(true)} />
      ) : (
        <>
          <audio src={birthday.music_url} autoPlay loop muted={!musicOn} className="hidden" />
          <DomeGallery
            images={birthday.photos}
            fit={0.8}
            minRadius={600}
            maxVerticalRotationDeg={0}
            segments={34}
            dragDampening={2}
            grayscale={false}
            autoRotationSpeed={0.1}
          />
          <div className="fixed left-1/2 bottom-5 z-50 -translate-x-1/2 flex items-center gap-4 rounded-full border border-white/10 bg-black/40 px-5 py-3 text-white backdrop-blur-xl shadow-2xl">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            <span className="font-playfair text-sm sm:text-base [text-shadow:0_2px_10px_rgba(0,0,0,1)]">For {birthday.name}</span>
            <button
              type="button"
              onClick={() => setMusicOn(v => !v)}
              className="rounded-full p-2 transition hover:bg-white/10"
              aria-label={musicOn ? 'Mute music' : 'Play music'}
            >
              {musicOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
          <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 mx-auto max-w-2xl px-6 text-center text-white/80">
            <p className="font-playfair text-lg leading-relaxed drop-shadow-lg sm:text-2xl [text-shadow:0_2px_12px_rgba(0,0,0,1),0_0_3px_rgba(0,0,0,0.9)]">{birthday.message}</p>
          </div>
        </>
      )}
    </main>
  );
}
