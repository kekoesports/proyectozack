import { router } from '@/server/trpc';
import { contactRouter } from './contact';
import { creatorApplyRouter } from './creatorApply';
import { giveawaysRouter } from './giveaways';
import { invoicesRouter } from './invoices';
import { proposalsRouter } from './proposals';
import { searchRouter } from './search';

export const appRouter = router({
  contact: contactRouter,
  creatorApply: creatorApplyRouter,
  giveaways: giveawaysRouter,
  invoices: invoicesRouter,
  proposals: proposalsRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
