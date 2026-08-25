CREATE TYPE "public"."press_target_backlink_type" AS ENUM('editorial', 'comunidad', 'perfil', 'desconocido');--> statement-breakpoint
CREATE TYPE "public"."press_target_cost_model" AS ENUM('gratuito-editorial', 'gratuito-autopublicacion', 'pago', 'desconocido');--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "country_code" varchar(2);--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "default_language" varchar(10);--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "last_video_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "recent_video_count" integer;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "min_recent_video_views" integer;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "avg_recent_video_views" integer;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "recent_videos_window_days" integer;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "qualification_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "contact_email" varchar(320);--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "contact_url" text;--> statement-breakpoint
ALTER TABLE "press_targets" ADD COLUMN "submission_url" text;--> statement-breakpoint
ALTER TABLE "press_targets" ADD COLUMN "contact_email" varchar(320);--> statement-breakpoint
ALTER TABLE "press_targets" ADD COLUMN "cost_model" "press_target_cost_model" DEFAULT 'desconocido' NOT NULL;--> statement-breakpoint
ALTER TABLE "press_targets" ADD COLUMN "backlink_type" "press_target_backlink_type" DEFAULT 'desconocido' NOT NULL;--> statement-breakpoint
ALTER TABLE "press_targets" ADD COLUMN "fit_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "press_targets" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "targets_country_code_idx" ON "targets" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "targets_last_video_at_idx" ON "targets" USING btree ("last_video_at");--> statement-breakpoint
CREATE INDEX "targets_recent_video_quality_idx" ON "targets" USING btree ("recent_video_count","min_recent_video_views");--> statement-breakpoint
CREATE INDEX "press_targets_cost_model_idx" ON "press_targets" USING btree ("cost_model");--> statement-breakpoint
CREATE INDEX "press_targets_fit_score_idx" ON "press_targets" USING btree ("fit_score");--> statement-breakpoint
INSERT INTO "press_targets" (
  "domain", "name", "url", "region", "submission", "submission_url", "contact_email",
  "summary", "category", "validated_at", "cost_model", "backlink_type", "fit_score", "is_active"
) VALUES
  ('3djuegos.com', '3DJuegos', 'https://www.3djuegos.com/', 'ES', 'Enviar noticia a redacción; publicación sujeta a criterio editorial', 'https://www.3djuegos.com/contacto', '3djuegos-redaccion@webedia-group.com', 'Proponer datos propios, estudios o historias de creadores de CS2; evitar notas comerciales genéricas.', 'gaming-generalista', '2026-08-25T00:00:00Z', 'gratuito-editorial', 'editorial', 92, true),
  ('vandal.elespanol.com', 'Vandal', 'https://vandal.elespanol.com/', 'ES', 'Enviar nota o propuesta a noticias@vandal.net; publicación sujeta a criterio editorial', 'https://vandal.elespanol.com/estaticos/redaccion', 'noticias@vandal.net', 'Medio de videojuegos con encaje para actualidad competitiva de CS2 y datos de la escena española.', 'gaming-generalista', '2026-08-25T00:00:00Z', 'gratuito-editorial', 'editorial', 90, true),
  ('infoplay.info', 'InfoPlay', 'https://www.infoplay.info/', 'ES', 'Formulario o email de redacción; publicación sujeta a criterio editorial', 'https://www.infoplay.info/es/contacto/', 'redaccion@infoplay.info', 'Priorizar investigación sobre marketing responsable, regulación y creator economy de iGaming.', 'igaming-skins', '2026-08-25T00:00:00Z', 'gratuito-editorial', 'editorial', 86, true),
  ('marketingdirecto.com', 'MarketingDirecto.com', 'https://www.marketingdirecto.com/', 'ES', 'Contacto de redacción; publicación sujeta a criterio editorial', 'https://www.marketingdirecto.com/contactar', 'fabiana.seara@marketingdirecto.com', 'Encaje para estudios propios de influencer marketing, esports y medición de campañas.', 'otro', '2026-08-25T00:00:00Z', 'gratuito-editorial', 'editorial', 84, true)
