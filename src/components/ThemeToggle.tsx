import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    console.log("rendered");
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(d => !d)}
      className="rounded-lg border px-3 py-1.5 text-sm font-medium
                 bg-white text-slate-900 border-slate-300
                 hover:bg-slate-50
                 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600
                 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
