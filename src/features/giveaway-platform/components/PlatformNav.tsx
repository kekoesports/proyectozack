import Image from 'next/image';
import Link from 'next/link';
import { CreatorDropdown } from './CreatorDropdown';
import { UserPill } from './UserPill';

interface CreatorOption {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  sub: string;
  photoUrl: string | null;
}

interface Props {
  creators: CreatorOption[];
  activeSlug: string;
  userName: string | null;
  userImage: string | null;
  balance: number;
  loggedIn: boolean;
}

const NAV_ITEMS = [
  { href: '#home', label: 'Home', active: true },
  { href: '#racha', label: 'Diario' },
  { href: '#misiones', label: 'Misiones' },
  { href: '#sorteos', label: 'Sorteos' },
  { href: '#ranking', label: 'Ranking' },
  { href: '#tienda', label: 'Tienda' },
];

export function PlatformNav({ creators, activeSlug, userName, userImage, balance, loggedIn }: Props) {
  return (
    <nav className="gp-nav" aria-label="Plataforma de sorteos">
      <div className="gp-nav-inner">
        <Link href="/sorteos/plataforma" className="gp-logo" aria-label="SocialPro Giveaways">
          <Image
            src="/logo.png"
            alt="SocialPro"
            width={130}
            height={68}
            className="gp-logo-img"
            priority
          />
          <span className="gp-logo-tag">
            <b>Giveaways</b>
            <span>Plataforma de Sorteos</span>
          </span>
        </Link>

        <CreatorDropdown creators={creators} activeSlug={activeSlug} />

        <div className="gp-nav-links">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className={item.active ? 'active' : undefined}>
              {item.label}
            </a>
          ))}
        </div>

        <UserPill userName={userName} userImage={userImage} balance={balance} loggedIn={loggedIn} />
      </div>
    </nav>
  );
}
