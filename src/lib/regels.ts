import { marked } from 'marked';

export interface Straf {
  label: string; // bijv. "Categorie 4 + wapen inleveren"
  nr?: string; // bijv. "4"
}

export interface Artikel {
  id: string;
  nr: string;
  titel: string;
  html: string;
  tekst: string; // platte tekst, voor zoeken
  straffen: Straf[];
}

export interface Hoofdstuk {
  id: string;
  titel: string;
  introHtml: string;
  artikelen: Artikel[];
}

const opschonen = (t: string) =>
  t
    .replace(/<\/?br\s*\/?>/gi, ' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const slug = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// "Artikel 22.1 - RDM" -> nr "22.1", titel "RDM"; "A1 - Reikwijdte" -> nr "A1"
function splitKop(kop: string): { nr: string; titel: string } {
  const zonder = kop.replace(/^Artikel\s+/i, '');
  // nummers als "22.1", "101.OW", "103.1.OW", "1.INF", "212.HD", "I-1", "A3"
  const m = zonder.match(/^((?:[IVX]+-\d+)|(?:A\d+)|(?:\d+(?:\.\d+)*(?:\.\s?[A-Za-z]+)?))\s*[-–—]?\s*(.*)$/);
  return m ? { nr: m[1].replace(/\s+/g, ''), titel: m[2] || zonder } : { nr: '', titel: kop };
}

const isArtikel = (kop: string) => /^(Artikel\b|A\d+\s*[-–—])/i.test(kop);

// MkDocs-waarschuwingen ("!!! attention "LET OP"") omzetten naar een HTML-blok
function admonitions(tekst: string): string {
  const regels = tekst.split('\n');
  const uit: string[] = [];
  for (let i = 0; i < regels.length; i++) {
    const m = regels[i].match(/^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*$/);
    if (!m) { uit.push(regels[i]); continue; }
    const inhoud: string[] = [];
    while (i + 1 < regels.length && (regels[i + 1].startsWith('    ') || regels[i + 1].trim() === '')) {
      i++;
      inhoud.push(regels[i].replace(/^ {4}/, ''));
    }
    uit.push(`<div class="admon admon-${m[1]}">`, m[2] ? `<strong>${m[2]}</strong>` : '', '', ...inhoud, '', '</div>', '');
  }
  return uit.join('\n');
}

const catNummer = (t: string) => t.match(/(?:categorie|catogorie|cat\.?)\s*(\d+)/i)?.[1];

// Haalt "Straf: Categorie 6" (één of meer regels) uit de tekst en geeft het los terug
function haalStraf(body: string): { body: string; straffen: Straf[] } {
  const straffen: Straf[] = [];
  let rest = body.replace(/^[ \t]*Straf:[ \t]*(.+?)[ \t]*$/gim, (_m, t: string) => {
    straffen.push({ label: t, nr: catNummer(t) });
    return '';
  });
  // oudere tabelvorm: "| Straf | Categorie 6 |"
  if (straffen.length === 0) {
    const re = /^\|\s*Straf\s*\|([^\n]*)\n\|[\s:|-]+\|[ \t]*\n?/m;
    const m = rest.match(re);
    const label = m?.[1].split('|').map((c) => c.trim()).filter(Boolean).join(' · ') ?? '';
    const nr = catNummer(label);
    if (m && nr) {
      straffen.push({ label: label.replace(/catogorie/i, 'Categorie'), nr });
      rest = rest.replace(re, '');
    }
  }
  return { body: rest, straffen };
}

const tekstVan = (h: string) =>
  h.replace(/<[^>]+>/g, '').replace(/&euro;/g, '€').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const algemeneKoppen = new Set(['', 'feit', 'type', 'dienst', 'straf', 'categorie', 'omschrijving']);

// Boete-/straftabellen worden rijen met ronde badges; andere tabellen blijven tabellen.
function pilTabel(tabel: string): string | null {
  const koppen = [...tabel.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1].trim());
  const rijen = [...tabel.matchAll(/<tr>\s*((?:<td[^>]*>[\s\S]*?<\/td>\s*)+)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1].trim()),
  );
  if (koppen.length < 2 || rijen.length === 0) return null;
  const koptekst = koppen.map(tekstVan).join(' ').toLowerCase();
  if (!/boete|celstraf|straf|prijs|kosten/.test(koptekst)) return null;
  if (rijen.some((r) => r.slice(1).some((c) => tekstVan(c).length > 45))) return null;

  const titel = tekstVan(koppen[0]);
  const titelHtml = algemeneKoppen.has(titel.toLowerCase()) ? '' : `<div class="pt-titel">${titel}</div>`;
  const rijHtml = rijen
    .map((cellen) => {
      const pillen = cellen
        .slice(1)
        .map((c, i) => {
          let waarde = tekstVan(c);
          if (!waarde) return '';
          const kop = tekstVan(koppen[i + 1] ?? '');
          const geld = waarde.match(/^€\s*([\d.]+)(?:,-|,–)?\s*-?$/);
          if (geld) waarde = '€ ' + Number(geld[1].replace(/\./g, '')).toLocaleString('nl-NL');
          const soort = geld || /boete|prijs|kosten/i.test(kop) ? 'geld' : /straf|maand/i.test(kop + waarde) ? 'tijd' : 'neutraal';
          return `<span class="pil ${soort}">${kop ? `<small>${kop}</small>` : ''}<b>${waarde}</b></span>`;
        })
        .join('');
      return `<div class="pt-rij"><span class="pt-label">${cellen[0]}</span><span class="pt-pillen">${pillen}</span></div>`;
    })
    .join('');
  return `<div class="pilltabel">${titelHtml}${rijHtml}</div>`;
}

