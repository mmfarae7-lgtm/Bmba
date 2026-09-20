'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../lib/i18n';

export default function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  const items = [
    { href: '/', icon: '⚽', label: t('mnav_matches') },
    { href: '/leagues', icon: '🏆', label: t('mnav_leagues') },
    { href: '/leaderboard', icon: '🥇', label: t('mnav_leaderboard') },
    { href: '/challenges', icon: '🔥', label: t('mnav_challenges') },
  ];

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`bottom-nav-item ${isActive(item.href) ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}