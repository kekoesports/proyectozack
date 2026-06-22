/**
 * Inserta el Contrato Marco de Representación de Creadores de Contenido (ElevateX)
 * como template de tipo 'general' en la BD.
 * Ejecutar una sola vez: npx tsx scripts/seed-representacion-template.ts
 *
 * Variables a rellenar por contrato:
 *   {{today}}               — fecha de firma
 *   {{influencer_name}}     — nombre completo del creador (D./Dª ...)
 *   {{influencer_id}}       — DNI / NIE / Pasaporte
 *   {{influencer_address}}  — domicilio del creador
 *   {{influencer_alias}}    — alias/nombre profesional (para firma)
 *
 * El resto del texto es 100% fijo (cláusulas, porcentajes, plazos).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { contractTemplates } from '../src/db/schema/contractTemplates';
import { eq } from 'drizzle-orm';

// Cargar .env.local
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* ok */ }

const TEMPLATE_NAME = 'Contrato Marco de Representación — Creador (ElevateX)';

const CONTENT = `CONTRATO MARCO DE REPRESENTACIÓN DE CREADORES DE CONTENIDO
ELEVATEX AGENCY PA, S.L.

En Córdoba, España, a {{today}}.

REUNIDOS

De una parte, D. Pablo Camacho Carrión, mayor de edad, con DNI nº 45889772B, actuando en nombre y representación de la mercantil ELEVATEX AGENCY PA, S.L., con domicilio social en Calle Teruel 19, 3º3, 14011 Córdoba, España, y CIF B21821046, en su condición de administrador y con facultades suficientes para este acto, en adelante, "la Agencia".

Y de otra parte, D./Dª {{influencer_name}}, mayor de edad, con DNI/NIE/Pasaporte nº {{influencer_id}}, con domicilio en {{influencer_address}}, actuando en nombre e interés propio, en adelante, "el Creador".

La Agencia y el Creador, conjuntamente, podrán ser denominados las "Partes", y cada una de ellas, individualmente, la "Parte".

Ambas Partes, reconociéndose recíprocamente capacidad legal suficiente para obligarse y contratar, a tal efecto,

EXPONEN

I. Que la Agencia desarrolla una actividad profesional consistente en la representación, intermediación, negociación, coordinación, formalización y seguimiento de acuerdos comerciales, publicitarios y promocionales con creadores de contenido, influencers, streamers, youtubers y perfiles análogos.

II. Que el Creador desarrolla de forma habitual actividades de creación y difusión de contenidos a través de plataformas digitales, redes sociales, canales audiovisuales, servicios de streaming o cualquier otro medio de difusión online o híbrido, contando con una comunidad, audiencia o capacidad de prescripción susceptible de explotación comercial.

III. Que el Creador está interesado en encomendar a la Agencia la representación comercial exclusiva dentro de un sector concreto de actividad, en los términos previstos en el presente contrato, conservando libertad para gestionar por sí o por medio de terceros aquellas colaboraciones ajenas a dicho sector exclusivo.

IV. Que ambas Partes desean regular su relación profesional, sus derechos y obligaciones recíprocas, así como el régimen económico aplicable, dejando constancia expresa de que el presente contrato tiene naturaleza mercantil y de prestación de servicios de representación e intermediación comercial, sin que exista entre las Partes relación laboral, societaria, de agencia exclusiva general ni vínculo de dependencia distinto del expresamente pactado.

En virtud de cuanto antecede, las Partes suscriben el presente Contrato Marco de Representación y Gestión Comercial de Creadores de Contenido, que se regirá por las siguientes:

CLÁUSULAS

PRIMERA. OBJETO DEL CONTRATO

1.1. El Creador otorga a la Agencia, que acepta, la representación comercial exclusiva para la localización, prospección, presentación, negociación, intermediación, cierre, coordinación, seguimiento y, en su caso, renovación de acuerdos comerciales dentro del sector de:

- loot boxes,
- gambling sites,
- casinos,
- casas de apuestas,
- plataformas de juego de azar o análogas,
- operadores, marcas, afiliados, intermediarios o campañas vinculadas directa o indirectamente a dichos sectores.

1.2. La exclusividad conferida a la Agencia comprende, a título meramente enunciativo y no limitativo:

a) campañas publicitarias puntuales o recurrentes;
b) acuerdos de patrocinio;
c) acciones promocionales en directo o diferido;
d) menciones, integraciones, patrocinios, activaciones o colaboraciones;
e) programas de afiliación;
f) acuerdos basados en CPA, CPL, CPC, revenue share o modelos híbridos;
g) uso de códigos promocionales, enlaces personalizados, tracking links, landing pages, cupones o sistemas equivalentes;
h) acuerdos cerrados directamente con marcas o indirectamente a través de agencias, brokers, afiliados, managers, terceros intermediarios o personas interpuestas.

1.3. Las colaboraciones, campañas o acuerdos comerciales ajenos al sector indicado en el apartado 1.1 podrán ser gestionados libremente por el Creador, por sí mismo o por terceros, siempre que:

a) no entren materialmente en el ámbito sectorial exclusivo aquí pactado;
b) no interfieran en la correcta ejecución de campañas gestionadas por la Agencia; y
c) no perjudiquen los intereses comerciales, reputacionales o estratégicos de la Agencia respecto de sus clientes.

1.4. El presente contrato tiene carácter marco, por lo que las campañas concretas podrán desarrollarse mediante correos electrónicos, mensajes escritos, briefs, anexos, documentos de encargo, hojas de condiciones o cualquier otro medio fehaciente que permita acreditar el contenido del acuerdo puntual.

---

SEGUNDA. NATURALEZA DE LA RELACIÓN

2.1. Las Partes reconocen expresamente que la relación derivada de este contrato tiene naturaleza estrictamente mercantil, no existiendo relación laboral, de alta dirección, sociedad, comunidad de bienes, mandato general, asociación ni ninguna otra distinta de la expresamente pactada.

2.2. El Creador mantendrá plena autonomía en la organización de su actividad, horarios, medios materiales, forma de producción de contenidos y estructura empresarial o profesional, sin perjuicio de las obligaciones asumidas respecto de las campañas aceptadas y del régimen de exclusividad sectorial pactado.

2.3. La Agencia actuará como representante e intermediaria comercial en el ámbito descrito, sin asumir obligaciones fiscales, laborales, contables o de Seguridad Social del Creador, que corresponderán exclusivamente a este último.

---

TERCERA. DURACIÓN Y ENTRADA EN VIGOR

3.1. El presente contrato entrará en vigor en la fecha de su firma y tendrá una duración inicial de un (1) año.

3.2. Llegado su vencimiento inicial, el contrato se entenderá automáticamente prorrogado por periodos sucesivos de un (1) año, salvo que cualquiera de las Partes notifique a la otra su voluntad de no renovarlo con un preaviso mínimo de treinta (30) días naturales respecto de la fecha de vencimiento o de cualquiera de sus prórrogas.

3.3. La finalización del contrato, por cualquier causa, no afectará a:

a) campañas ya aceptadas y pendientes de ejecución o liquidación;
b) derechos económicos devengados o pendientes de devengo respecto de acuerdos cerrados durante la vigencia del contrato;
c) obligaciones de confidencialidad, no captación, uso de imagen ya autorizado, no elusión y demás previsiones que, por su naturaleza, deban subsistir tras su terminación.

---

CUARTA. EXCLUSIVIDAD SECTORIAL Y DEBER DE CANALIZACIÓN

4.1. Durante la vigencia del contrato, el Creador se obliga a no aceptar, negociar, formalizar, ejecutar ni renovar, por sí mismo ni por medio de terceros, ningún acuerdo comprendido en el sector exclusivo definido en la cláusula primera sin la participación, conocimiento y autorización previa de la Agencia.

4.2. A estos efectos, el Creador se obliga a canalizar a través de la Agencia cualquier propuesta, contacto, ofrecimiento o manifestación de interés que reciba, directa o indirectamente, relativa al sector exclusivo, aunque:

a) le contacte la marca directamente;
b) el contacto provenga de una agencia tercera;
c) se produzca a través de Discord, Telegram, correo electrónico, Instagram, X, Twitch, YouTube, Kick u otras plataformas;
d) se plantee como simple "test", afiliación, revenue share, colaboración informal o sin contrato escrito.

4.3. La exclusividad alcanzará igualmente a acuerdos formalizados a nombre de terceras personas, empresas interpuestas, managers, familiares, sociedades vinculadas o cuentas distintas del Creador, cuando el beneficiario real, directo o indirecto, sea el propio Creador o la oportunidad proceda de su actividad como creador de contenido.

4.4. El incumplimiento de esta obligación facultará a la Agencia para exigir:

a) el pago íntegro de la comisión que hubiera correspondido;
b) la indemnización de daños y perjuicios adicionales acreditados; y/o
c) la resolución anticipada del contrato.

---

QUINTA. GESTIÓN DE OPORTUNIDADES Y DEFINICIÓN DE CLIENTE DE LA AGENCIA

5.1. Toda oportunidad comercial comprendida dentro del sector exclusivo se considerará incluida en el ámbito de gestión de la Agencia.

5.2. A efectos del presente contrato, se entenderá por "cliente de la Agencia" toda empresa, marca, operador, plataforma, anunciante, afiliado, agencia, intermediario o entidad que haya sido:

a) presentada al Creador por la Agencia;
b) contactada por la Agencia en relación con el Creador;
c) gestionada, negociada o desarrollada por la Agencia; o
d) puesta en conocimiento del Creador por la Agencia, aunque el acuerdo definitivo se cierre posteriormente sin intervención directa visible de esta.

5.3. Se presumirá, salvo prueba en contrario, que existe intervención de la Agencia cuando el contacto, negociación, propuesta o relación comercial tenga su origen en gestiones, presentaciones o acciones comerciales iniciadas por la Agencia durante la vigencia del contrato.

5.4. El Creador se obliga a no eludir a la Agencia mediante contactos directos con clientes de la misma, ni a reconducir dichas oportunidades a través de terceros con el fin de evitar el pago de comisiones.

---

SEXTA. OBLIGACIONES DE LA AGENCIA

La Agencia asumirá, dentro del ámbito de este contrato, las siguientes obligaciones principales:

a) realizar labores de prospección y captación de oportunidades comerciales;
b) presentar el perfil del Creador ante potenciales clientes;
c) negociar, dentro de lo razonable, las condiciones económicas y operativas de las campañas;
d) coordinar con el Creador la ejecución de las campañas aceptadas;
e) servir de canal principal de comunicación comercial dentro del sector exclusivo;
f) asistir, cuando proceda, en la organización general de la colaboración y seguimiento del cumplimiento de entregables;
g) mantener informado al Creador sobre propuestas relevantes, estado de negociaciones y condiciones esenciales de los acuerdos.

La Agencia no garantiza un número mínimo de campañas, ingresos, marcas, conversiones o resultados económicos.

---

SÉPTIMA. OBLIGACIONES DEL CREADOR

7.1. El Creador se obliga a colaborar de buena fe con la Agencia y, en particular, a:

a) responder en un plazo razonable a las propuestas relevantes que se le remitan;
b) facilitar la información necesaria para la presentación de su perfil comercial;
c) comunicar con veracidad sus métricas, disponibilidad, limitaciones y condiciones;
d) ejecutar adecuadamente las campañas aceptadas;
e) respetar las instrucciones, briefs, timing y condiciones acordadas con cada cliente, siempre que no resulten abusivas, ilícitas o contrarias a la actividad habitual del Creador;
f) no negociar directamente con clientes del sector exclusivo al margen de la Agencia;
g) informar sin demora de cualquier contacto comercial, incidencia, retraso, imposibilidad de ejecución o conflicto que afecte a una campaña.

7.2. El Creador responderá frente a la Agencia por los perjuicios causados por falsedad en la información proporcionada, incumplimientos injustificados, ausencia de colaboración o actuaciones dolosas o gravemente negligentes que perjudiquen una negociación o campaña.

---

OCTAVA. RÉGIMEN ECONÓMICO Y HONORARIOS DE LA AGENCIA

8.1. Como contraprestación por los servicios de representación, intermediación y gestión comercial prestados por la Agencia, esta tendrá derecho a percibir una comisión general del quince por ciento (15%) sobre el total bruto generado por cada acuerdo comprendido en el ámbito de exclusividad.

8.2. No obstante, las Partes podrán pactar por escrito, para campañas o acuerdos concretos, un porcentaje distinto comprendido entre el quince por ciento (15%) y el veinticinco por ciento (25%), atendiendo, entre otros factores, a:

a) la complejidad de la operación;
b) el tipo de campaña;
c) el volumen económico;
d) la intervención efectiva de la Agencia;
e) la existencia de servicios adicionales asociados.

8.3. A efectos del presente contrato, se entenderá por "importe bruto generado" toda cantidad, ventaja económica o contraprestación dineraria o valorable económicamente derivada directa o indirectamente del acuerdo, incluyendo, entre otros:

a) fees fijos;
b) mensualidades;
c) pagos por entregable;
d) CPA, CPL, CPC o métricas equivalentes;
e) revenue share;
f) afiliación;
g) bonus;
h) renovaciones;
i) extensiones del acuerdo;
j) pagos efectuados a través de terceros;
k) pagos en criptomonedas, stablecoins o activos digitales;
l) cualquier fórmula híbrida o mixta.

8.4. Salvo pacto distinto por escrito, la comisión de la Agencia se devengará desde el momento en que el acuerdo comercial quede aceptado o cerrado, aunque el pago de la marca al Creador, o a la estructura designada por este, se produzca con posterioridad.

8.5. Cuando la naturaleza del acuerdo implique liquidaciones variables o sucesivas en el tiempo, como en casos de afiliación, CPA o revenue share, la comisión se aplicará sobre cada liquidación efectivamente generada.

---

NOVENA. INGRESOS RECURRENTES, AFILIACIÓN Y REVENUE SHARE POSTERIORES A LA TERMINACIÓN

9.1. La Agencia conservará el derecho a percibir su comisión correspondiente sobre todos los ingresos derivados de acuerdos cerrados, negociados, presentados o iniciados durante la vigencia del contrato, incluso aunque dichos ingresos se liquiden o perciban con posterioridad a su terminación.

9.2. En particular, cuando el acuerdo incluya sistemas de:

a) afiliación;
b) revenue share;
c) CPA;
d) comisiones por usuario captado;
e) ingresos recurrentes; o
f) cualquier otro modelo de monetización continuada,

la Agencia mantendrá el derecho a su porcentaje durante los seis (6) meses siguientes a la fecha de finalización del contrato, siempre que dichos ingresos traigan causa de acuerdos originados durante la vigencia de la relación.

9.3. El Creador se obliga a facilitar a la Agencia, cuando esta lo requiera razonablemente, la información necesaria para verificar las liquidaciones devengadas por dichos conceptos, incluyendo capturas, paneles, liquidaciones, justificantes o documentación equivalente.

9.4. La ocultación, desvío o falseamiento de ingresos procedentes de afiliación, revenue share o fórmulas análogas facultará a la Agencia para reclamar la comisión correspondiente, junto con los daños y perjuicios causados.

---

DÉCIMA. FORMA DE PAGO, FACTURACIÓN Y OBLIGACIONES FISCALES

10.1. Los pagos de los acuerdos podrán articularse por transferencia bancaria, pasarela de pago, criptomonedas o cualquier otro medio admitido por las Partes y por la normativa aplicable.

10.2. Cuando el pago se efectúe en criptomonedas o activos digitales, se tomará como referencia, salvo pacto en contrario, el valor equivalente en euros en la fecha y hora de recepción efectiva.

10.3. El Creador será el único responsable del cumplimiento de sus obligaciones fiscales, contables, laborales, mercantiles o de Seguridad Social derivadas de los ingresos percibidos, exonerando a la Agencia de cualquier responsabilidad por incumplimientos propios del Creador en dicha materia.

10.4. Cuando por razones operativas la Agencia adelante, reciba, canalice o intermedie pagos, ello no alterará la naturaleza mercantil de la relación ni supondrá asunción de responsabilidad fiscal ajena, sin perjuicio del deber de liquidación y transparencia entre las Partes.

---

DÉCIMA PRIMERA. SERVICIOS ADICIONALES

11.1. La Agencia podrá prestar o coordinar, a favor del Creador, servicios adicionales complementarios a su actividad, tales como:

a) edición de vídeo;
b) diseño de miniaturas;
c) apoyo creativo;
d) asesoramiento estratégico;
e) revisión de propuestas;
f) coordinación con terceros proveedores.

11.2. Salvo pacto distinto, dichos servicios no se entenderán incluidos gratuitamente en la comisión ordinaria de representación cuando impliquen un coste externo o una dedicación extraordinaria.

11.3. La Agencia podrá asumir inicialmente dichos costes y repercutirlos al Creador mediante descuento en la siguiente liquidación o en futuros ingresos generados, previa comunicación razonable del concepto y cuantía.

---

DÉCIMA SEGUNDA. CONFIDENCIALIDAD

12.1. Ambas Partes se obligan a guardar absoluta reserva y confidencialidad sobre cuanta información conozcan con ocasión de la presente relación contractual, incluyendo, sin carácter limitativo:

a) campañas;
b) condiciones económicas;
c) porcentajes de comisión;
d) estrategias comerciales;
e) contactos;
f) clientes;
g) documentación contractual;
h) métricas;
i) procesos internos;
j) cualquier otra información sensible o no pública.

12.2. La obligación de confidencialidad permanecerá vigente durante la vigencia del contrato y con posterioridad a su terminación por tiempo indefinido o, subsidiariamente, mientras la información mantenga carácter no público.

12.3. Quedan exceptuadas de esta obligación:

a) las informaciones que deban revelarse por mandato legal o requerimiento de autoridad competente;
b) las que ya fueran públicas sin infracción de este contrato;
c) las que deban comunicarse a asesores profesionales bajo deber de secreto.

12.4. El incumplimiento de esta cláusula facultará a la Parte perjudicada para reclamar los daños y perjuicios efectivamente causados, sin perjuicio de la resolución contractual si procediera.

---

DÉCIMA TERCERA. USO DE IMAGEN, PROMOCIÓN Y GESTIÓN DE COMUNICACIONES

13.1. El Creador autoriza expresamente a la Agencia, durante la vigencia del contrato, a utilizar su nombre, alias, imagen, voz, logotipos, perfiles sociales, fragmentos de contenido y referencias profesionales con fines comerciales, promocionales y publicitarios relacionados con la actividad de la Agencia.

13.2. Dicha autorización comprenderá, entre otros usos:

a) publicaciones en redes sociales;
b) materiales promocionales y comerciales;
c) dossiers, decks o presentaciones a clientes;
d) inclusión en la página web o portfolio de la Agencia;
e) anuncios o comunicaciones públicas de incorporación del Creador a la cartera de talentos de la Agencia;
f) campañas de captación de marcas, anunciantes o nuevos talentos.

13.3. El Creador autoriza a la Agencia a anunciar públicamente que forma parte de su cartera de talentos o representados.

13.4. La Agencia gestionará un correo electrónico profesional o comercial asociado al Creador como canal principal para la recepción de propuestas comerciales y contactos de negocio, especialmente dentro del sector exclusivo.

13.5. El Creador se obliga a:

a) utilizar dicho correo como canal profesional principal o preferente;
b) mantener visible dicho correo en sus perfiles, biografías o redes sociales principales;
c) no publicitar, dentro del ámbito comercial cubierto por este contrato, otros canales alternativos de contacto sin conocimiento de la Agencia.

13.6. El Creador se compromete asimismo a colaborar de forma razonable con acciones de visibilidad promovidas por la Agencia, incluyendo, cuando esta lo solicite de manera proporcionada:

a) la mención a la Agencia en perfiles o biografías;
b) la difusión o apoyo puntual a publicaciones de la Agencia dirigidas a la captación de marcas o talentos;
c) la participación razonable en acciones promocionales de la cartera de representados.

13.7. Las obligaciones previstas en esta cláusula deberán ejercerse de manera proporcionada, razonable y compatible con la actividad habitual, imagen pública y posicionamiento del Creador.

---

DÉCIMA CUARTA. NO COMPETENCIA POSTERIOR Y NO ELUSIÓN

14.1. Durante los seis (6) meses siguientes a la terminación del contrato, el Creador no podrá cerrar, ejecutar o renovar directamente, ni por medio de terceros, acuerdos comprendidos en el sector exclusivo con clientes de la Agencia que hayan sido presentados, negociados o gestionados por esta durante la vigencia contractual, sin consentimiento escrito de la Agencia.

14.2. Esta previsión no impide al Creador desarrollar su actividad general, sino únicamente eludir a la Agencia respecto de clientes u oportunidades nacidas de la relación contractual.

14.3. En caso de incumplimiento, la Agencia podrá reclamar la comisión que le hubiera correspondido, además de los daños y perjuicios que procedan.

---

DÉCIMA QUINTA. NO CAPTACIÓN DE TALENTOS Y PROTECCIÓN DE CARTERA

15.1. El Creador se obliga a no sugerir, proponer, facilitar ni intermediar, directa o indirectamente, para que clientes de la Agencia contacten o trabajen al margen de esta con otros talentos pertenecientes a su cartera.

15.2. Esta prohibición se mantendrá durante la vigencia del contrato y durante los seis (6) meses posteriores a su terminación.

15.3. La presente obligación no impedirá colaboraciones entre creadores cuando estas hayan sido previamente autorizadas o coordinadas por la Agencia.

---

DÉCIMA SEXTA. CANCELACIÓN DE CAMPAÑAS Y RESPONSABILIDAD POR INCUMPLIMIENTO

16.1. Una vez aceptada una campaña, colaboración o acuerdo por el Creador, este quedará obligado a su correcta ejecución en los términos pactados.

16.2. Si el Creador cancelase unilateralmente una campaña ya aceptada, o se negase injustificadamente a ejecutarla sin causa debidamente acreditada, vendrá obligado a abonar a la Agencia una penalización mínima equivalente al cincuenta por ciento (50%) del valor total del acuerdo, sin perjuicio de los daños y perjuicios adicionales que pudieran acreditarse.

16.3. No se considerará incumplimiento sancionable cuando la imposibilidad de ejecución derive de:

a) fuerza mayor;
b) enfermedad grave o causa personal justificada;
c) restricciones legales o de plataforma sobrevenidas;
d) exigencias del cliente manifiestamente abusivas, ilícitas o sustancialmente distintas de las inicialmente aceptadas.

16.4. El Creador responderá igualmente de los perjuicios causados por incumplimientos parciales, retrasos graves, entregables defectuosos o conductas que provoquen la pérdida injustificada del cliente o de la campaña.

---

DÉCIMA SÉPTIMA. REPUTACIÓN, BUEN USO Y CONDUCTA PÚBLICA

17.1. Ambas Partes se obligan a actuar de buena fe y a abstenerse de realizar manifestaciones públicas, publicaciones, acusaciones o comportamientos que puedan perjudicar de forma injustificada la imagen, reputación o intereses legítimos de la otra Parte.

17.2. Esta previsión no impedirá el ejercicio legítimo de acciones legales, reclamaciones fundadas o comunicaciones necesarias para la defensa de derechos.

17.3. La vulneración grave de esta cláusula podrá constituir causa de resolución anticipada del contrato, sin perjuicio del derecho a reclamar los daños y perjuicios que correspondan.

---

DÉCIMA OCTAVA. RESOLUCIÓN ANTICIPADA

18.1. El contrato podrá resolverse anticipadamente por cualquiera de las siguientes causas:

a) mutuo acuerdo por escrito;
b) incumplimiento grave o reiterado de las obligaciones esenciales de una de las Partes;
c) imposibilidad legal o material sobrevenida de continuar la relación;
d) fuerza mayor prolongada que haga inviable la ejecución del contrato.

18.2. Se considerarán, entre otros, incumplimientos graves o reiterados del Creador:

a) la ocultación de oportunidades del sector exclusivo;
b) el cierre directo o indirecto de acuerdos eludiendo a la Agencia;
c) la negativa injustificada y repetida a ejecutar campañas aceptadas;
d) la falta de respuesta continuada a comunicaciones relevantes;
e) la ocultación de ingresos por afiliación o revenue share;
f) el incumplimiento grave de obligaciones de confidencialidad.

18.3. La resolución por incumplimiento no exonerará al Creador del pago de comisiones devengadas ni de las obligaciones postcontractuales vigentes.

---

DÉCIMA NOVENA. PROTECCIÓN DE DATOS Y DOCUMENTACIÓN

19.1. Las Partes se comprometen a tratar los datos personales intercambiados con ocasión de la presente relación de conformidad con la normativa aplicable.

19.2. El Creador autoriza a la Agencia a conservar la documentación comercial y contractual necesaria para la correcta gestión de la relación, campañas, liquidaciones y defensa de sus derechos.

---

VIGÉSIMA. NOTIFICACIONES

20.1. Cualquier comunicación relevante entre las Partes podrá realizarse por correo electrónico, mensajería instantánea, documento firmado digitalmente o cualquier medio escrito que permita acreditar razonablemente su envío y contenido.

20.2. A efectos contractuales, se considerarán válidas las comunicaciones remitidas a los datos de contacto facilitados por cada Parte, mientras no se notifique fehacientemente su modificación.

---

VIGÉSIMA PRIMERA. INTEGRIDAD DEL CONTRATO Y MODIFICACIONES

21.1. El presente contrato constituye la totalidad del acuerdo entre las Partes en relación con su objeto, dejando sin efecto cualesquiera pactos, comunicaciones o entendimientos previos de la misma materia.

21.2. Cualquier modificación, ampliación o excepción a lo aquí dispuesto deberá constar por escrito, pudiendo formalizarse mediante anexo, correo electrónico aceptado por ambas Partes o documento digital equivalente.

21.3. La eventual nulidad de alguna cláusula no afectará a la validez del resto del contrato, que permanecerá vigente en todo aquello que resulte jurídicamente posible.

---

VIGÉSIMA SEGUNDA. LEGISLACIÓN APLICABLE Y JURISDICCIÓN

22.1. El presente contrato se regirá e interpretará conforme al Derecho español.

22.2. Para cuantas cuestiones litigiosas pudieran derivarse de la interpretación, cumplimiento, ejecución o resolución del presente contrato, las Partes, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, se someten a los Juzgados y Tribunales de Córdoba, España.

---

Firma

Firma Agencia:                                        Firma Talento:


_______________________________          _______________________________
D. Pablo Camacho Carrión                       {{influencer_name}}
Administrador                                           Alias: {{influencer_alias}}
ELEVATEX AGENCY PA, S.L.
CIF: B21821046`;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

  const sql = neon(url);
  const db  = drizzle(sql);

  // Evitar duplicado
  const existing = await db
    .select({ id: contractTemplates.id })
    .from(contractTemplates)
    .where(eq(contractTemplates.name, TEMPLATE_NAME))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Template "${TEMPLATE_NAME}" ya existe (id=${existing[0]!.id}). No se ha modificado.`);
    return;
  }

  const [row] = await db
    .insert(contractTemplates)
    .values({
      name:        TEMPLATE_NAME,
      type:        'general',
      description: 'Contrato Marco de Representación Comercial Exclusiva (sector gambling/loot boxes/casinos). ElevateX como Agencia, el Creador cede exclusividad sectorial. Comisión 15-25%. Solo cambian los datos del creador (nombre, DNI, domicilio). 22 cláusulas. Derecho español, juzgados de Córdoba.',
      language:    'es',
      content:     CONTENT,
      isActive:    true,
    })
    .returning({ id: contractTemplates.id });

  console.log(`✓ Template insertado con id=${row?.id}`);
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