// Overige tabellen: eerste kolom als badge, de rest als tekst ernaast
function tekstRijen(tabel: string): string {
  const koppen = [...tabel.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => tekstVan(m[1]));
  const rijen = [...tabel.matchAll(/<tr>\s*((?:<td[^>]*>[\s\S]*?<\/td>\s*)+)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1].trim()),
  );
  if (rijen.length === 0) return tabel;
  const rijHtml = rijen
    .map((cellen) => {
      const [eerste, ...rest] = cellen;
      const cellenHtml = rest
        .map((c, i) => {
          if (!tekstVan(c)) return '';
          const kop = koppen[i + 1];
          return `<span class="pt-cel">${rest.length > 1 && kop ? `<small>${kop}</small>` : ''}${c}</span>`;
        })
        .join('');
      const pil = tekstVan(eerste) ? `<span class="pil neutraal"><b>${eerste}</b></span>` : '';
      return `<div class="pt-rij tekst">${pil}<span class="pt-tekst">${cellenHtml}</span></div>`;
    })
    .join('');
  return `<div class="pilltabel">${rijHtml}</div>`;
}

// :::categorieen ... ::: -> raster met gekleurde tegels ("1 | Waarschuwing + 50 taken")
function categorieBlokken(tekst: string): string {
  return tekst.replace(/^:::categorieen[ \t]*\n([\s\S]*?)\n:::[ \t]*$/gm, (_m, blok: string) => {
    const tegels = blok
      .split('\n')
      .map((r) => r.match(/^\s*(\d+)\s*\|\s*(.+?)\s*$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => {
        const n = Number(m[1]);
        const bolletjes = Array.from({ length: 10 }, (_, i) => `<i${i < n ? ' class="aan"' : ''}></i>`).join('');
        return `<div class="cat-tegel"><span class="cat-nr">Categorie ${n}</span><span class="meter" aria-hidden="true">${bolletjes}</span><span class="cat-tekst">${m[2]}</span></div>`;
      })
      .join('');
    return `<div class="cat-grid">${tegels}</div>\n`;
  });
}

function render(md: string, base: string): string {
  let html = marked.parse(md, { async: false, gfm: true }) as string;
  html = html
    .replace(/(src|href)="(?:\.\.\/|\/)?img\//g, `$1="${base}/img/`)
    .replace(/<table[\s\S]*?<\/table>/g, (t) => pilTabel(t) ?? tekstRijen(t));
  return html;
}

const platteTekst = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

export function parseRegels(bron: string, base: string): Hoofdstuk[] {
  const tekst = categorieBlokken(admonitions(bron.replace(/\r\n/g, '\n').replace(/\t/g, '    ')));
  const hoofdstukken: { titel: string; intro: string[]; artikelen: { kop: string; regels: string[] }[] }[] = [];
  let hs: (typeof hoofdstukken)[number] | null = null;
  let art: { kop: string; regels: string[] } | null = null;

  for (const regel of tekst.split('\n')) {
    const k = regel.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (k) {
      const kop = opschonen(k[2]);
      const niveau = k[1].length;
      if (niveau === 3 || isArtikel(kop)) {
        if (!hs) { hs = { titel: 'Algemeen', intro: [], artikelen: [] }; hoofdstukken.push(hs); }
        art = { kop, regels: [] };
        hs.artikelen.push(art);
      } else {
        hs = { titel: kop, intro: [], artikelen: [] };
        hoofdstukken.push(hs);
        art = null;
      }
      continue;
    }
    if (art) art.regels.push(regel);
    else if (hs) hs.intro.push(regel);
  }

  const gebruikt = new Set<string>();
  const uniek = (basis: string) => {
    let id = basis || 'deel', n = 2;
    while (gebruikt.has(id)) id = `${basis}-${n++}`;
    gebruikt.add(id);
    return id;
  };

  return hoofdstukken
    .filter((h) => h.artikelen.length > 0 || h.intro.join('').trim() !== '')
    .map((h) => ({
      id: uniek(slug(h.titel)),
      titel: h.titel,
      introHtml: h.intro.join('\n').trim() ? render(h.intro.join('\n'), base) : '',
      artikelen: h.artikelen.map((a) => {
        const { nr, titel } = splitKop(a.kop);
        const { body, straffen } = haalStraf(a.regels.join('\n'));
        const html = render(body.trim(), base);
        return {
          id: uniek(slug(a.kop)),
          nr,
          titel,
          html,
          tekst: `${nr} ${titel} ${platteTekst(html)} ${straffen.map((s) => s.label).join(' ')}`.toLowerCase(),
          straffen,
        };
      }),
    }));
}
