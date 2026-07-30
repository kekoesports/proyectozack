/**
 * Glosario iGaming & Skins CS2 — 25 términos en 3 bloques.
 *
 * Estructura de cada entrada (según brief Fase 3 del sprint SEO+GEO 2026-07):
 * - `shortDef` (50-80 palabras) → definición directa, respuesta citable por IAs.
 * - `context` → párrafo más largo con matices, historia y variaciones.
 * - `socialProApplication` (1-2 frases) → cómo lo usamos operativamente.
 *
 * Reglas editoriales aplicadas (docs/seo-writing-rules.md):
 * - Español neutro. Términos técnicos EN mantenidos por convención de industria.
 * - Claims regulatorios anclados temporalmente ("a 2026").
 * - Sin nombres de creadores sin confirmación explícita.
 * - Sin cifras no verificables.
 */

export type GlossaryBlock = 'iGaming' | 'skins-cs2' | 'creator-economy';

export const GLOSSARY_BLOCK_LABELS: Record<GlossaryBlock, string> = {
  'iGaming': 'iGaming',
  'skins-cs2': 'Skins CS2',
  'creator-economy': 'Creator economy',
};

export const GLOSSARY_BLOCK_DESCRIPTIONS: Record<GlossaryBlock, string> = {
  'iGaming': 'Métricas y regulación del ecosistema iGaming: FTD, CPA, GGR, DGOJ y compliance.',
  'skins-cs2': 'Vocabulario del ecosistema de skins de CS2 en español: case opening, provably fair, trade-up, StatTrak y marketplaces.',
  'creator-economy': 'Herramientas y contratos del creator marketing: tracking por streamer, códigos de referido, CPM, brand deals y media kits.',
};

