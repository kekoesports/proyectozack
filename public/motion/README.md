# Motion assets — hero SocialPro Giveaways

Este directorio contiene los assets de vídeo del hero de `/sorteos/plataforma`.

## Assets esperados

- `hero.webm` — vídeo principal, **prioridad**. Codec VP9/AV1.
- `hero.mp4` — fallback para Safari/iOS. Codec H.264.
- `hero-poster.jpg` — imagen estática mostrada antes de que arranque el vídeo (LCP-safe).

## Especificaciones recomendadas

| Parámetro | Valor |
|---|---|
| Duración | 3-6 s en loop perfecto |
| Ratio | 4:3 o 1:1 (se muestra a la derecha del H1) |
| Resolución | 720p (webm) / 1080p (mp4) |
| Tamaño target | **< 500 KB webm**, < 1 MB mp4 |
| Audio | **Ninguno** (autoplay muted) |
| Compresión | crf 32-36 para webm, crf 24-28 para mp4 |

## Contenido sugerido

3D Gaming Rewards / Giveaway Hero:

- Moneda dorada girando (SocialPro coin, gradiente naranja→rosa)
- Case CS2 abriéndose con brillos
- Tickets rasgados flotando
- Neón rosa/púrpura de fondo
- Movimiento suave, loop perfecto sin corte visible

Anti-patrones: chispas exageradas, efectos gaming genéricos, chibi. La estética
SocialPro es premium, no cartoon.

## Fallback

Mientras estos archivos no existan, el hero muestra un **fallback CSS-only** con
emojis en órbita 3D (🪙 🎫 📦) sobre glow rosa/cian. Está pensado como puente
temporal — no como diseño final.

## Cómo probarlo local

```bash
# Drop files
public/motion/hero.webm
public/motion/hero.mp4
public/motion/hero-poster.jpg

# El component <PlatformHero> los recoge automáticamente
npm run dev  # → http://localhost:3000/sorteos/plataforma
```

Si el navegador respeta `prefers-reduced-motion: reduce`, el vídeo se pausa
automáticamente (ver `platform.css`).
