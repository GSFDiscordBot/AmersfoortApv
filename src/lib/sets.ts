export interface RegelSet {
  slug: string;
  titel: string;
  lang: string;
  beschrijving: string;
}

// slug = bestandsnaam in src/content/regels/ (zonder .md)
export const sets: RegelSet[] = [
  {
    slug: 'apv',
    titel: 'APV',
    lang: 'Algemene Plaatselijke Verordening',
    beschrijving: 'De serverregels: alles wat niet met de roleplay zelf te maken heeft, met de bijbehorende straffen.',
  },
  {
    slug: 'wetboek',
    titel: 'Wetboek AFR',
    lang: 'Wetboek Amersfoort',
    beschrijving: 'Alle wetten voor burgers: strafbare feiten met celstraf en boete.',
  },
  {
    slug: 'onderwereld',
    titel: 'Onderwereld',
    lang: 'Regels voor de Onderwereld',
    beschrijving: 'Overvallen, gangs en criminele activiteiten: wat wel en niet mag.',
  },
  {
    slug: 'hulpdiensten',
    titel: 'Hulpdiensten',
    lang: 'Regels voor de Hulpdiensten',
    beschrijving: 'Politie, ambulance en andere hulpdiensten: bevoegdheden en procedures.',
  },
  {
    slug: 'risicogebieden',
    titel: 'Gebieden',
    lang: 'Risico-, douane- en no-flygebieden',
    beschrijving: 'Waar preventief fouilleren mag en waar niet gevlogen mag worden.',
  },
  {
    slug: 'kosten',
    titel: 'Kosten',
    lang: 'Kosten en tarieven',
    beschrijving: 'Prijzen van ANWB, Advocatuur, Politie en Vliegschool.',
  },
  {
    slug: 'informatie',
    titel: 'Informatie',
    lang: 'Informatie over straffen en support',
    beschrijving: 'Bezwaar, bewijs, donaties en andere algemene afspraken.',
  },
];
