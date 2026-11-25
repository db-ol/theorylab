const paths = {
  music: 'M9 18V5l12-2v13M9 9l12-2M9 18c0 1.5-1.6 3-3.5 3S2 20.3 2 19s1.6-2.5 3.5-2.5S9 17 9 18Zm12-2c0 1.5-1.6 3-3.5 3S14 18.3 14 17s1.6-2.5 3.5-2.5S21 15 21 16Z',
  home: 'M3 10 12 3l9 7v10h-6v-6H9v6H3Z',
  book: 'M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zm16 0h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z',
  practice: 'M4 19h4V5H4zm6 0h4V5h-4zm6 0h4V5h-4zM8 5v8m8-8v8',
  review: 'M5 7a8 8 0 1 1-1 9m1-9V3m0 4h4m3 1v5l3 2',
  glossary: 'M5 19 10 5l5 14m-8-5h6m3 1h5m-2-2v6',
  exam: 'M7 5H4v16h16V5h-3M8 3h8v4H8zM8 12h8m-8 4h8',
  settings: 'M4 7h16M4 12h16M4 17h16M8 5v4m8 1v4m-6 1v4',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-18 0h18m-9-9c-5 5-5 13 0 18 5-5 5-13 0-18Z',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2m12-7a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  moon: 'M20 15A8.4 8.4 0 0 1 9 4a8.6 8.6 0 1 0 11 11Z',
  sound: 'M4 9h4l5-4v14l-5-4H4zM16 9c2 1 2 5 0 6m2-9c4 2 4 10 0 12',
  check: 'm5 12 4 4L19 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  pulse: 'M2 12h5l3-6 4 12 3-6h5',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 1 0 0-10Zm0 4a1 1 0 1 0 0 2 1 1 0 1 0 0-2Z',
  flag: 'M5 21V4m0 1c6-5 8 5 14 0v10c-6 5-8-5-14 0',
} as const
export type IconName = keyof typeof paths
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
