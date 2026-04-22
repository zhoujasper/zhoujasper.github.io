import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void; // toggles between light/dark (explicit override)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // Default to light mode unless user has a persisted preference
      theme: 'light',
      setTheme: (theme: Theme) => {
        set({ theme });
        updateTheme(theme);
      },
      toggleTheme: () => {
        const current = get().theme;
        // When in system mode, first toggle explicitly to light
        const newTheme = current === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        updateTheme(newTheme);
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
    }
  )
);

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  // Keep backward compatibility with persisted 'system' but force explicit light/dark behavior.
  return theme === 'dark' ? 'dark' : 'light';
}

function updateTheme(theme: Theme) {
  const effective = resolveTheme(theme);
  // Update DOM
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(effective);
  root.setAttribute('data-theme', effective);
}
