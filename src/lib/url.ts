// Bouwt een link die zowel lokaal als onder /Amersfoort-APV/ werkt.
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const schoon = path.replace(/^\//, '');
  return `${base}/${schoon}`;
}
