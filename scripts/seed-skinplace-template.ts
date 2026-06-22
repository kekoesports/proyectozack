/**
 * Inserta la plantilla base "Advertising Services Agreement" (alineada con Skinplace)
 * como template de tipo 'casino' (CS2 cases / skins) en la BD.
 * Ejecutar una sola vez: npx tsx scripts/seed-skinplace-template.ts
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
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* ok */ }

const TEMPLATE_NAME = 'Advertising Services Agreement — Creator (Skinplace-aligned)';

const CONTENT = `ADVERTISING SERVICES AGREEMENT

Execution Date: {{today}}

This Advertising Services Agreement (the "Agreement") is entered into as of the Execution Date between:

ELEVATEX AGENCY PA SL, a company incorporated under the laws of Spain, CIF: B21821046, with registered office at Calle Teruel 19, 3º3, 14011 Córdoba, Spain (the "Agency"), and

{{influencer_name}}, known professionally as "{{influencer_alias}}", an independent content creator (the "Creator").

Each of the Agency and the Creator is a "Party"; together they are the "Parties."

============================
WHEREAS
============================

A. The Agency manages advertising campaigns on behalf of brand clients (the "Brand") and engages the Creator to deliver the Services defined in this Agreement to promote the Brand's websites and products through the Creator's Social Media Channels.

B. The Creator has the necessary Social Media presence, audience, and skills to deliver the Services as defined herein.

IT IS THEREBY ACCEPTED AND AGREED AS FOLLOWS:

============================
1. DEFINITIONS AND INTERPRETATION
============================

1.1. "Advertising Services" or "Services" — the content creation and promotion services to be delivered by the Creator as set out in Section 2 of this Agreement.

1.2. "Brand" — {{brand_name}}, the brand client on whose behalf the Agency commissions the Services.

1.3. "Business Day" — any calendar day except Saturdays, Sundays, or public holidays in Spain or in the Brand's country of operation.

1.4. "Start Date" — {{start_date}}, the date on which the Creator's obligations under this Agreement commence.

1.5. "End Date" — {{end_date}}, the deadline by which all Services must be fully delivered.

1.6. "Fee" — the total remuneration payable to the Creator as specified in Section 3.

1.7. "Intellectual Property Rights" — patents, inventions, copyrights, trademarks, domain names, trade secrets, know-how, and all other intellectual property rights.

1.8. "Social Media" — any online platform used by the Creator to deliver the Services, including but not limited to Twitch, YouTube, TikTok, Instagram, and X (formerly Twitter).

1.9. "Social Media Channel" — any specific channel operated by the Creator on Social Media platforms used for the delivery of the Services.

1.10. "Trade Marks" — the Brand's product and service names, trademarks, service marks, branding, and logos.

1.11. "EUR" — the euro, which is the primary currency for all payments under this Agreement.

============================
2. SERVICES
============================

2.1. The Creator agrees to deliver the following Advertising Services to the Agency during the period from the Start Date to the End Date:

{{deliverables}}

2.2. The Creator shall deliver the Services personally through their own Social Media Channels. The Creator shall not sub-contract any part of the Services without prior written consent from the Agency.

2.3. The Creator shall submit all advertising materials and content for prior written approval by the Agency before publication. All materials must be submitted at least five (5) Business Days before the intended publication date.

2.4. The Creator shall perform the Services with the highest professional standards and in compliance with all applicable laws, platform policies, advertising disclosure requirements (including mandatory labelling of sponsored content as "#ad", "#publicidad", or equivalent), and any key performance indicators (KPIs) communicated by the Agency in writing.

2.5. The Creator shall not share Brand statistics, campaign data, performance metrics, or any confidential information received under this Agreement with any third party.

2.6. The Creator shall use their best endeavours to promote the Brand's and the Agency's interests throughout the term of this Agreement.

2.7. The Creator acknowledges that the Agency's contractual obligations to the Brand depend on the Creator's timely and compliant delivery of the Services. Any delay or non-compliance by the Creator may expose the Agency to penalties from the Brand, which may be passed on to the Creator in accordance with Section 6 of this Agreement.

2.8. Nothing in this Agreement prevents the Creator from engaging in other business activities during the term, provided such activities do not conflict with any exclusivity obligations agreed under this Agreement.

{{exclusivity}}

============================
3. FEES
============================

3.1. As consideration for the delivery of the Services, the Agency shall pay the Creator a fee of {{total_amount}} EUR (the "Fee").

3.2. {{payment_terms}}

3.3. Payment shall be made by bank transfer to the Creator's bank account as notified to the Agency in writing. The Creator shall provide a valid invoice in accordance with applicable Spanish legislation prior to payment.

3.4. The Fee is all-inclusive and covers all costs incurred by the Creator in delivering the Services, including production, equipment, travel, and platform fees.

3.5. At the Agency's sole discretion and upon mutual written agreement, part of the Fee may be provided in the form of credits or non-monetary consideration of equivalent value from the Brand.

3.6. The Agency may withhold or delay payment if the Creator's invoice does not comply with applicable legislation or the Agency's reasonable invoicing requirements, until the invoice is corrected.

============================
4. TRADE MARK LICENCE
============================

4.1. The Agency grants the Creator a non-exclusive, non-transferable, royalty-free licence for the duration of this Agreement to use the Trade Marks solely for the purpose of delivering the Services.

4.2. The Creator acknowledges that they will not acquire any right, title, or interest in the Trade Marks or associated goodwill. The Creator shall not use the Trade Marks for any purpose other than as permitted under this Agreement.

4.3. Upon termination or expiry of this Agreement, the Creator shall immediately cease all use of the Trade Marks and remove them from any materials, media, or digital content, unless otherwise permitted in writing by the Agency.

4.4. All content, creative materials, videos, scripts, graphics, and any other intellectual property created by the Creator in connection with the Services shall be owned exclusively by the Agency (and/or the Brand as directed by the Agency) upon payment of the Fee. The Creator hereby irrevocably assigns to the Agency all rights, title, and interest in and to any such work product.

============================
5. WARRANTIES
============================

5.1. The Creator represents and warrants that:

5.1.1. They have full legal capacity and authority to enter into and perform this Agreement and that the Agreement constitutes a valid and binding obligation on them.

5.1.2. The performance of this Agreement does not and will not conflict with any other agreement, obligation, or arrangement to which the Creator is a party.

5.1.3. They hold all necessary rights, licences, and permissions to use any third-party materials in providing the Services, and such use will not infringe any third-party intellectual property or other rights.

5.1.4. They will conduct all Services in compliance with applicable laws, advertising standards, regulatory requirements, and platform policies, protecting the Agency's and Brand's interests and reputation.

5.1.5. Their Social Media Channels are authentic, and audience metrics have not been artificially inflated through bots, purchased followers, or other inauthentic means.

5.1.6. They will not make any false, misleading, or defamatory statements about the Brand, the Agency, or their products and services.

5.1.7. They will immediately inform the Agency of any legal, regulatory, or reputational issues that could affect the performance of this Agreement.

5.2. The Agency represents and warrants that:

5.2.1. It is a legal entity duly incorporated and validly existing under the laws of Spain, with all necessary authority to enter into and perform this Agreement.

5.2.2. It will provide the Creator with all materials, brand guidelines, permissions, and approvals reasonably required to perform the Services without undue delay.

5.3. Both Parties agree to cooperate in good faith to resolve any issues that may arise during the term of this Agreement.

============================
6. PENALTIES
============================

6.1. If the Creator fails to deliver all Services by the End Date, the following consequences shall apply.

6.2. The Creator shall, within three (3) Business Days of the End Date, reimburse the Agency the pro-rata portion of the Fee attributable to the Services that were not delivered.

6.3. In addition to the reimbursement in clause 6.2, the Creator shall pay the Agency a penalty equal to 10% of the amount attributable to the undelivered Services.

6.4. This clause shall not apply if the Creator requests a pause of the Services for a reasonable period and the Agency approves such a request in writing, in which case the End Date shall be extended accordingly.

6.5. If the Creator terminates this Agreement early without cause, the Creator shall pay the Agency a penalty of 25% of the total Fee within three (3) Business Days of the Agency's written demand.

6.6. If any agreed content is not published within the specified timeframe, the Creator shall pay the Agency a penalty of 20% of the total Fee for each week of delay. If the delay exceeds 30 calendar days, the Agency may terminate this Agreement and demand a full refund of any sums already paid.

6.7. The Parties acknowledge that penalties under this Section reflect the Agency's potential exposure to equivalent penalties from the Brand under the Agency's agreement with the Brand.

============================
7. TERM AND TERMINATION
============================

7.1. This Agreement commences on the Start Date and continues until the End Date, unless terminated earlier in accordance with this Section.

7.2. Either Party may terminate this Agreement immediately by written notice if the other Party commits a material breach and fails to remedy it within ten (10) Business Days of written notice specifying the breach.

7.3. The Agency may terminate this Agreement for convenience by giving at least thirty (30) calendar days' written notice to the Creator. In such case, the Agency shall pay the Creator for Services properly and verifiably rendered up to the termination date.

7.4. This Agreement shall automatically renew for an additional period of the same duration unless either Party provides written notice of non-renewal at least thirty (30) calendar days before expiry.

7.5. If the Creator becomes unable to provide the Services due to circumstances beyond their control (force majeure), they must notify the Agency in writing as soon as possible and in any event within five (5) Business Days of becoming aware of such circumstances.

============================
8. INDEMNITIES
============================

8.1. The Creator shall indemnify and hold harmless the Agency from and against any claims, losses, damages, costs (including reasonable legal costs), or liabilities arising from:
(a) any breach by the Creator of this Agreement;
(b) any negligent, reckless, or wilful act or omission of the Creator in delivering the Services;
(c) any infringement of third-party intellectual property or other rights by the Creator;
(d) any false or misleading statements made by the Creator about the Brand.

8.2. The Agency's indemnification obligation under this clause is capped at the total Fee paid to the Creator under this Agreement, except in cases of wilful misconduct or gross negligence.

8.3. In the event of a claim, both Parties agree to cooperate fully and provide all necessary assistance, documentation, and representation.

8.4. The Agency reserves the right to offset any indemnification amounts due from the Creator against any outstanding payments owed to the Creator under this Agreement.

============================
9. CONFIDENTIALITY
============================

9.1. Each Party shall keep confidential all information of a secret or confidential nature concerning the other Party's business, the terms of this Agreement, Brand data, campaign results, and statistics, and shall not disclose such information to any third party without the prior written consent of the disclosing Party.

9.2. The Creator shall not disclose to any third party any information received in connection with the performance of this Agreement, including (without limitation) the terms of this Agreement, Brand statistics, website performance data, or any other confidential information.

9.3. The confidentiality obligations in this Section shall not apply to:
(a) information required to be disclosed by applicable law or court order;
(b) information that has become public knowledge other than through a breach of this Agreement;
(c) information lawfully received from a third party without restriction on disclosure;
(d) disclosure to the Party's advisers, provided they are bound by equivalent confidentiality obligations.

9.4. The confidentiality obligations in this Section shall survive the termination or expiry of this Agreement for five (5) years.

9.5. The Agency may seek immediate injunctive relief in a court of competent jurisdiction if the Creator breaches or threatens to breach their confidentiality obligations.

9.6. The Agency may claim compensation for all direct and indirect damages arising from a breach of confidentiality by the Creator, including reputational harm, financial losses, and reasonable legal costs.

============================
10. NOTICES
============================

10.1. All notices under this Agreement shall be in writing (which includes e-mail) and sent to the relevant Party's last known e-mail address.

10.2. A notice sent by e-mail shall be deemed received at the time of transmission, or at the start of the next Business Day if sent outside regular business hours.

10.3. Both Parties shall promptly confirm receipt of any notice in writing.

10.4. The Parties shall notify each other within five (5) Business Days of any change to their contact details, bank account information, or any other matter that may affect the performance of this Agreement.

============================
11. GOVERNING LAW AND DISPUTES
============================

11.1. This Agreement and any dispute or claim arising out of or in connection with it shall be governed by and construed in accordance with the laws of Spain.

11.2. The Parties shall first attempt to resolve any dispute amicably through good faith negotiations. If a dispute cannot be resolved within thirty (30) calendar days of written notice from one Party to the other, the dispute shall be subject to the exclusive jurisdiction of the courts of Córdoba, Spain.

11.3. Either Party may at any time seek injunctive or other equitable relief from a court of competent jurisdiction to protect its confidential information or intellectual property rights.

============================
12. MISCELLANEOUS
============================

12.1. This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior agreements, representations, and understandings, whether written or oral.

12.2. No variation of this Agreement shall be valid unless made in writing and signed by both Parties.

12.3. If any provision of this Agreement is found to be invalid, illegal, or unenforceable, it shall be modified to the minimum extent necessary to make it valid, legal, and enforceable. The remaining provisions shall continue in full force and effect.

12.4. The Creator is an independent contractor. Nothing in this Agreement creates or implies an employment relationship, partnership, agency, or joint venture between the Parties.

12.5. The Creator shall not assign or transfer any rights or obligations under this Agreement without the prior written consent of the Agency.

12.6. Failure by either Party to exercise any right or remedy under this Agreement shall not constitute a waiver of such right or remedy.

12.7. This Agreement may be executed in counterparts, each of which shall constitute an original, and together they shall constitute one and the same agreement.

============================
IN WITNESS WHEREOF
============================

The Parties have signed this Agreement as of the date first written above.

ELEVATEX AGENCY PA SL (Agency)

Signature: _________________________
Name: Pablo Camacho Carrión
Title: UBO / Director
Date: {{today}}


{{influencer_name}} (Creator)

Signature: _________________________
Name: {{influencer_name}}
Alias: {{influencer_alias}}
Date: {{today}}`;

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
      type:        'cs2_cases',
      description: 'Based on the ElevateX ↔ BinaryLore/Skinplace Advertising Services Agreement (20260424-2). Governs the relationship between the Agency and the Creator, mirroring the Agency\'s obligations to the Brand.',
      language:    'en',
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
