export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const base = new URL(req.url).origin;
  return Response.redirect(`${base}/api/og-image/talent-img?slug=${slug}`, 301);
}
