export type AnalysisKind = 'water' | 'flood' | 'vegetation' | 'change' | 'urban';
export function routeQuery(query: string, hasPair: boolean): AnalysisKind {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Enter a question or choose a suggested query.');
  const q = query.toLowerCase().normalize('NFKC').replace(/[–—]/g, '-');
  const temporal = /\b(chang(?:e[ds]?|ing)|before|after|compar(?:e|ison|ing)|differenc(?:e|es)|increas(?:e[ds]?|ing)|decreas(?:e[ds]?|ing)|newly|expansion|expanded|growth|grew|between.*dates?)\b/.test(q);
  const water = /\b(flood\w*|water\w*|rivers?|lakes?|inundat\w*)\b/.test(q);
  const vegetation = /\b(vegetation|forests?|green|crops?|plants?|trees?|ndvi|exg)\b/.test(q);
  const urban = /\b(buildings?|urban|construction|built[ -]?up|settlements?|houses?|roofs?)\b/.test(q);
  if (!water && !vegetation && !urban && !temporal) throw new Error('This prototype supports water, vegetation, built-up coverage and temporal change. Try a suggested query.');
  if ([water, vegetation, urban].filter(Boolean).length > 1) throw new Error('Ask about one land-cover type at a time.');
  if (temporal && !hasPair) throw new Error('A temporal question needs Image B. Add a second observation of the same area.');
  if (water && hasPair && (temporal || /\b(flood\w*|inundat\w*)\b/.test(q))) return 'flood';
  if (temporal) return 'change';
  return water ? 'water' : vegetation ? 'vegetation' : 'urban';
}
