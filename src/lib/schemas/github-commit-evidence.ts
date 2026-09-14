import { z } from 'zod';

export const githubCommitsSchema = z.array(z.object({
  sha: z.string().regex(/^[a-f0-9]{40}$/), html_url: z.string().url(),
  commit: z.object({ message: z.string(), committer: z.object({ date: z.iso.datetime({ offset: true }) }) }),
}));

