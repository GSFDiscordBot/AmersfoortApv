export interface RegelSet {
  slug: string;
  titel: string;
  lang: string;
  beschrijving: string;
  icoon: string;
}

export const sets: RegelSet[] = [
  {
    slug: 'apv',
    titel: 'APV',
    lang: 'Algemene Plaatselijke Verordening',
    beschrijving: 'De basisregels voor iedereen in de stad, met boetes en straffen.',
    icoon: '⚖️',
  },
  {
    slug: 'wetboek',
    titel: 'Wetboek AFR',
    lang: 'Wetboek van Amersfoort RolePlay',
    beschrijving: 'Strafbare feiten, straffen en hoe de rechtspraak werkt.',
    icoon: '📖',
  },
  {
    slug: 'onderwereld',
    titel: 'Onderwereld',
    lang: 'Regels voor de Onderwereld',
    beschrijving: 'Overvallen, gangs, criminele activiteiten en wat wel en niet mag.',
    icoon: '🕶️',
  },
  {
    slug: 'hulpdiensten',
    titel: 'Hulpdiensten',
    lang: 'Regels voor de Hulpdiensten',
    beschrijving: 'Politie, ambulance, brandweer en hun bevoegdheden en procedures.',
    icoon: '🚨',
  },
  {
    slug: 'risicogebieden',
    titel: 'Risicogebieden',
    lang: 'Risicogebieden in de stad',
    beschrijving: 'Waar gelden extra regels of verhoogde risico’s in de nieuwe stad.',
    icoon: '⚠️',
  },
];
