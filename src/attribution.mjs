export const ATTRIBUTION_KEYS = [
  'utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id',
  'src','sck','xcod','fbclid','gclid','ttclid'
];
const STORAGE_KEY = 'vsd-attribution-v1';

// Guarda apenas parâmetros de origem; nunca respostas, e-mail ou contexto de acesso.
export function checkoutAttribution(search, providedStorage) {
  let storage = providedStorage;
  if (arguments.length < 2) {
    try { storage = window.sessionStorage; } catch { storage = null; }
  }
  let previous = {};
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) previous = value;
  } catch { /* A navegação não depende do armazenamento. */ }
  const input = new URLSearchParams(search);
  const incoming = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = input.get(key);
    if (value) incoming[key] = value.slice(0, 2048);
  }
  const newVisit = ['utm_source','utm_campaign','utm_id','fbclid','gclid','ttclid'].some(key => incoming[key]);
  const values = newVisit ? incoming : { ...previous, ...incoming };
  const output = new URLSearchParams();
  for (const key of ATTRIBUTION_KEYS) {
    if (typeof values[key] === 'string' && values[key]) output.set(key, values[key].slice(0, 2048));
  }
  if (Object.keys(incoming).length) {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(output))); } catch {}
  }
  return output;
}

