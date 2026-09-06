import type { Metadata } from "next";
import { requireStudioEnabled } from "@/lib/studio/access";
import "./studio.css";
import "./studio-editor.css";
import "./studio-media.css";
import "./studio-production.css";
import "./studio-motion.css";
import "./studio-experience.css";
import "./studio-analytics.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireStudioEnabled();
  return <div className="sp-studio">{children}</div>;
}
