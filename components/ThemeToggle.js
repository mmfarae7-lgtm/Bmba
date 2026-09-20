'use client';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('bomba-theme', next); } catch (e) {}
    document.documentElement.dataset.theme = next;
    setTheme(next);
  };

  return (
    <button className="theme-toggle" onClick={toggle} title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} aria-label="تبديل الوضع">
      <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span className="theme-text">{theme === 'dark' ? 'فاتح' : 'داكن'}</span>
    </button>
  );
}