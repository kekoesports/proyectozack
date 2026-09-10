'use client';

import Image from 'next/image';
import { useState, useSyncExternalStore } from 'react';
import { AGENCY_SOCIALS } from '@/lib/agency-socials';
import type { AgencyVideo } from '@/lib/schemas/agencyVideo';
import { getConsentSnapshot, getServerSnapshot, saveConsent, subscribe } from '@/lib/consent/consentStore';
import { useAgencyVideoVisibility } from './useAgencyVideoVisibility';
import { AgencyTikTokPlayer } from './AgencyTikTokPlayer';

export function AgencyVideoShowcase({ videos }: { readonly videos: readonly AgencyVideo[] }) {
  // Local playlist selection; it is not shared outside this section.
  const [selected, setSelected] = useState(0);
  const consent = useSyncExternalStore(subscribe, getConsentSnapshot, getServerSnapshot);
  const { ref, visible, reducedMotion } = useAgencyVideoVisibility();
  const video = videos[selected] ?? videos[0];
  if (!video) return null;
  const allowed = consent?.marketing === true;
  const active = allowed && visible;

  return (
    <section id="contenido" className="sp-video-section" aria-labelledby="sp-video-heading">
      <div className="sp-video-layout">
        <header className="sp-video-intro">
          <p className="sp-video-eyebrow">DENTRO DE SOCIALPRO</p>
          <h2 id="sp-video-heading">Las ideas se ven.<br /><span>El equipo se siente.</span></h2>
          <p className="sp-video-description">Creadores, ideas y lo que pasa detrás de cada campaña. Una pequeña muestra de nuestro día a día.</p>
          <a className="sp-profile-link" href={AGENCY_SOCIALS.tiktok} target="_blank" rel="noopener noreferrer">@socialproagency <span aria-hidden="true">↗</span></a>
        </header>
        <div className="sp-video-feature">
          <div ref={ref} className={`sp-video-frame${active ? ' is-enabled' : ''}`}>
            {video.thumbnail && <Image className="sp-video-cover" src={video.thumbnail} alt="" fill sizes="(max-width: 640px) 310px, 350px" />}
            <div className="sp-video-shade" />
            <span className="sp-video-badge">SOCIALPRO EN TIKTOK</span>
            {!allowed && <button
              className="sp-enable-videos"
              type="button"
              aria-label="Activar vídeos de TikTok"
              onClick={() => saveConsent({ analytics: getConsentSnapshot()?.analytics ?? false, marketing: true })}
            >
              <span className="sp-play-circle" aria-hidden="true">▶</span>
              <strong>Dale al play.</strong>
              <span>Activar vídeos de TikTok</span>
            </button>}
            <div className="sp-video-caption">
              <span>{String(selected + 1).padStart(2, '0')} / {String(videos.length).padStart(2, '0')}</span>
              <strong>{video.title}</strong>
            </div>
          </div>
          {active && <AgencyTikTokPlayer key={video.id} video={video} reducedMotion={reducedMotion} />}
          <div className="sp-video-below">
            {!active && <p className="sp-video-notice">{allowed ? 'En pausa · Fuera de pantalla' : 'Al activar, permites contenido externo de TikTok.'}</p>}
            <a className="sp-original-link" href={video.url} target="_blank" rel="noopener noreferrer">Ver en TikTok ↗</a>
          </div>
        </div>
        <div className="sp-video-selection">
          <p className="sp-selection-label">UN VISTAZO A LO QUE HACEMOS <span>01 — {String(videos.length).padStart(2, '0')}</span></p>
          <div className="sp-video-list" aria-label="Elegir vídeo">
            {videos.map((post, index) => <button key={post.id} type="button" className="sp-video-option" aria-label={`Ver vídeo: ${post.title}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>
              {post.thumbnail ? <Image src={post.thumbnail} alt="" width={46} height={60} sizes="46px" /> : <span className="sp-thumbnail-fallback" aria-hidden="true">SP</span>}
              <span className="sp-option-copy"><strong>{post.title}</strong><small>{post.subtitle}</small></span>
              <span className="sp-option-symbol" aria-hidden="true">{selected === index ? '▶' : String(index + 1).padStart(2, '0')}</span>
            </button>)}
          </div>
          <a className="sp-all-videos" href={AGENCY_SOCIALS.tiktok} target="_blank" rel="noopener noreferrer">Más de SocialPro en TikTok <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  );
}
