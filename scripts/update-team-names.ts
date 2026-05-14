/**
 * update-team-names.ts — actualiza nombres y cargos del equipo en la DB
 * Run: npx tsx scripts/update-team-names.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* CI: no .env.local */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL no definida');

import * as schema from '../src/db/schema/index';

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const updates = [
  {
    slug: 'alfonso',
    name: 'Alfonso Arias',
    role: 'Co-Founder & Talent Strategy',
    bio: 'Conocido como "Zack" en la comunidad. Ex-pro player CS, streamer. +7 años en gambling. Especializado en talentos y YouTube management.',
  },
  {
    slug: 'keko',
    name: 'Pablo Camacho',
    role: 'Founder & CEO',
    bio: 'Conocido como "Kekō" en la comunidad. +14 años en esports/gaming. Ex pro player CS:GO. Especialista en iGaming y desarrollo de negocio.',
  },
  {
    slug: 'giuliano',
    name: 'Giuliano',
    role: 'LATAM Partnerships Manager',
    bio: 'Experto en casino y casas de apuestas. Centrado en acuerdos iGaming para el mercado LATAM. +5 años de experiencia.',
  },
  {
    slug: 'cm',
    name: 'Community Manager',
    role: 'Community & Growth Manager',
    bio: 'Gestión de comunidades, contenido social y crecimiento orgánico.',
  },
];

async function run() {
  for (const u of updates) {
    const result = await db
      .update(schema.teamMembers)
      .set({ name: u.name, role: u.role, bio: u.bio })
      .where(eq(schema.teamMembers.slug, u.slug))
      .returning({ slug: schema.teamMembers.slug, name: schema.teamMembers.name, role: schema.teamMembers.role });

    if (result.length) {
      console.log(`✓ ${result[0].slug}: "${result[0].name}" — ${result[0].role}`);
    } else {
      console.warn(`⚠ No se encontró miembro con slug "${u.slug}"`);
    }
  }
  console.log('Actualización completada.');
}

run().catch((err) => { console.error(err); process.exit(1); });
