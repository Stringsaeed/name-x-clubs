export type Scheme = 'dark' | 'light';

export type Colors = Readonly<{
  /** Screen background. */
  paper: string;
  /** Raised surfaces (the web's `--white`). */
  card: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Borders. */
  line: string;
  /** Primary action and focus colour. */
  green: string;
  /** Accent (brand mark, badges). */
  lime: string;
  /** Subtle fill (inputs, pills). */
  soft: string;
  /** Text on lime. */
  onAccent: string;
  /** Text on green. */
  onGreen: string;
  accentHover: string;
  /** Selected fill. */
  selected: string;
  /** Selected border. */
  selectedLine: string;
  warning: string;
  warningBg: string;
  warningLine: string;
  shadow: string;
  albumDot: string;
  albumGhost: string;
  key: string;
  keyPressed: string;
}>;

export const darkColors: Colors = {
  paper: '#111a16',
  card: '#1b2720',
  ink: '#edf3e7',
  muted: '#acb9a4',
  line: '#354638',
  green: '#b9dc8b',
  lime: '#d2f571',
  soft: '#263529',
  onAccent: '#183020',
  onGreen: '#183020',
  accentHover: '#e0ffa0',
  selected: '#304527',
  selectedLine: '#799d50',
  warning: '#edbd83',
  warningBg: '#382c20',
  warningLine: '#705437',
  shadow: '#00000040',
  albumDot: '#344331',
  albumGhost: '#1b272099',
  key: '#435148',
  keyPressed: '#627366',
};

export const lightColors: Colors = {
  paper: '#f7f8f2',
  card: '#fffefa',
  ink: '#203e32',
  muted: '#5d6d56',
  line: '#dce3d2',
  green: '#244f3b',
  lime: '#d2f571',
  soft: '#eff3e7',
  onAccent: '#183020',
  onGreen: '#fffef8',
  accentHover: '#326149',
  selected: '#e6f0d6',
  selectedLine: '#789b4d',
  warning: '#865d2e',
  warningBg: '#fbf2e9',
  warningLine: '#ecdcc8',
  shadow: '#203e3214',
  albumDot: '#ccd5be',
  albumGhost: '#fffefa85',
  key: '#fffefa',
  keyPressed: '#c7d2bc',
};

export const palettes: Readonly<Record<Scheme, Colors>> = {
  dark: darkColors,
  light: lightColors,
};

export const radii = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