ON CONFLICT ("domain") DO UPDATE SET
  "name" = excluded."name",
  "url" = excluded."url",
  "region" = excluded."region",
  "submission" = excluded."submission",
  "submission_url" = excluded."submission_url",
  "contact_email" = excluded."contact_email",
  "summary" = excluded."summary",
  "category" = excluded."category",
  "validated_at" = excluded."validated_at",
  "cost_model" = excluded."cost_model",
  "backlink_type" = excluded."backlink_type",
  "fit_score" = excluded."fit_score",
  "is_active" = excluded."is_active",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "posts" (
  "slug", "title", "excerpt", "body_md", "author", "status", "vertical", "content_type",
  "published_at", "sort_order", "tags", "updated_at"
) VALUES (
  'blast-open-porto-2026-guia-cs2-fechas-formato',
  'BLAST Open Porto 2026: fechas y claves para seguir el torneo de CS2',
  'Porto reunirá a 16 equipos de Counter-Strike 2 en un BLAST Open con 1,1 millones de dólares en premios. Esta es la información confirmada y lo que conviene seguir.',
  $news$
## CS2 vuelve a tener una gran cita internacional en Portugal

BLAST ha confirmado que su Open de Porto reunirá a **16 equipos** y repartirá **1,1 millones de dólares en premios**. La fase presencial anunciada se disputará del **4 al 6 de septiembre de 2026** en el Super Bock Arena de Porto.

La organización presenta el torneo como el regreso de una gran competición de Counter-Strike a Portugal. Para la audiencia hispanohablante, el evento llega en un momento especialmente interesante: permite medir el estado competitivo de las plantillas tras el verano y anticipar qué equipos llegan mejor preparados al siguiente tramo de la temporada.

La información de fechas, participantes y premio procede del [anuncio oficial de BLAST sobre el Open de Porto](https://blast.tv/cs/news/blast-reveal-porto-open-for-2026). La organización también mantiene un [centro oficial de noticias y seguimiento de Counter-Strike](https://blast.tv/cs) para resultados, horarios y novedades.

## Qué merece la pena seguir

Más allá del resultado final, hay tres señales que ayudarán a entender el torneo:

1. **Adaptación al parche.** Valve ha mantenido actividad de actualizaciones durante agosto. Los cambios oficiales pueden consultarse en el [historial de actualizaciones de Counter-Strike 2](https://www.counter-strike.net/news/updates).
2. **Profundidad del mapa.** En eventos con equipos internacionales no basta con dominar una selección corta. Los vetos y la capacidad de responder a mapas menos cómodos suelen separar a los candidatos de las sorpresas puntuales.
3. **Regularidad.** Un buen mapa puede generar titulares, pero la consistencia entre series es la señal más útil para valorar el nivel real de un equipo.

## Talento de retransmisión

BLAST publicó el 19 de agosto la primera información sobre el equipo de talento del evento. Los nombres y las actualizaciones de producción pueden revisarse en el [anuncio oficial del talento de BLAST Open Porto](https://blast.tv/cs/news/blast-open-porto-talent-revealed).

SocialPro actualizará esta guía cuando BLAST confirme horarios detallados, cruces y canales de retransmisión. Así evitamos mezclar rumores con datos oficiales y mantenemos una referencia útil para creadores, marcas y seguidores de CS2.
  $news$,
  'SocialPro', 'published', 'news', 'noticias', '2026-08-26T08:00:00Z', 0,
  '["cs2","blast","esports","porto"]'::jsonb, now()
), (
  'como-evaluar-canal-youtube-cs2-antes-colaboracion',
  'Cómo evaluar un canal de YouTube de CS2 antes de una colaboración',
  'Una metodología práctica para comprobar actividad, visualizaciones, idioma, mercado y encaje real antes de contratar a un creador de Counter-Strike 2.',
  $blog$
Elegir un canal de YouTube por el número de suscriptores es una de las formas más rápidas de equivocarse en una campaña. La audiencia acumulada importa, pero no demuestra por sí sola que el canal siga activo, que sus vídeos mantengan alcance o que su comunidad encaje con la marca.

En SocialPro usamos una revisión inicial objetiva antes de pasar a la evaluación humana.

## 1. Define una ventana reciente

La actividad debe medirse en un periodo comparable. Para canales de CS2 utilizamos **60 o 90 días**, según la frecuencia habitual de publicación. Mirar solamente los últimos dos vídeos puede favorecer un pico puntual; revisar varios años mezcla etapas que ya no representan el canal actual.

Un primer filtro razonable es exigir **al menos ocho vídeos publicados** dentro de la ventana seleccionada. No convierte automáticamente al canal en un buen candidato, pero confirma que existe una actividad continuada.

## 2. Comprueba el mínimo, no solo la media

La media de visualizaciones puede quedar inflada por un vídeo viral. Por eso conviene calcular también el vídeo con menos visualizaciones del periodo.

Nuestro filtro inicial exige que **todos los vídeos recientes analizados superen 1.000 visualizaciones**. Después mostramos por separado:

- número de vídeos recientes;
- mínimo de visualizaciones;
- media de visualizaciones;
- fecha de la última publicación.

Estos datos no sustituyen el análisis cualitativo, pero evitan contactar perfiles inactivos o dependientes de un único pico.

## 3. Confirma idioma y procedencia

Un título en español no prueba que la audiencia principal sea hispanohablante. Conviene revisar la descripción del canal, el idioma habitual de los vídeos, los comentarios y el país declarado.

Cuando la campaña pertenece a una categoría regulada, el país no puede darse por válido por intuición. Debe contrastarse con el regulador correspondiente y con las restricciones concretas de la marca. Un canal que no declara país se mantiene para revisión manual; no se aprueba automáticamente.

## 4. Revisa el encaje real con CS2

Superar los mínimos numéricos solo abre la puerta. Antes de contactar comprobamos:

- proporción real de contenido de CS2 frente a otros juegos;
- formato predominante: competitivo, educativo, entretenimiento o directos recortados;
- tono y seguridad de marca;
- presencia de colaboraciones recientes y cómo las integra;
- calidad de los comentarios y señales de comunidad activa.

## 5. Decide con una ficha auditable

La decisión final debe poder explicarse. Guardar la fecha de revisión, el periodo analizado y los valores mínimo y medio permite comparar canales con el mismo criterio y actualizar los datos cuando envejecen.

La combinación correcta es sencilla: **datos para descartar falsos positivos y revisión humana para decidir el encaje**. Así el equipo dedica tiempo comercial a creadores activos, relevantes y adecuados para cada mercado.
  $blog$,
  'SocialPro', 'published', 'blog', 'analisis', '2026-08-28T08:00:00Z', 0,
  '["youtube","cs2","influencer-marketing","creadores"]'::jsonb, now()
)
ON CONFLICT ("slug") DO NOTHING;
