/**
 * Configuración estática de marcas para las páginas SEO públicas /marcas/[brandSlug].
 *
 * Para añadir una nueva marca: copiar un objeto de BRANDS_CONFIG y ajustar los campos.
 * El campo `dbName` debe coincidir EXACTAMENTE con el brandName usado en la BD.
 */

import { resolveBrandLogo } from './brandAssets';

export type BrandCategory = 'cs2' | 'casino' | 'apuestas' | 'otros';

export type BrandFaq = { q: string; a: string };

export type BrandConfig = {
  slug:         string;
  name:         string;
  dbName:       string;        // nombre exacto en BD (para filtrar codes/giveaways/winners)
  logoUrl:      string | null;
  officialUrl:  string;
  category:     BrandCategory;
  tagline:      string;        // frase corta para el hero
  description:  string;        // 200-300 palabras de copy SEO
  ctaText:      string;
  faqs:         BrandFaq[];
  isActive:     boolean;
  /** ISO timestamp of an actual editorial check of the listed codes and giveaways. */
  lastVerifiedAt?: string;
};

export const BRANDS_CONFIG: BrandConfig[] = [
  {
    slug:        'keydrop',
    name:        'KeyDrop',
    dbName:      'KEYDROP',
    logoUrl:     resolveBrandLogo('keydrop'),
    officialUrl: 'https://key-drop.com',
    category:    'cs2',
    tagline:     'Información sobre códigos y condiciones de KeyDrop',
    description: `KeyDrop es una plataforma relacionada con skins de CS2 que incluye actividades con resultados aleatorios. Este contenido no garantiza resultados, beneficios ni la disponibilidad de una promoción.

Las condiciones de cada código pueden cambiar. Su presencia en esta página no acredita que el bonus sea superior al del registro directo. Revisa siempre las condiciones oficiales, las restricciones territoriales y los requisitos de edad.

No acreditamos aquí una licencia concreta, cifras de usuarios ni la disponibilidad de métodos de pago o de retirada en una región determinada. El saldo interno de la plataforma no debe confundirse con dinero retirable a una cuenta bancaria.

SocialPro y KeyDrop son entidades diferentes. Algunos enlaces corresponden a relaciones promocionales con creadores; su inclusión no implica que SocialPro sea propietaria de la plataforma ni una garantía de seguridad.`,
    ctaText:     'Consultar web oficial',
    faqs: [
      { q: '¿Qué bonus da el código de KeyDrop?', a: 'El bonus depende del código y de la promoción vigente. Consulta el porcentaje mostrado junto a cada código antes de registrarte, ya que KeyDrop puede modificar las condiciones.' },
      { q: '¿Es seguro KeyDrop?', a: 'No podemos garantizar la seguridad de la plataforma ni acreditar aquí una licencia concreta. Las actividades con resultados aleatorios pueden causar pérdidas. Consulta las condiciones oficiales y las restricciones aplicables en tu país. Contenido exclusivo para mayores de 18 años.' },
      { q: '¿Las condiciones son iguales para cuentas nuevas y existentes?', a: 'Los requisitos dependen de la promoción vigente. No presupongas que un código es válido para todas las cuentas; consulta sus condiciones oficiales.' },
      { q: '¿Qué significa retirar skins en KeyDrop?', a: 'Las skins disponibles pueden enviarse al inventario de Steam mediante una oferta de intercambio, cumpliendo los requisitos de retirada de KeyDrop. Si vendes una skin dentro de la plataforma, recibes saldo interno de KeyDrop. Consulta siempre las condiciones vigentes antes de utilizar el servicio.' },
      { q: '¿Un código de creador garantiza un bonus superior al registro directo?', a: 'No. No disponemos de una comparación verificada que permita afirmar una ventaja general frente al registro directo. Las condiciones dependen de cada promoción.' },
    ],
    isActive: true,
  },
  {
    slug:        'hellcase',
    name:        'Hellcase',
    dbName:      'Hellcase',
    logoUrl:     resolveBrandLogo('hellcase'),
    officialUrl: 'https://hellcase.com',
    category:    'cs2',
    tagline:     'Abre cajas de skins CS2 con bono exclusivo',
    description: `Hellcase es una plataforma de apertura de cajas de CS2 con presencia global y una comunidad hispanohablante muy activa. Se diferencia por su diseño visual cuidado, el sistema de contratos (donde puedes cambiar varias skins por una de mayor valor) y sus cajas temáticas con drops de skins de alta rareza.

La plataforma tiene un sistema de afiliados que permite a los creadores de contenido ofrecer bonos de bienvenida exclusivos a su comunidad. Cuando te registras con el código de un streamer de SocialPro, accedes a crédito adicional o cajas gratuitas que no están disponibles en el registro directo.

Hellcase actualiza periódicamente su catálogo de cajas con temáticas de torneos, colecciones CS2 recientes y eventos especiales. Los precios van desde menos de un euro hasta cajas premium con skins de varios cientos de euros. El sistema de previsualización muestra las probabilidades exactas de cada skin antes de abrir.

Los streamers de SocialPro que trabajan con Hellcase son creadores especializados en CS2 cuya audiencia ya conoce y usa este tipo de plataformas. Las campañas están gestionadas con compliance de juego responsable y mensajes de +18 integrados en cada integración.`,
    ctaText:     'Usar código en Hellcase',
    faqs: [
      { q: '¿Qué diferencia Hellcase de otras plataformas de cajas?', a: 'Hellcase destaca por su sistema de contratos (cambiar varias skins por una de mayor valor), sus cajas temáticas actualizadas y una interfaz con probabilidades visibles. También tiene modo battle y upgrade de skins.' },
      { q: '¿Cuánto da el bonus de bienvenida de Hellcase?', a: 'El bonus varía según la campaña. Habitualmente entre un 5% y un 10% de crédito adicional en el primer depósito, o una caja gratuita. El código del creador especifica el bonus concreto en cada momento.' },
      { q: '¿Hellcase tiene licencia de juego?', a: 'Hellcase opera bajo legislación de Curazao. Como cualquier plataforma de skins, está destinada a mayores de 18 años y recomendamos consultar su política de juego responsable antes de depositar.' },
      { q: '¿Puedo retirar en euros desde Hellcase?', a: 'Hellcase permite retirar saldo a través de varios métodos según región: tarjeta, Skrill, criptomonedas y otros. Los skins también pueden venderse internamente para obtener saldo retirable.' },
      { q: '¿Qué tipos de cajas tiene Hellcase?', a: 'Tiene cajas temáticas propias (no las oficiales de Valve), cajas battle con otro jugador y modo upgrade. Las probabilidades de cada skin aparecen antes de abrir, cumpliendo con los estándares de transparencia.' },
    ],
    isActive: true,
  },
  {
    slug:        'skinplace',
    name:        'Skinplace',
    dbName:      'Skinplace',
    logoUrl:     resolveBrandLogo('skinplace'),
    officialUrl: 'https://skinplace.gg',
    category:    'cs2',
    tagline:     'Compra y vende skins CS2 con código bonus',
    description: `Skinplace es un marketplace de compra y venta de skins de CS2 donde los precios los fijan los vendedores en un mercado abierto, generando oportunidades de compra por debajo del precio de mercado de Steam. A diferencia de las plataformas de cajas, Skinplace te permite comprar skins concretas sin depender del azar.

La plataforma acepta Steam, tarjeta y criptomonedas. Los vendedores pueden listar sus skins directamente desde su inventario de Steam y los compradores reciben los ítems directamente en su cuenta. El sistema de escrow y verificación de Skinplace asegura transacciones seguras sin riesgo de fraude.

El código de referido de los creadores de SocialPro te da un descuento o crédito adicional en tus primeras compras en Skinplace. Es especialmente útil si estás buscando una skin específica a un precio competitivo: el bonus te permite obtenerla con un coste reducido.

Skinplace es también una opción popular para vender skins rápidamente sin esperar los periodos de hold de Steam: los pagos se realizan de forma casi inmediata una vez cerrada la transacción. Los creadores de CS2 de SocialPro usan esta plataforma habitualmente para sus propias transacciones de skins, lo que hace que su recomendación sea genuina y basada en experiencia real.`,
    ctaText:     'Comprar skins con descuento',
    faqs: [
      { q: '¿Qué es Skinplace?', a: 'Skinplace es un marketplace peer-to-peer de skins de CS2 donde compradores y vendedores fijan el precio. Permite comprar skins concretas a precios competitivos, a diferencia de las plataformas de cajas donde el resultado es aleatorio.' },
      { q: '¿Cómo funciona el código de Skinplace?', a: 'El código de referido del creador te da un descuento porcentual o crédito en tus primeras compras. Se introduce durante el registro o en la sección de bonos de tu perfil.' },
      { q: '¿Es seguro comprar en Skinplace?', a: 'Skinplace usa un sistema de escrow y verificación de inventario para asegurar que las skins existen y el vendedor puede transferirlas. Las transacciones están protegidas contra fraude.' },
      { q: '¿Cuánto tarda en llegar una skin comprada en Skinplace?', a: 'Las skins llegan directamente a tu cuenta de Steam en minutos desde que se confirma el pago. El proceso es automático una vez que el vendedor aprueba la transacción.' },
      { q: '¿Puedo vender mis skins en Skinplace?', a: 'Sí. Puedes listar tus skins de CS2 desde tu inventario de Steam y fijar el precio. El pago llega a tu cuenta de Skinplace y puedes retirarlo por los métodos disponibles.' },
    ],
    isActive: true,
  },
  {
    slug:        'skinsmonkey',
    name:        'SkinsMonkey',
    dbName:      'SkinsMonkey',
    logoUrl:     resolveBrandLogo('skinsmonkey'),
    officialUrl: 'https://skinsmonkey.com',
    category:    'cs2',
    tagline:     'Intercambia skins CS2 con el mejor ratio',
    description: `SkinsMonkey es la plataforma de trading (intercambio) de skins de CS2 más conocida entre la comunidad hispanohablante, con más de 200.000€ en volumen de transacciones generadas a través de los creadores de SocialPro. Permite intercambiar skins de tu inventario de Steam por otras de igual o mayor valor sin necesidad de pasar por efectivo.

El sistema de SkinsMonkey calcula automáticamente el valor de cada skin y te ofrece las combinaciones posibles de intercambio. Si quieres una skin que vale 50€ y tienes varias skins pequeñas que suman ese valor, puedes intercambiarlas directamente. Esto es especialmente útil para acumular varias skins de menor valor y convertirlas en una sola de mayor calidad.

Los códigos de referido de los creadores de SocialPro en SkinsMonkey dan bonus de crédito adicional o ratio mejorado de intercambio. En la campaña de SocialPro con SkinsMonkey, los creadores generaron 200.000€ en volumen de trading verificado directamente en la plataforma, con datos auditados por el equipo de SkinsMonkey.

SkinsMonkey también tiene modo de venta directa (cash out) donde puedes vender tus skins y recibir pago por Paypal, criptomoneda u otros métodos. La plataforma actualiza los precios de referencia múltiples veces al día basándose en el precio de mercado de Steam y otras referencias.`,
    ctaText:     'Intercambiar skins con bonus',
    faqs: [
      { q: '¿Qué es SkinsMonkey?', a: 'SkinsMonkey es una plataforma de intercambio (trade) de skins de CS2. Puedes cambiar tus skins por otras del mismo valor o pagar la diferencia para obtener una de mayor valor, sin necesidad de efectivo.' },
      { q: '¿Qué bonus da el código de SkinsMonkey?', a: 'El código de referido de nuestros creadores da crédito extra o un ratio de intercambio mejorado. El bonus concreto aparece al introducir el código durante el registro.' },
      { q: '¿Cómo valora SkinsMonkey mis skins?', a: 'SkinsMonkey usa precios de referencia del mercado de Steam y otras plataformas, actualizados varias veces al día. El valor mostrado puede diferir ligeramente del precio de Steam Community Market.' },
      { q: '¿Puedo retirar dinero en efectivo en SkinsMonkey?', a: 'Sí, SkinsMonkey tiene modo cash out donde vendes tus skins y recibes pago por PayPal, criptomoneda u otros métodos según tu región.' },
      { q: '¿Cuánto tardaron en generarse los 200.000€ de volumen con SocialPro?', a: 'En una campaña de 6 semanas con creadores de CS2 gestionados por SocialPro, el volumen de trading atribuido directamente fue de 200.000€, verificado desde el panel de la plataforma SkinsMonkey.' },
    ],
    isActive: true,
  },
];

export function getBrandBySlug(slug: string): BrandConfig | undefined {
  return BRANDS_CONFIG.find((b) => b.slug === slug && b.isActive);
}

export function getBrandSlugs(): string[] {
  return BRANDS_CONFIG.filter((b) => b.isActive).map((b) => b.slug);
}