export type GlossaryTerm = {
  readonly slug: string;
  readonly name: string;
  readonly alternateName?: readonly string[];
  readonly block: GlossaryBlock;
  /** Respuesta directa 50-80 palabras — la que citan las IAs. */
  readonly shortDef: string;
  /** Párrafo de contexto con matices, historia, variaciones. */
  readonly context: string;
  /** 1-2 frases sobre uso operativo en SocialPro. */
  readonly socialProApplication: string;
};

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  // ─── Bloque 1 · iGaming ────────────────────────────────────────────────
  {
    slug: 'ftd',
    name: 'FTD',
    alternateName: ['FTDs', 'First Time Deposit', 'Primer Depósito'],
    block: 'iGaming',
    shortDef:
      'FTD (First Time Deposit) es el primer depósito real que un usuario hace en un operador de iGaming después de registrarse. Es la métrica primaria de conversión en campañas de casino, sportsbook y poker: mide cuántos jugadores nuevos aportan dinero real por primera vez a la plataforma, no solo cuántos se registran. Un registro sin FTD no cuenta como conversión válida en la mayoría de contratos entre operador y agencia.',
    context:
      'La razón por la que el FTD desplazó a los registros como métrica principal es económica: los operadores pagan a sus afiliados en función del valor real que aportan los jugadores, y un registro sin depósito tiene valor cero. El importe mínimo para que un depósito cuente como FTD varía por operador y mercado (típicamente entre 10 € y 20 € en España; menos en LATAM). Cuando la campaña se activa con enlaces de afiliado únicos por creador, cada FTD queda automáticamente atribuido al streamer que generó ese registro, sin depender de estimaciones ni de analytics de terceros.',
    socialProApplication:
      'Todas las campañas iGaming de SocialPro se contratan sobre objetivo de FTDs verificados desde el panel del operador. En la campaña 1WIN de 2025 el modelo generó 340+ FTDs atribuibles a streamers concretos.',
  },
  {
    slug: 'cpa',
    name: 'CPA',
    alternateName: ['Cost Per Acquisition', 'Coste Por Adquisición'],
    block: 'iGaming',
    shortDef:
      'CPA (Cost Per Acquisition) es el modelo de comisión en el que el operador paga al afiliado o agencia una cantidad fija por cada FTD (o cada usuario adquirido válido según el contrato). El importe se acuerda por adelantado y no depende del comportamiento posterior del jugador. Es el modelo más simple y predecible para campañas de duración corta con objetivos de volumen.',
    context:
      'El CPA se contrapone al RevShare (revenue share): mientras el CPA paga una comisión única y cerrada por adquisición, el RevShare paga un porcentaje del margen neto que el jugador genere a lo largo de su vida. El CPA es más atractivo para creadores que buscan pago inmediato y para operadores con presupuestos de campaña cerrados. Los importes CPA varían enormemente por mercado y tipo de producto (30-200 € en casino europeo típico, menos en LATAM y más en verticales como poker con alto LTV).',
    socialProApplication:
      'SocialPro negocia CPA cuando el operador prioriza volumen predecible y el creador prefiere liquidez frente a upside a largo plazo. En verticales de alto LTV (poker, casino VIP) recomendamos RevShare o modelos híbridos.',
  },
  {
    slug: 'ggr',
    name: 'GGR',
    alternateName: ['Gross Gaming Revenue', 'Ingreso Bruto de Juego'],
    block: 'iGaming',
    shortDef:
      'GGR (Gross Gaming Revenue) es la diferencia entre las apuestas totales que reciben los jugadores en un operador y los premios que se les pagan, antes de aplicar ningún coste. Es la métrica financiera básica del negocio de juego: representa lo que "gana la casa" sin descontar impuestos, licencias, bonos ni gasto operativo. Sirve como base para calcular impuestos de juego y como referencia de tamaño de mercado.',
    context:
      'El GGR es una métrica bruta y por eso no refleja la rentabilidad real de un operador. Un operador puede tener GGR alto y pérdidas si su gasto en bonos, licencias, marketing y compliance supera esa cifra. En España la DGOJ publica trimestralmente el GGR agregado del sector regulado, lo que permite comparar el peso relativo de casino, sportsbook, poker y bingo. La palabra "gross" en español se traduce como "bruto" — es decir, sin ninguna deducción posterior.',
    socialProApplication:
      'En los briefings iGaming el GGR aparece como métrica de referencia para dimensionar el potencial de una campaña, pero los pagos al afiliado se calculan sobre NGR o CPA, no sobre GGR.',
  },
  {
    slug: 'ngr',
    name: 'NGR',
    alternateName: ['Net Gaming Revenue', 'Ingreso Neto de Juego'],
    block: 'iGaming',
    shortDef:
      'NGR (Net Gaming Revenue) es el GGR menos los costes directamente asociados a la actividad de juego: bonos, gastos de procesamiento de pagos, tasas de licencia, chargebacks y el impuesto sobre el juego. Es la métrica que refleja el margen operativo real del operador y la base habitual para calcular las comisiones de RevShare de afiliados. A diferencia del GGR, el NGR sí es comparable entre operadores de tamaño distinto como indicador de eficiencia.',
    context:
      'La fórmula exacta de NGR varía por operador y por contrato — algunos deducen solo bonos y tasa de juego, otros incluyen también costes de pago y compliance. Esta variación es importante para el afiliado porque afecta directamente al porcentaje que recibe: dos operadores que ofrezcan "40 % RevShare" pueden pagar cantidades muy distintas dependiendo de qué deducciones aplican al GGR antes de calcular el NGR. Los contratos serios detallan explícitamente qué se descuenta.',
    socialProApplication:
      'Al negociar RevShare, el equipo de SocialPro valida siempre la fórmula NGR del operador antes de firmar. Un porcentaje sobre una base NGR generosamente deducida vale menos que un porcentaje menor sobre una base limpia.',
  },
  {
    slug: 'ltv',
    name: 'LTV',
    alternateName: ['Lifetime Value', 'Valor de Vida del Cliente'],
    block: 'iGaming',
    shortDef:
      'LTV (Lifetime Value) es el ingreso neto que un operador espera generar de un jugador a lo largo de toda su relación con la plataforma. Combina la frecuencia de depósito, el ticket medio, la tasa de retención y el margen neto por transacción. Es la métrica que determina cuánto puede permitirse pagar un operador por adquirir un nuevo usuario y por tanto marca el techo real de los importes CPA y de los porcentajes RevShare.',
    context:
      'El LTV varía radicalmente por vertical y por perfil de jugador: un jugador de VIP casino puede tener LTV de miles de euros mientras que un usuario de bingo casual suele estar por debajo de los 100. En sportsbook el LTV depende mucho del calendario deportivo del mercado (fútbol domina España y LATAM; NFL domina el mercado norteamericano). El LTV se calcula habitualmente en horizontes de 6, 12 o 24 meses y es una estimación estadística — nunca un dato observado de un usuario concreto salvo a posteriori.',
    socialProApplication:
      'Cuando un operador tiene LTV alto en su vertical, SocialPro suele proponer RevShare o modelos híbridos para capturar el upside. Cuando el LTV es bajo o incierto, CPA fijo protege al afiliado.',
  },
  {
    slug: 'revshare',
    name: 'RevShare',
    alternateName: ['Revenue Share', 'Reparto de Ingresos'],
    block: 'iGaming',
    shortDef:
      'RevShare (Revenue Share) es el modelo de comisión en el que el operador paga al afiliado o agencia un porcentaje del NGR generado por los jugadores atribuidos, mes tras mes, durante toda la vida activa de esas cuentas. Al contrario que el CPA (pago fijo único), el RevShare recompensa la calidad del jugador y no solo la cantidad: un afiliado que trae pocos jugadores pero de alto LTV puede facturar más que otro que trae muchos con baja retención.',
    context:
      'Los porcentajes RevShare típicos en iGaming europeo van del 20 al 45 % del NGR, con escalados por volumen. Muchos operadores ofrecen modelos híbridos (CPA + RevShare menor) que combinan liquidez inicial con upside a largo plazo. El RevShare requiere confianza en el operador porque el afiliado depende de que el reporting mensual de NGR sea correcto y no manipulado — de ahí que los operadores serios pasen auditorías periódicas y publiquen dashboards con desglose diario.',
    socialProApplication:
      'SocialPro prefiere RevShare o híbrido para verticales de alto LTV (poker, casino VIP) y con operadores del roster con historial de reporting limpio.',
  },
  {
    slug: 'afiliado',
    name: 'Afiliado',
    alternateName: ['Affiliate'],
    block: 'iGaming',
    shortDef:
      'Un afiliado es la persona, agencia o plataforma que promociona los productos de un operador de iGaming a cambio de una comisión por cada FTD, registro o RevShare atribuido a su tráfico. La atribución se hace mediante enlaces únicos y códigos de referido personales generados por el sistema del operador. Los afiliados van desde grandes redes de portales de reviews hasta streamers individuales pasando por agencias de influencer marketing como SocialPro.',
    context:
      'El marketing de afiliación es históricamente el canal más importante de captación en iGaming — muchos operadores destinan una parte significativa de su presupuesto de adquisición a este canal en lugar de a ads directos, porque el modelo transfiere el riesgo al afiliado (solo se paga cuando hay conversión real). En España cualquier afiliado que promocione operadores con licencia DGOJ debe cumplir el Real Decreto 958/2020 sobre publicidad de actividades de juego, incluyendo restricciones de contenido y de horario aplicables al mercado español.',
    socialProApplication:
      'SocialPro opera como afiliado de nivel agencia con contratos directos con operadores licenciados. Los streamers reciben su parte del contrato como creators de la agencia, no como afiliados individuales.',
  },
  {
    slug: 'dgoj',
    name: 'DGOJ',
    alternateName: ['Dirección General de Ordenación del Juego'],
    block: 'iGaming',
    shortDef:
      'La DGOJ (Dirección General de Ordenación del Juego) es el organismo del Ministerio de Consumo español que regula, autoriza y supervisa el juego online en España. Emite las licencias que los operadores necesitan para ofrecer casino, sportsbook, poker o bingo dirigido al mercado español, publica los datos trimestrales de GGR agregado por vertical y sanciona incumplimientos publicitarios. Ninguna operación legal de iGaming en España puede realizarse sin operar bajo licencia DGOJ vigente.',
    context:
      'La DGOJ se creó con la Ley 13/2011 de Regulación del Juego, que estableció el marco legal del juego online en España. Su alcance regulatorio incluye no solo a los operadores sino también a las herramientas de publicidad y patrocinio: el Real Decreto 958/2020 sobre comunicaciones comerciales de las actividades de juego establece la ventana horaria 1:00-5:00 para la mayor parte de la publicidad de juego real, prohíbe los bonos de bienvenida en creatividades y limita el uso de personajes públicos y deportistas en activo como imagen de operadores.',
    socialProApplication:
      'SocialPro solo activa campañas iGaming en el mercado español con operadores que acreditan licencia DGOJ vigente en la modalidad concreta (casino, sportsbook, poker), y aplica el protocolo del RD 958/2020 en cada contenido patrocinado.',
  },
  {
    slug: 'juego-responsable',
    name: 'Juego responsable',
    alternateName: ['Responsible Gaming', 'Participación responsable'],
    block: 'iGaming',
    shortDef:
      'Juego responsable es el conjunto de prácticas, mensajes y herramientas orientadas a que la participación en juego online se mantenga en niveles saludables y no derive en problemas de adicción. Incluye disclaimers +18 obligatorios, límites de depósito voluntarios y automáticos, autoexclusión, información sobre ayuda profesional y comunicación proactiva por parte del operador cuando detecta patrones de riesgo. En España es obligatorio por normativa DGOJ y en LATAM cada mercado tiene requisitos análogos.',
    context:
      'Aunque a menudo se reduce a un logotipo pequeño en un banner, el juego responsable es un ecosistema regulatorio y técnico complejo: los operadores tienen obligación de detectar comportamientos problemáticos (aumento súbito de frecuencia de depósito, sesiones muy largas, chasing losses) y actuar, no solo mostrar advertencias. Los creadores que promocionan iGaming son parte de la cadena y por eso el RD 958/2020 exige incluir mensajes de participación responsable en toda comunicación comercial.',
    socialProApplication:
      'Todo contenido patrocinado gestionado por SocialPro incluye disclaimer +18 y enlace a información sobre participación responsable. Ningún brief se firma sin este bloque.',
  },
  {
    slug: 'kyc',
    name: 'KYC',
    alternateName: ['Know Your Customer', 'Conoce a tu Cliente'],
    block: 'iGaming',
    shortDef:
      'KYC (Know Your Customer) es el proceso por el que un operador de iGaming verifica la identidad, edad y datos bancarios de un jugador antes de permitirle depositar o retirar dinero real. Incluye verificación documental (DNI o pasaporte), comprobación de que el usuario es mayor de edad, verificación del método de pago y en algunos casos verificación de fuente de fondos. Es obligatorio por normativa antiblanqueo y por normativa DGOJ para operadores con licencia española.',
    context:
      'El KYC tiene impacto directo sobre las tasas de conversión de campañas de afiliación: un proceso KYC largo o con muchas fricciones penaliza el ratio "registro → FTD", que es la métrica que importa al afiliado. Los operadores serios invierten en KYC ágil (verificación con foto DNI en segundos, matching biométrico automatizado) precisamente por esto. En sportsbook y casino en directo el KYC también es requisito para prevenir el uso fraudulento de tarjetas y el juego de menores.',
    socialProApplication:
      'En el brief con el operador SocialPro pregunta explícitamente por el tiempo medio de KYC (segundos o minutos) porque afecta directamente al FTD atribuible al streamer y al ROI de la campaña.',
  },

  // ─── Bloque 2 · Skins CS2 (diferencial en español) ─────────────────────
  {
    slug: 'case-opening',
    name: 'Case opening',
    alternateName: ['Apertura de cajas'],
    block: 'skins-cs2',
    shortDef:
      'Case opening es el proceso de abrir una caja virtual (case) de CS2 para obtener una skin aleatoria de un pool predefinido con probabilidades públicas. Las cajas se pueden comprar dentro del propio juego Steam o en plataformas externas de terceros que ofrecen su propio inventario, mecánicas y precios. Es una de las mecánicas más populares del ecosistema CS2 y da lugar a una industria entera de plataformas dedicadas exclusivamente a esta actividad.',
    context:
      'Las cajas oficiales de CS2 se abren con una llave que cuesta dinero real y tienen probabilidades documentadas por Valve. Las plataformas externas ("case opening sites") ofrecen sus propias cajas —a menudo con premios más grandes o probabilidades más altas de skins caras— y suelen operar en jurisdicciones con marcos regulatorios propios. En muchos países la clasificación legal del case opening externo es una zona gris entre el juego regulado y el simple marketplace: depende de si la caja se puede canjear por dinero real o solo por otras skins.',
    socialProApplication:
      'SocialPro promociona plataformas de case opening que operan con licencia en sus mercados y con probabilidades públicas verificables (provably fair). En España se aplica siempre disclaimer +18 y validación del marco regulatorio con el operador antes de la activación.',
  },
  {
    slug: 'provably-fair',
    name: 'Provably fair',
    alternateName: ['Justicia verificable', 'Probablemente justo'],
    block: 'skins-cs2',
    shortDef:
      'Provably fair es un sistema criptográfico que permite a un usuario verificar matemáticamente que el resultado de una apertura de caja, tirada de ruleta o lanzamiento aleatorio no fue manipulado por la plataforma. Se basa en hashes que la plataforma publica antes de la acción (seed del servidor cifrado) y en un seed del cliente que el usuario aporta. Tras el resultado se revela el seed del servidor y cualquiera puede comprobar el cálculo del outcome de forma independiente.',
    context:
      'El concepto viene originalmente del ecosistema Bitcoin y el juego crypto, y se adoptó rápido en plataformas de case opening de CS2 como diferencial técnico frente a plataformas opacas que podían manipular resultados. Provably fair NO garantiza que las probabilidades sean generosas — solo que el sorteo se hace tal como la plataforma declara. Una caja provably fair con 0,01 % de probabilidad de premio grande es matemáticamente honesta pero sigue siendo estadísticamente adversa. La honestidad y las probabilidades son dos cosas distintas.',
    socialProApplication:
      'SocialPro incluye "verificar provably fair" y "revisar tablas de probabilidad" en el checklist de validación de plataformas antes de aceptar un brief de case opening.',
  },
  {
    slug: 'skin-gambling',
    name: 'Skin gambling',
    alternateName: ['Apuestas con skins'],
    block: 'skins-cs2',
    shortDef:
      'Skin gambling es la práctica de usar skins de videojuegos (predominantemente CS2) como fichas de valor en actividades de juego: apuestas deportivas de esports, ruleta, blackjack, coinflip, jackpot, crash y otras variantes. Las skins se depositan en la plataforma, se convierten en un saldo virtual y las ganancias se pueden retirar en forma de otras skins o vendiendo estas por dinero real. Su clasificación regulatoria varía radicalmente por jurisdicción.',
    context:
      'El fenómeno del skin gambling explotó entre 2015 y 2016 alrededor del ecosistema CS:GO y forzó a Valve a intervenir contra las plataformas más agresivas mediante restricciones al Steam Trading API. Desde entonces la industria se ha reconfigurado: muchas plataformas operan con licencias de juego real (Curazao, Malta, etc.) y otras existen como puros marketplaces P2P que evitan la clasificación de "juego". Reguladores como la UK Gambling Commission tratan el skin gambling como juego cuando los premios son intercambiables por dinero real.',
    socialProApplication:
      'SocialPro distingue explícitamente en el brief entre marketplaces P2P (sin juego) y plataformas de skin gambling (con juego), y aplica el protocolo iGaming completo — DGOJ en España, equivalentes LATAM — a las segundas.',
  },
  {
    slug: 'trade-up',
    name: 'Trade-up',
    alternateName: ['Trade-ups', 'Contrato de intercambio', 'Trade-Up Contract'],
    block: 'skins-cs2',
    shortDef:
      'Un trade-up es el mecanismo oficial de CS2 por el que un jugador entrega diez skins de una misma rareza (por ejemplo, "Mil Spec") para recibir aleatoriamente una skin de la rareza inmediatamente superior ("Restricted"). El resultado se calcula con las probabilidades públicas de las colecciones a las que pertenecen las skins entregadas. Es la única forma nativa de "subir de rareza" sin comprar directamente en el mercado, y tiene una economía optimizable propia.',
    context:
      'El trade-up es una mecánica matemática: hay comunidades y calculadoras enteras dedicadas a identificar combinaciones de skins baratas de una rareza que maximicen el valor esperado del resultado de la rareza superior. En algunos casos es rentable estadísticamente, en la mayoría no. Además del trade-up oficial de Valve, muchas plataformas externas ofrecen su propia versión con inventarios y probabilidades distintas, que puede o no estar sujeta a marcos regulatorios de juego según la jurisdicción.',
    socialProApplication:
      'Las campañas de trade-up se tratan operativamente como el resto del ecosistema skins: contenido en directo del creador ejecutando trade-ups con código único de la plataforma y reporting desde el panel del partner.',
  },
  {
    slug: 'cashout',
    name: 'Cashout',
    alternateName: ['Cashouts', 'Retirada', 'Cobrar'],
    block: 'skins-cs2',
    shortDef:
      'Cashout es la acción de convertir el saldo o inventario de una plataforma de skins en dinero real, en criptomonedas, en tarjetas regalo o en otro instrumento externo a la plataforma. Es la operación inversa del depósito y suele estar sujeta a validaciones KYC, límites diarios, comisiones y ventanas de procesamiento. La existencia y facilidad del cashout es lo que diferencia jurídicamente a un marketplace de skins de una plataforma de puro entretenimiento con premios virtuales no canjeables.',
    context:
      'El cashout es el punto crítico regulatorio del ecosistema skins: cuando el saldo se puede convertir en dinero real, muchas jurisdicciones reclasifican la plataforma como juego. Las plataformas serias tienen procesos KYC completos antes del primer cashout, ventanas de retención antisospecha y trazabilidad completa de la fuente de fondos. Los tiempos de procesamiento van de horas (crypto) a varios días laborables (banco tradicional). Los cashout instantáneos son una señal de marketing importante en el sector.',
    socialProApplication:
      'En el brief con el operador SocialPro pregunta explícitamente por tiempos de cashout y validaciones aplicables porque afectan a la percepción del usuario y por tanto a la conversión y retención de la campaña.',
  },
  {
    slug: 'float',
    name: 'Float',
    alternateName: ['Float Value', 'Valor de desgaste'],
    block: 'skins-cs2',
    shortDef:
      'Float es un número decimal entre 0 y 1 asociado a cada skin de CS2 que determina el nivel de desgaste visual del arma. Valores bajos (~0,00) producen skins Factory New, prácticamente perfectas; valores altos (~1,00) producen skins Battle-Scarred con arañazos, óxido y patrones muy visibles. Dos skins del mismo modelo pueden tener precios radicalmente distintos según su float exacto, especialmente en el mercado coleccionista y en skins raras.',
    context:
      'El float es un dato interno del sistema de Valve pero es consultable con herramientas externas que leen la información del inventario. Coleccionistas de skins persiguen floats "low float" excepcionalmente bajos dentro del rango Factory New, y algunos skins con patrones específicos (ej. AK-47 Case Hardened blue gems) tienen valor de mercado que puede multiplicar por diez o veinte el precio base del modelo por combinar float + pattern. El float es también relevante para trade-ups porque el float de la skin resultante se calcula a partir de la media de los floats de las skins entregadas.',
    socialProApplication:
      'En briefs donde el producto es un marketplace de skins premium o un case opening con skins de alto valor, SocialPro incluye contenido educativo sobre float en la propuesta del creador para elevar el conocimiento del usuario y por tanto la conversión.',
  },
  {
    slug: 'stat-trak',
    name: 'StatTrak',
    alternateName: ['StatTrak™'],
    block: 'skins-cs2',
    shortDef:
      'StatTrak es la característica oficial de CS2 que hace que un arma cuente y muestre en el propio inventario el número acumulado de eliminaciones que el jugador ha conseguido con esa skin concreta. Solo un porcentaje pequeño de las skins que salen de las cajas oficiales llega con esta característica, lo que las hace más caras en el mercado a igual modelo y calidad. StatTrak es acumulativo y no transferible: el contador arranca desde cero cuando la skin cambia de dueño.',
    context:
      'El precio adicional de una skin StatTrak sobre su equivalente no-StatTrak varía por popularidad del arma y por el float, pero es sistemático — a partir del cierto umbral de kills registrado, el valor de coleccionista adicional puede ser significativo. StatTrak es también un atractivo psicológico para jugadores competitivos activos que ven crecer el contador con su propio uso. En trade-ups la propiedad StatTrak se mantiene solo si las diez skins entregadas también son StatTrak.',
    socialProApplication:
      'StatTrak forma parte del vocabulario base que un streamer CS2 patrocinado por un marketplace o case opening debe manejar con soltura para conectar con la audiencia sin sonar comercial.',
  },
  {
    slug: 'marketplace-de-skins',
    name: 'Marketplace de skins',
    alternateName: ['Skin marketplace', 'Mercado de skins'],
    block: 'skins-cs2',
    shortDef:
      'Un marketplace de skins es una plataforma que facilita la compra-venta directa de skins de CS2 (y a veces de otros juegos como Dota 2, Rust o TF2) entre usuarios, sin operar mecánicas de juego. Los precios los ponen los propios usuarios, la plataforma cobra una comisión por transacción y el sistema gestiona el trade a través de Steam de forma automatizada. A diferencia del case opening o el skin gambling, un marketplace P2P no se considera juego regulado en la mayoría de jurisdicciones.',
    context:
      'Los marketplaces P2P compiten en tres ejes: tamaño de inventario disponible, spread respecto al precio Steam Community Market (habitualmente 10-30 % más barato) y liquidez del cashout. Los grandes marketplaces del ecosistema en 2026 procesan cientos de miles de transacciones al mes. Algunos combinan marketplace P2P con módulos de trade-up o upgrade, lo que puede reclasificar parte de su actividad como juego según la jurisdicción — de ahí la importancia de leer el marco regulatorio aplicable a cada mercado antes de una activación publicitaria.',
    socialProApplication:
      'SocialPro trabajó con SkinsMonkey en 2025 en una campaña de 6 semanas con código de referido único por streamer que generó 200.000 € en volumen de trading atribuidos directamente a creadores de la agencia, con datos validados desde la plataforma.',
  },
  {
    slug: 'drop',
    name: 'Drop',
    alternateName: ['Drops', 'Loot drop', 'Recompensa aleatoria'],
    block: 'skins-cs2',
    shortDef:
      'Un drop es una recompensa aleatoria que el sistema del juego CS2 entrega al jugador por participar en una partida oficial o por conseguir determinados hitos semanales. Los drops pueden ser cajas, skins, gráficos o piezas de coleccionista, y su probabilidad varía por actividad y por rango. Los drops que caen directamente como skins raras tienen valor de mercado inmediato si el jugador decide venderlas en el Steam Community Market o en marketplaces externos.',
    context:
      'El sistema de drops de Valve está diseñado para incentivar el juego regular sin canalizarlo hacia la apertura de cajas de pago: los drops de skins con valor son poco frecuentes en el flujo normal pero suficientemente motivadores para mantener el engagement. Los drops de las Weekly Care Package son el ejemplo más citado — una selección semanal de skins o graffitis que Valve controla directamente. En el ámbito de creator marketing la palabra "drop" se usa también en sentido más laxo para referirse a cualquier reparto aleatorio de items en directo, incluso fuera del sistema oficial de Valve.',
    socialProApplication:
      'Los "drops" en directo de creadores (giveaways de skins) son una mecánica frecuente en las campañas de SocialPro con marketplaces y case opening; el operador aporta el inventario y el streamer lo distribuye entre su audiencia con un código de participación.',
  },
  {
    slug: 'upgrade',
    name: 'Upgrade',
    alternateName: ['Upgrades', 'Mejora de skin'],
    block: 'skins-cs2',
    shortDef:
      'Upgrade es el mecanismo, ofrecido por plataformas externas al juego, por el que un usuario apuesta una skin (o combinación de skins) contra la probabilidad de recibir a cambio una skin de valor superior. La probabilidad del resultado favorable está relacionada con el ratio de precios entre la skin apostada y la skin objetivo: subir de 10 a 100 euros suele tener una probabilidad cercana al 10 %, menos las comisiones de la plataforma. Es una mecánica de juego, no un intercambio comercial.',
    context:
      'A diferencia del trade-up oficial de Valve (que es determinista dentro de las probabilidades de la colección), el upgrade externo funciona como un puro binario: o consigues la skin objetivo o pierdes la skin apostada. La mayoría de plataformas de upgrade son transparentes sobre el multiplicador y la probabilidad exacta, y las que no lo son deberían tratarse con precaución. Regulatoriamente el upgrade cae más cerca del case opening y el skin gambling que del marketplace tradicional, por lo que la clasificación como juego regulado varía por jurisdicción.',
    socialProApplication:
      'En campañas con plataformas que ofrecen módulos de upgrade, SocialPro exige validación previa de la probabilidad publicada y aplica el mismo protocolo de disclaimer +18 y compliance regulatorio que en el resto del ecosistema de skin gambling.',
  },

  // ─── Bloque 3 · Creator economy ────────────────────────────────────────
  {
    slug: 'ftd-tracking-por-streamer',
    name: 'FTD tracking por streamer',
    alternateName: ['Attribution tracking', 'Atribución de FTDs'],
    block: 'creator-economy',
    shortDef:
      'FTD tracking por streamer es el sistema técnico que atribuye cada FTD generado en una campaña iGaming al creador concreto que lo originó, mediante enlaces de afiliado únicos o códigos de referido personales por streamer. La atribución la ejecuta el sistema del propio operador (no el streamer ni la agencia), y el resultado queda registrado en el panel de afiliados del operador con desglose por creador, mercado y fecha, sin dependencia de analytics de terceros.',
    context:
      'La correcta atribución por streamer es la base económica de cualquier campaña de iGaming con creadores: sin trazabilidad, los pagos serían imposibles de calcular y el ROI de la campaña no sería auditable. Los sistemas de tracking maduros permiten atribuir además la primera acción de cada usuario incluso si accede desde varios dispositivos, con ventanas de atribución típicas de 30 días. En algunos operadores la atribución también se aplica a segundas y sucesivas conversiones (deposits recurrentes, cross-sell a otros productos) para calcular RevShare correctamente.',
    socialProApplication:
      'SocialPro reporta al operador y al creador exclusivamente lo que el panel del operador atribuye — sin estimaciones, sin capturas de pantalla, sin cifras de terceros. Es lo que permite negociar campañas complejas cross-mercado sobre datos limpios.',
  },
  {
    slug: 'codigo-de-referido',
    name: 'Código de referido',
    alternateName: ['Referral code', 'Código promocional'],
    block: 'creator-economy',
    shortDef:
      'Un código de referido es una cadena alfanumérica única (habitualmente el nickname del creador en mayúsculas o una variación) que el operador emite a cada streamer patrocinado para que su audiencia lo introduzca al registrarse, depositar o canjear un bono. Es el mecanismo más simple y visible de atribución en creator marketing y suele coexistir con enlaces de afiliado únicos para cubrir tanto tráfico directo (código) como tráfico por link (enlace).',
    context:
      'El código de referido cumple una doble función: técnica (atribución al creador) y de marketing (refuerza la memoria de marca del streamer en la audiencia y activa una conexión personal con la campaña). Los códigos memorables (nickname corto, palabra clave) rinden mejor que los combinaciones aleatorias. Muchos operadores además vinculan al código un bono exclusivo para la audiencia del creador —depósito ampliado, freebet, giros gratis— que aumenta la conversión frente al bono estándar disponible en la home del operador.',
    socialProApplication:
      'SocialPro incluye código de referido único en cada activación iGaming y CS2 skins del sprint, siempre validado con el operador para que quede activo desde el minuto uno del contenido en directo.',
  },
  {
    slug: 'cpm-twitch',
    name: 'CPM Twitch',
    alternateName: ['Cost Per Mille', 'Coste por mil impresiones en Twitch'],
    block: 'creator-economy',
    shortDef:
      'CPM (Cost Per Mille) en Twitch es el precio que una marca paga a un streamer por cada mil impresiones de contenido patrocinado durante un directo. Se calcula sobre viewers concurrentes medios multiplicados por duración de la mención o segmento patrocinado. Es la métrica de referencia para valorar patrocinios de brand awareness — a diferencia del CPA o el RevShare, no depende de que la audiencia realice ninguna acción de conversión posterior.',
    context:
      'El CPM en Twitch varía enormemente por idioma, vertical y momento — un directo de un top streamer de habla inglesa puede tener CPM de dos dígitos, mientras que un streamer emergente en un mercado latinoamericano puede estar por debajo. En verticales como iGaming, donde el interés real del anunciante son las conversiones, el CPM se usa como referencia comparativa pero los contratos suelen basarse en CPA o RevShare. En verticales como hardware gaming, energía, ropa o snacks, el CPM sigue siendo el modelo dominante porque no hay una acción de conversión trazable directa.',
    socialProApplication:
      'SocialPro presenta rangos de CPM comparables por vertical al operador durante la fase de brief para calibrar expectativas de coste antes de firmar. Los pagos reales siempre se contratan sobre modelo CPA o RevShare en iGaming; el CPM es referencia analítica.',
  },
  {
    slug: 'brand-deal',
    name: 'Brand deal',
    alternateName: ['Brand deals', 'Acuerdo de marca', 'Deal de patrocinio'],
    block: 'creator-economy',
    shortDef:
      'Un brand deal es cualquier acuerdo comercial entre una marca y un creador para publicar contenido patrocinado, hacer menciones en directo, aparecer en material publicitario o representar a la marca durante un periodo. Los brand deals van desde patrocinios one-shot (una pieza puntual) hasta contratos anuales con exclusividad sectorial. Son la forma dominante de monetización para creadores mid-tier y top-tier, por encima de los ingresos por publicidad nativa de las plataformas y las suscripciones de audiencia.',
    context:
      'La estructura de un brand deal serio incluye: definición del entregable (número de piezas, duración, plataforma), calendario, KPIs de referencia, cláusulas de exclusividad sectorial (opcional pero frecuente en iGaming), briefing legal, ventanas de revisión previa y modalidad de pago (fijo, variable o mixto). En iGaming los brand deals suelen incluir cláusula de compliance según la que el creador se compromete a respetar el protocolo publicitario aplicable al mercado activado (RD 958/2020 en España, equivalentes LATAM).',
    socialProApplication:
      'SocialPro estructura los brand deals de sus creadores con contrato marco de agencia + anexos por campaña, con visibilidad para el creador y trazabilidad para el operador. El compliance es cláusula, no un anexo opcional.',
  },
  {
    slug: 'media-kit',
    name: 'Media kit',
    alternateName: ['Media kits', 'Kit de prensa del creador', 'Press kit'],
    block: 'creator-economy',
    shortDef:
      'Un media kit de creador es el documento —habitualmente un PDF o página web— que resume las métricas verificables, el perfil de audiencia, los patrocinios previos y las tarifas de referencia de un streamer para uso comercial de marcas y agencias. Incluye datos de plataforma (viewers medios, seguidores, engagement rate), demografía de audiencia (idioma, país, edad, género), verticales de contenido y ejemplos de activaciones anteriores. Es la carta de presentación estándar del creator marketing.',
    context:
      'La calidad de un media kit revela mucho: los que se limitan a "seguidores totales" son señal de que no hay dato real detrás; los que aportan datos segmentados con fuente citada (Twitch dashboard, YouTube Studio, Streamlabs) permiten a la marca tomar decisiones fundadas. Un media kit serio de un creador en iGaming o skins debe incluir además la política de compliance del creador (edad verificable, historial limpio de sanciones, entendimiento del RD 958/2020) porque el operador es corresponsable del contenido patrocinado y no puede firmar sin esta información.',
    socialProApplication:
      'SocialPro mantiene media kits actualizados de todo su roster y los comparte con el operador durante la fase de preselección, con permisos de acceso limitado por proyecto y con métricas siempre extraídas del panel oficial de cada plataforma.',
  },
];

/** Devuelve una entrada por su slug o `null` si no existe. */
export function getGlossaryTermBySlug(slug: string): GlossaryTerm | null {
  return GLOSSARY_TERMS.find((t) => t.slug === slug) ?? null;
}

/** Agrupa las entradas por bloque, preservando el orden de la lista principal. */
export function getGlossaryByBlock(): Record<GlossaryBlock, readonly GlossaryTerm[]> {
  const out: Record<GlossaryBlock, GlossaryTerm[]> = {
    'iGaming': [],
    'skins-cs2': [],
    'creator-economy': [],
  };
  for (const t of GLOSSARY_TERMS) {
    out[t.block].push(t);
  }
  return out;
}

/** Slugs de todas las entradas (para `generateStaticParams`). */
export function getAllGlossarySlugs(): readonly string[] {
  return GLOSSARY_TERMS.map((t) => t.slug);
}
