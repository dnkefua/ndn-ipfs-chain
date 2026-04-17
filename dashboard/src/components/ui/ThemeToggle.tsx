'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check stored preference or system preference
    const stored = localStorage.theme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggle = () => {
    const root = document.documentElement;

    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      )}
    </button>
  );
};

ThemeToggle.displayName = 'ThemeToggle';

export { ThemeToggle };
