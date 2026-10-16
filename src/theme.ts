export const themeStorageKey = 'name-x-clubs-theme';

export const themeInitScript = `(() => {
  let theme = 'dark';
  try {
    if (localStorage.getItem('${themeStorageKey}') === 'light') theme = 'light';
  } catch {}
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = theme === 'light' ? '#f7f8f2' : '#111a16';
  document.head.appendChild(meta);
})();`;

export function applyDocumentTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === 'light' ? '#f7f8f2' : '#111a16';
  }
}
