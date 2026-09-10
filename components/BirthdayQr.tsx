'use client';

import { useState } from 'react';
import { Download, Heart } from 'lucide-react';

export default function BirthdayQr({ url }: { url: string }) {
  const [downloading, setDownloading] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&margin=24&data=${encodeURIComponent(url)}&color=ec4899&bgcolor=ffffff`;

  async function downloadQr() {
    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('QR download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'birthday-card-qr.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-5 rounded-3xl border border-pink-400/20 bg-black/20 p-5 text-center">
      <p className="mb-4 font-playfair text-lg text-white">شاركها بالـ QR</p>
      <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
        <Heart className="absolute h-full w-full text-pink-500/25" fill="currentColor" strokeWidth={1.5} />
        <div className="relative z-10 rounded-2xl bg-white p-3 shadow-[0_0_45px_rgba(236,72,153,0.2)]">
          <img src={qrUrl} alt="QR code for the birthday card" className="h-48 w-48 sm:h-56 sm:w-56" />
        </div>
      </div>
      <p className="mt-3 text-xs text-white/45">امسح الكود لفتح بطاقة عيد الميلاد مباشرة</p>
      <button
        type="button"
        onClick={downloadQr}
        disabled={downloading}
        className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-semibold transition hover:bg-pink-400 disabled:opacity-50"
      >
        <Download size={16} />
        {downloading ? 'جاري الحفظ...' : 'حفظ QR كصورة'}
      </button>
    </div>
  );
}
