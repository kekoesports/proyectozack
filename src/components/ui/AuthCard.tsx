export default function AuthCard({
  subtitle,
  backHref,
  backLabel,
  children,
}: {
  subtitle: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-sp-admin-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-sp-admin-card border border-sp-admin-border rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <span className="font-display text-2xl font-black uppercase gradient-text">SocialPro</span>
          <p className="text-sm text-sp-admin-muted mt-1">{subtitle}</p>
        </div>

        {children}

        <p className="mt-6 text-center text-xs text-sp-admin-muted">
          <a href={backHref} className="hover:text-sp-admin-text transition-colors">
            {backLabel}
          </a>
        </p>
      </div>
    </div>
  );
}
