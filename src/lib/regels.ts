import { marked } from 'marked';

export interface Artikel {
  id: string;
  nr: string;
  titel: string;
  html: string;
  tekst: string; // platte tekst, voor zoeken
  categorie?: string; // bijv. "Categorie 6"
  catNr?: string; // bijv. "6"
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
  const m = zonder.match(/^((?:[IVX]+-\d+)|(?:A\d+)|(?:\d+(?:\.\s?[A-Z]+|\.\d+)?))\s*[-–—]?\s*(.*)$/);
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

// Haalt "| Straf | Categorie 6 |" uit de tekst en geeft het los terug
function haalStraf(body: string): { body: string; categorie?: string; catNr?: string } {
  const re = /^\|\s*Straf\s*\|([^\n]*)\n\|[\s:|-]+\|[ \t]*\n?/m;
  const m = body.match(re);
  if (!m) return { body };
  const cellen = m[1].split('|').map((c) => c.trim()).filter(Boolean);
  const label = cellen.join(' · ');
  const nr = label.match(/(?:categorie|catogorie|cat\.?)\s*(\d+)/i)?.[1];
  if (!nr) return { body };
  return { body: body.replace(re, ''), categorie: label.replace(/catogorie/i, 'Categorie'), catNr: nr };
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

function render(md: string, base: string): string {
  let html = marked.parse(md, { async: false, gfm: true }) as string;
  html = html
    .replace(/(src|href)="(?:\.\.\/|\/)?img\//g, `$1="${base}/img/`)
    .replace(/<table[\s\S]*?<\/table>/g, (t) => pilTabel(t) ?? `<div class="tw">${t}</div>`);
  return html;
}

const platteTekst = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

export function parseRegels(bron: string, base: string): Hoofdstuk[] {
  const tekst = admonitions(bron.replace(/\r\n/g, '\n').replace(/\t/g, '    '));
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
        const { body, categorie, catNr } = haalStraf(a.regels.join('\n'));
        const html = render(body.trim(), base);
        return {
          id: uniek(slug(a.kop)),
          nr,
          titel,
          html,
          tekst: `${nr} ${titel} ${platteTekst(html)} ${categorie ?? ''}`.toLowerCase(),
          categorie,
          catNr,
        };
      }),
    }));
}
