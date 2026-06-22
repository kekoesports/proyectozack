/**
 * Inserta la plantilla "Influencer Agreement" (alineada con EmpireDrop)
 * como template de tipo 'cs2_cases' en la BD.
 * Ejecutar una sola vez: npx tsx scripts/seed-empiredrop-template.ts
 *
 * Estructura basada en el contrato EmpireDrop x Imantado (11 May 2026):
 *  - Agency = ElevateX Agency PA SL (rol equivalente a EmpireDrop)
 *  - Creator = el influencer/streamer (firma este acuerdo con ElevateX)
 *  - IP: el Creator CONSERVA la propiedad; la Agency recibe licencia limitada
 *  - Ley aplicable: España / Córdoba (adapta de Chipre/Nicosia)
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

const TEMPLATE_NAME = 'Influencer Agreement — Creator (EmpireDrop-aligned)';

const CONTENT = `INFLUENCER AGREEMENT

Execution Date: {{today}}

This Influencer Agreement (the "Agreement") was made on the Execution Date in Córdoba, Spain.

BETWEEN

1. ELEVATEX AGENCY PA SL, a company incorporated and registered under the laws of Spain, CIF: B21821046, with registered office at Calle Teruel 19, 3º3, 14011 Córdoba, Spain, represented by its director Pablo Camacho Carrión (hereinafter referred to as "ElevateX" and/or the "Agency"), and

2. {{influencer_name}}, known professionally as "{{influencer_alias}}", having their place of residence/registered address at {{influencer_address}}, with ID/NIF: {{influencer_id}} (hereinafter referred to as the "Influencer").

(Collectively referred to as the "Parties".)

WHEREAS:

(A) The Agency manages advertising campaigns on behalf of brand clients, including {{brand_name}} (the "Brand"), operating the web platform {{brand_url}} (the "Platform"), which introduces an e-game interface with mystery award boxes and CS2-related gaming content;

(B) The Influencer is an individual or entity with social media reach and content creation capabilities;

(C) The Agency wishes to engage the Influencer, on a freelance basis, to assist in promoting the products and services offered by the Brand and its Affiliates via the Influencer's activity on their social media channels (the "Channel"), subject to the terms and conditions set forth in this Agreement.

NOW THEREFORE, in consideration of the premises and other good and valuable consideration, the sufficiency and receipt of which are hereby acknowledged, the parties agree as follows:

============================
1. DEFINITIONS
============================

| Term | Definition |
|---|---|
| Account | Means the Brand platform account maintained by the Influencer and created or facilitated by the Agency, for the promotion of the Brand's and its Affiliates' products and services through the Channel. |
| Affiliate | Means any entity, individual, firm or corporation, directly or indirectly, through one or more intermediaries, controlling, controlled by, or under common control with the Brand or the Agency. |
| Agreement | Means these terms and conditions hereunder signed and agreed by both Parties and any attached Schedules. |
| Brand | Means {{brand_name}}, the brand client on whose behalf the Agency commissions the Services under this Agreement. |
| Client | Means a person who is a client or potential client of the Brand. |
| Confidential Information | Means any information, documents, software access and data which might be disclosed and/or given access to, from the Agency or Brand to the Influencer, concerning client statements, agreements with clients and other service providers, information behind website content, offer descriptions, scope or nature of work executed, affiliation with the Agency or Brand, client-specific copyright, any marketing strategies, plans, financial information, or projections, operations, sales estimates, business plans and performance results relating to the past, present or future business activities of the Agency or Brand, and any other information that should reasonably be recognised as confidential. Confidential Information need not be novel, unique, patentable, copyrightable or constitute a trade secret in order to be designated as such. Confidential Information will not include information which is now, or hereafter becomes, through no act or failure to act on the part of the Influencer, generally known or available to the public. |
| Data Protection Laws | Means all applicable legislation in connection with privacy and the processing, collection, use and protection of personal data in any jurisdiction, including the EU General Data Protection Regulation (GDPR) and Spanish data protection legislation. |
| Force Majeure | Means any cause beyond the reasonable control of the Parties, including without limitation: (a) act of God; (b) war, insurrection, riot, civil disturbance, acts or attempted acts of terrorism; (c) fire, explosion, flood, storm; (d) theft or malicious damage; (e) strike, lockout, or other industrial dispute; (f) national defense requirements, acts or regulations of national or local governments; (g) public power shortages, malfunctions or failures in public telecommunication or IT services, or breakdown of other public infrastructures; or inability to obtain essential power, raw materials, labour, or malfunction of machinery or apparatus. |
| Intellectual Property Rights | Means patents, utility models, rights to inventions, copyright and related rights, moral rights, trademarks and service marks, business names and domain names, rights in get-up and trade dress, goodwill and the right to sue for passing off or unfair competition, rights in designs, rights in computer software, database rights, rights to use and protect the confidentiality of confidential information (including know-how and trade secrets), and all other intellectual property rights, whether registered or unregistered and including all applications and rights to apply for and be granted, renewals or extensions of such rights. |
| Marketing Material | Means promotional, advertising, communication and/or other materials that relate to the Agency, the Brand and their products and services. |
| Partner | Means any entity or individual contractually engaged by the Agency or Brand to introduce Clients and/or other Partners. |

============================
2. NATURE OF SERVICES
============================

a) The Agency shall hereby retain the non-exclusive services of the Influencer as an independent contractor, as set forth in Schedule 1 of this Agreement (the "Services").

b) The Influencer and Agency acknowledge that this Agreement does not create a partnership or joint venture or a relationship of Employer-Employee between them, and it is exclusively an agreement of services.

c) The Agency is not required to pay, or make any contributions to, any social insurance, local, state or national tax, unemployment compensation, worker's compensation, insurance premium, profit-sharing, pension or any other employee benefit for the Influencer during the term of this Agreement.

d) The Influencer is responsible for paying, and complying with reporting requirements for, all local, state and national taxes related to payments made to the Influencer under this Agreement. The Influencer shall provide a valid invoice in accordance with applicable Spanish legislation prior to each payment.

e) The Influencer agrees to be bound by the guidelines as set forth in Schedule 2 of this Agreement (the "Guidelines").

f) The services shall begin upon the execution of this Agreement. The Agreement may be terminated by either Party pursuant to Clause 11, Termination.

============================
3. DELIVERABLES
============================

a) The Influencer shall deliver the agreed content as outlined in Schedule 1.

b) The services shall be provided in accordance with the specifications, guidelines and instructions of the Agency as outlined in Schedule 2, and subject to the Agency's acceptance and approval.

c) The Agency may request the Influencer to incorporate hashtags, referral codes, links, titles, or other relevant information in the media and content being uploaded or published, including mandatory disclosure of the sponsored nature of the content (e.g., "#ad", "#publicidad", or equivalent as required by applicable advertising regulations).

d) Platform Compliance: The Influencer may reasonably adapt, delay or suspend the production or publication of Content where necessary to comply with platform policies, including in the event of any warning, restriction or strike related to the Content. Such delay or suspension shall not constitute a breach of this Agreement, and any performance obligations shall be adjusted accordingly.

e) Traffic Redirection: The Influencer may, at its discretion, use an intermediary landing page or redirection system instead of direct links to the Brand's platform, provided that users are effectively directed to it.

============================
4. OWNERSHIP, USAGE AND LICENCE
============================

a) The Influencer shall retain full ownership of all content, including but not limited to videos, photographs, and text, created under this Agreement (the "Content"), together with all related Intellectual Property Rights. The Agency and Brand are granted a limited, non-exclusive, royalty-free right to use the Content and the Influencer's name, image and likeness solely for promotional purposes related to the campaign, for the duration of the campaign and for a period of thirty (30) days following its completion. Any further commercial use, sublicensing, or distribution of the Content or the Influencer's image beyond this period or outside the scope of the campaign shall require the prior written consent of the Influencer.

b) The Influencer grants the Agency a limited, non-exclusive, royalty-free right and licence to feature Content generated by the Influencer as part of the Services on the Agency's and Brand's owned and controlled social media platforms and within third-party digital, print and broadcast platforms, including but not limited to ad networks, email marketing, paid search listings, and website blogs, during the term of this Agreement and for a period of one (1) month thereafter.

c) The Agency grants the Influencer a temporary licence to use the Brand's Marketing Material as may be necessary to achieve the promotional purpose, but only in compliance with the Guidelines set out in Schedule 2 and only to achieve the promotional purpose described in Schedule 1. The Influencer grants the Agency a licence to use the Influencer's name and likeness in all media including the Agency's website(s), the Brand's website(s), and on social media sites and in all formats of print and digital media advertising during the duration of the Agreement.

d) The Influencer will not issue any Marketing Material about the Agency or Brand or their business, whether on electronic media or otherwise, which contradicts the Guidelines set out in Schedule 2 unless the Agency has supplied the document or approved it in writing.

e) The Influencer shall not take any action, or inaction, that would impair the value of, or goodwill associated with, the Marketing Materials. During the term of the Agreement the Agency will monitor the Influencer's activity and evaluate the Influencer's compliance with the terms of this Agreement.

============================
5. WARRANTIES AND REPRESENTATIONS
============================

a) The Parties represent and warrant to each other that each is free to enter into this Agreement and to perform all obligations under this Agreement.

b) The Influencer warrants that:

   i.   the services will be provided with all due care and skill as and when required by the Agency;
   ii.  the services will be performed personally;
   iii. the services will not infringe upon any third party's patents, trademarks, trade secrets, copyrights or other proprietary rights;
   iv.  the services will not violate any applicable laws and regulations;
   v.   the Influencer shall not use any language, gestures, or means of communication that are racist, derogatory, inflammatory, or obscene, or that violate laws, common decency, or good morals, or that could damage the Agency's or Brand's reputation;
   vi.  the Influencer shall fairly and accurately describe the profile of the Brand and its Affiliates according to the information provided by the Agency;
   vii. the Influencer shall maintain ethical practices, high standards of business, and provide the services at all times in such manner so as to reflect favourably on the Agency and the Brand;
   viii.the Influencer shall comply with any business-related instructions, terms or directions given by the Agency in relation to the services; and
   ix.  the Influencer shall authorise the Agency to inspect or conduct any due diligence it may require from time to time.

============================
6. PAYMENT
============================

a) In consideration for the services provided by the Influencer, the Agency shall pay the Influencer a fee in accordance with Schedule 3 of this Agreement.

b) Any modification to the payment structure, frequency, amounts, or entitlement criteria under this Agreement may only be proposed where justified by objective and material factors. Any such modification shall require the prior written agreement of both Parties and shall apply only to future services or deliverables following such agreement. No modification shall apply retroactively, and all payments accrued or generated from services already performed under this Agreement shall remain payable in full to the Influencer.

c) All payments made to the Influencer under this Agreement are in EUR unless otherwise stated in Schedule 3. The Influencer shall account for any VAT or any other similar taxes, charges and duties due or payable in relation to any payment and shall indemnify the Agency and hold it harmless in relation to such taxes.

d) In the event of any termination of this Agreement, no payment shall be payable to the Influencer in respect of activity conducted after the date of termination.

e) The Agency may withhold, delay or deny payment to the Influencer only where there are reasonable and documented grounds to believe that the Influencer has materially breached this Agreement or applicable laws, and only under the following circumstances:
   i.   the Agency has reasonable and documented grounds to believe that the Influencer's activity is in breach of this Agreement or applicable laws or regulations;
   ii.  the Influencer has knowingly provided misleading or materially false information to the Agency; or
   iii. the Influencer has infringed third-party Intellectual Property Rights.

f) The Influencer agrees to indemnify the Agency for any losses caused to it as a result of breach of this Agreement.

============================
CONFIDENTIALITY
============================

g) Both Parties shall treat Confidential Information as confidential, except as may be necessary to fulfil their respective obligations and except as may be required by law or regulatory body.

h) This clause will not apply to information which was rightfully in the possession of such a party prior to this Agreement, which is already public knowledge or becomes so at a future date (other than as a result of a breach of this clause), or which is trivial or obvious.

i) Where disclosure is required by law or regulatory body, the disclosing Party shall inform the other Party as soon as possible and without undue delay.

============================
7. DATA PROTECTION
============================

a) In this Agreement, "personal data", "data", "data subject" and "processing" have the meanings given to them in the applicable Data Protection Laws.

b) Each Party must comply with all Data Protection Laws that apply to it in relation to any personal data processed in connection with this Agreement ("Protected Data").

c) Each Party must ensure that, where it processes Protected Data as a data processor on behalf of the other Party as data controller, it: (i) only processes the Protected Data for purposes notified to it by the other Party consistent with the terms of this Agreement; and (ii) maintains appropriate technical and organisational measures to prevent any unauthorised or unlawful processing of the Protected Data and to guard against accidental loss or destruction of, or damage to, the Protected Data.

============================
8. INTELLECTUAL PROPERTY
============================

a) Either Party may revoke the Intellectual Property licence at any time if any misuse of Intellectual Property is found.

b) Unauthorised use of either Party's Intellectual Property shall be considered unlawful infringement, and each Party reserves all rights, including the right to pursue an infringement claim in a competent court of law.

============================
9. LIABILITY
============================

a) The Influencer agrees that it shall indemnify and hold harmless the Agency, its directors and Affiliates against all claims and demands which may be made against the Agency in respect of any loss or damage sustained or suffered, or alleged to have been sustained or suffered, by any person by reason of the negligence, wilful default or bad faith or breach of this Agreement by the Influencer or any of its directors, partners, employees or agents.

b) References to claims or demands shall include references to costs and expenses arising from, or incidental to, the provision of the Services by the Influencer, and in particular the costs of investigating and defending, and any payment (whether of compensation or a fine or otherwise) made or required to be made as a result of, any claim, complaint, arbitration, regulatory investigation or disciplinary or enforcement action.

============================
10. INDEMNIFICATIONS
============================

a) The Influencer agrees that the Agency, its directors and Affiliates will not be held liable for any costs, damages or losses caused by force majeure events, including but not limited to government restrictions, exchange or market rulings, suspension or delay of trading, war, civil disturbances, earthquakes, strikes, equipment failure, communication line failure, system failure, unauthorised access, theft, or any technical problem which may prevent the Influencer or the Client from entering or modifying content or orders, or other events or conditions beyond the Agency's control.

============================
11. TERMINATION
============================

a) This Agreement may be terminated any time by mutual agreement, or by either Party if either Party serves the other with no less than fifteen (15) calendar days' written notice of termination.

b) This Agreement may be terminated immediately where:

   i.   A Party is in material breach of a term of this Agreement, and if such breach is capable of remedy, fails to remedy the breach within forty-eight (48) hours;
   ii.  A Party shall become insolvent, or enter into receivership, liquidation, provisional liquidation or voluntary arrangement with its creditors;
   iii. The Agency determines in its sole and absolute discretion that the Influencer is showing any abnormal or abusive activity in accordance with applicable laws and/or this Agreement, and/or generally acting in bad faith; or
   iv.  The Agency is of the view that the Influencer is no longer of good repute.

c) Termination for Commercial Viability: The Agency shall have the right to terminate this Agreement with immediate effect upon written notice to the Influencer in the event that the collaboration, in the Agency's sole and reasonable discretion, is no longer commercially viable. In such event, no further compensation shall be payable beyond amounts accrued up to the termination date.

d) Termination for Underperformance: The Agency reserves the right to terminate this Agreement with immediate effect upon written notice if the performance of the Influencer, measured by engagement, conversions, or revenue generated, falls materially below the reasonable performance expectations previously communicated in writing to the Influencer prior to the commencement of the campaign.

============================
12. EFFECT OF TERMINATION
============================

a) Following termination of this Agreement the Influencer shall return to the Agency any material, either tangible or intangible, held by virtue of this Agreement.

b) The Agency shall prepare a statement of account between the Influencer and the Agency, settlement of which shall be made within twenty-five (25) Business Days. Any payment due to the Influencer shall be payable unless a material breach of this Agreement by the Influencer has been established.

c) Termination of this Agreement shall not give rise to a claim for compensation by the Influencer. However, the Agency shall remain responsible for the payment of any fees corresponding to services and content already performed or delivered up to the date of termination, calculated on a proportional basis where applicable, including any accrued revenue share or performance-based payments generated prior to termination. This limitation shall not apply in the event that the Agency is in breach of any of its obligations under this Agreement.

d) Termination of this Agreement shall not affect either Party's accrued rights and obligations at the date of termination.

e) Clauses 4, 7, 8, 9, 10, 11 and 14 of this Agreement shall continue after termination of this Agreement.

============================
13. CONFLICTS OF INTEREST AND NON-COMPETE
============================

a) The Influencer acknowledges that during the term of this Agreement, the Influencer shall become familiar with trade secrets and other Confidential Information concerning the Agency or its Affiliates and the Brand.

{{exclusivity}}

b) The Influencer represents that its execution and performance of this Agreement does not conflict with or breach any confidential, fiduciary or other duty or obligation to which the Influencer is bound.

c) The Influencer shall not accept any work from any other business organisation or entities which would create an actual or potential conflict of interest for the Agency or the Brand or which is detrimental to their business interests.

============================
14. THIRD PARTY RIGHTS AND AMENDMENTS
============================

a) A person who is not a party to this Agreement has no rights to enforce any terms of this Agreement, but this does not affect any right or remedy of a third party which exists or is available apart from this Agreement.

b) This Agreement may be assigned only if agreed in writing between both Parties.

c) The Parties may modify the terms of this Agreement upon written notice of fifteen (15) days. However, such modification is subject to acceptance by the non-modifying Party. If the non-modifying Party does not agree to the updated terms, that Party may terminate this Agreement.

============================
15. FORCE MAJEURE
============================

15.1 If either Party is prevented or delayed in the performance of any of its obligations under this Agreement by Force Majeure, that Party shall:
   (a) promptly serve notice in writing on the other Party specifying the nature and extent of the circumstances giving rise to Force Majeure and the measures it is taking to remedy and/or mitigate the effects;
   (b) use all reasonable endeavours to mitigate the effects of Force Majeure and/or bring the Force Majeure event to a close, or to find a solution by which the Agreement may be performed despite the continuation of the Force Majeure event;
   (c) have no liability in respect of the performance of such of its obligations as are prevented by the Force Majeure events during the continuation of such events; and
   (d) upon cessation of the Force Majeure event, use its reasonable endeavours to recommence its affected operations in order to perform its obligations.

15.2 In the event of Force Majeure continuing for thirty (30) days, at that point either Party may terminate this Agreement immediately.

============================
16. SEVERANCE
============================

a) Any provision or part-provision of this Agreement that is or becomes invalid, illegal or unenforceable, shall be deemed modified to the minimum extent necessary to make it valid, legal and enforceable. If such modification is not possible, the relevant provision or part-provision shall be deemed deleted. Any modification to or deletion of a provision or part-provision under this clause shall not affect the validity and enforceability of the rest of this Agreement.

b) If one Party gives notice to the other Party of the possibility that any provision or part-provision of this Agreement is invalid, illegal or unenforceable, the Parties shall negotiate in good faith to amend such provision so that, as amended, it is legal, valid and enforceable, and, to the greatest extent possible, achieves the intended commercial result of the original version.

============================
17. GOVERNING LAW AND JURISDICTION
============================

a) This Agreement and any dispute or claim arising out of or in connection with it or its subject matter or formation shall be governed by and construed in accordance with the laws of Spain.

b) Each Party irrevocably agrees that the Courts of Córdoba, Spain shall have exclusive jurisdiction to settle any dispute or claim arising out of or in connection with this Agreement or its subject matter or formation.

============================
IN WITNESS WHEREOF
============================

The Parties have executed this Agreement on the date first written above. Each such counterpart shall together, as well as separately, constitute one and the same instrument.

Signed for and on behalf of ElevateX Agency PA SL (Agency)    Influencer

___________________________________        ___________________________________
Pablo Camacho Carrión                              {{influencer_name}}
Director / UBO                                           Known as: {{influencer_alias}}
ELEVATEX AGENCY PA SL                          Date: {{today}}
Date: {{today}}

============================
SCHEDULE 1 — SERVICES
============================

The Parties agree that the Influencer shall create and publish sponsored entertainment and review content for the Brand's Platform (accessible at {{brand_url}}) and feature them on their Channel, with the following deliverables and terms:

{{deliverables}}

============================
SCHEDULE 2 — GUIDELINES
============================

The Influencer agrees that all Content published under this Agreement shall:

a. Showcase the Brand's Platform through videos and streams, highlighting features and game modes.
b. Play the game modes provided by the Platform (including case openings, case battles, and other available modes).
c. Promote the Influencer's own referral code ({{referral_code}}) and referral link provided by the Agency.
d. Include clear and prominent disclosure of the sponsored nature of the content as required by applicable advertising regulations (e.g., "#ad", "#publicidad", or equivalent).
e. Not contain language, gestures, or means of communication that are racist, derogatory, inflammatory, or obscene.
f. Comply with all applicable platform policies (Twitch, Kick, YouTube, Instagram, TikTok, or other relevant platforms).
g. Add the Brand's link/panel under the Influencer's streaming profiles as instructed by the Agency.
h. Not promote any direct competitor of the Brand during the term of this Agreement, as specified in Clause 13 and the exclusivity terms.

============================
SCHEDULE 3 — FEE PAYMENT & DETAILS
============================

{{payment_terms}}

Total fixed fee for this Agreement: {{total_amount}} EUR (or as specified above).

Payment shall be made by bank transfer to the Influencer's bank account as notified to the Agency in writing. The Influencer shall provide a valid invoice in accordance with applicable legislation prior to each payment.`;

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
      description: 'Based on the EmpireDrop x Imantado Influencer Agreement (11 May 2026). Agency = ElevateX; Creator/Influencer signs directly. IP stays with creator (limited licence to Agency). Schedules for deliverables, guidelines and fees. Spain/Córdoba jurisdiction.',
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
