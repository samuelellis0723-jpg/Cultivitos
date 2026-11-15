const PATHS = {
  pin: 'M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10Zm0-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  calendar: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 7H5v10h14V9Z',
  water: 'M12 2.5C8.5 7 6 10.2 6 13.5a6 6 0 1 0 12 0c0-3.3-2.5-6.5-6-11Z',
  layers: 'M12 3 2 8l10 5 10-5-10-5Zm0 8.5L4.2 7.6 2 8.7l10 5 10-5-2.2-1.1L12 11.5Zm0 4L4.2 11.6 2 12.7l10 5 10-5-2.2-1.1L12 15.5Z',
  shield: 'M12 2 4 5v6.1c0 5 3.4 9.6 8 10.9 4.6-1.3 8-5.9 8-10.9V5l-8-3Z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
  book: 'M6 2h11a2 2 0 0 1 2 2v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v15h11V4H6Z',
  tune: 'M3 6h10v2H3V6Zm14 0h4v2h-4V6ZM3 11h4v2H3v-2Zm8 0h10v2H11v-2ZM3 16h12v2H3v-2Zm16 0h2v2h-2v-2Z',
  check: 'M9.5 16.2 4.8 11.5l1.4-1.4 3.3 3.3 8.3-8.3 1.4 1.4-9.7 9.7Z',
  science: 'M9 3h6v2h-1v4.6l4.6 7.4A2 2 0 0 1 16.9 20H7.1a2 2 0 0 1-1.7-3l4.6-7.4V5H9V3Z',
  download: 'M12 3v10.6l3.3-3.3 1.4 1.4L12 17.4l-4.7-4.7 1.4-1.4 3.3 3.3V3h2Zm-7 15h14v2H5v-2Z',
  print: 'M6 9V3h12v6h1a2 2 0 0 1 2 2v5h-3v4H6v-4H3v-5a2 2 0 0 1 2-2h1Zm2-4v4h8V5H8Zm0 10v3h8v-3H8Z',
  arrowLeft: 'M15.4 16.6 10.8 12l4.6-4.6L14 6l-6 6 6 6 1.4-1.4Z',
  arrowRight: 'M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6-1.4-1.4Z',
  chevronDown: 'M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z',
  alert: 'M12 3 2 20h20L12 3Zm1 13h-2v-2h2v2Zm0-4h-2V8h2v4Z',
  refresh: 'M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z',
  close: 'M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4Z',
};

export default function Icon({ name, size = 18 }) {
  const d = PATHS[name] || PATHS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}
