import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contracts, contractSigners } from '@/db/schema';
import type { Contract, ContractSigner, ContractWithSigners } from '@/types';

export async function getContractByCampaign(campaignId: number): Promise<ContractWithSigners | null> {
  const [row] = await db.select().from(contracts)
    .where(eq(contracts.campaignId, campaignId))
    .orderBy(desc(contracts.createdAt))
    .limit(1);
  if (!row) return null;
  const signers = await db.select().from(contractSigners)
    .where(eq(contractSigners.contractId, row.id))
    .orderBy(contractSigners.id);
  return { ...row, signers };
}

export async function getContractById(id: number): Promise<ContractWithSigners | null> {
  const [row] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!row) return null;
  const signers = await db.select().from(contractSigners)
    .where(eq(contractSigners.contractId, id))
    .orderBy(contractSigners.id);
  return { ...row, signers };
}

export async function getSignerByToken(token: string): Promise<(ContractSigner & { contract: Contract }) | null> {
  const rows = await db
    .select({
      signer: contractSigners,
      contract: contracts,
    })
    .from(contractSigners)
    .innerJoin(contracts, eq(contracts.id, contractSigners.contractId))
    .where(eq(contractSigners.token, token))
    .limit(1);
  if (!rows[0]) return null;
  return { ...rows[0].signer, contract: rows[0].contract };
}

export async function createContract(values: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> {
  const [row] = await db.insert(contracts).values(values).returning();
  if (!row) throw new Error('Failed to create contract');
  return row;
}

export async function updateContract(id: number, patch: Partial<Contract>): Promise<Contract | null> {
  const [row] = await db.update(contracts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(contracts.id, id))
    .returning();
  return row ?? null;
}

export async function addSigner(values: Omit<ContractSigner, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractSigner> {
  const [row] = await db.insert(contractSigners).values(values).returning();
  if (!row) throw new Error('Failed to add signer');
  return row;
}

export async function removeSigner(id: number): Promise<void> {
  await db.delete(contractSigners).where(eq(contractSigners.id, id));
}

export async function recordSignature(
  token: string,
  signedName: string,
  ipAddress: string,
): Promise<ContractSigner | null> {
  const [row] = await db.update(contractSigners)
    .set({ status: 'signed', signedAt: new Date(), signedName, ipAddress, updatedAt: new Date() })
    .where(eq(contractSigners.token, token))
    .returning();
  return row ?? null;
}
