import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { redemptions } from '@/db/schema';

export async function getAdminRedemptions(status?: 'pendiente' | 'enviado' | 'cancelado') {
  return db.query.redemptions.findMany({
    where: status ? eq(redemptions.status, status) : undefined,
    with: {
      user: {
        columns: { id: true, name: true, email: true },
      },
      shopItem: true,
    },
    orderBy: (row) => [desc(row.createdAt)],
    limit: 200,
  });
}
