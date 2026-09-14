// Suodatuksen metatiedot: kurssin OSAT (part) ja AIHEPIIRIT (category).
//
// Nämä ovat kaksi erillistä, ristiin käytettävää ulottuvuutta:
//   - part     = kurssin osa / ajallinen eteneminen (Del 1 / 2 / 3)
//   - category = aihepiiri (mahdollistaa kertauksen yli osarajojen)
//
// Kaikki datatiedostot (vocabulary/phrases/writingTasks/fillBlanks) käyttävät
// näitä samoja id-arvoja. Jos lisäät oikean kurssimateriaalin, voit käyttää
// näitä samoja arvoja tai lisätä uusia rivejä tähän — käyttöliittymä päivittyy
// automaattisesti. `label` on suomenkielinen näyttönimi käyttöliittymässä.

export const PARTS = [
  { id: 1, label: 'Del 1', subtitle: 'Studier & småprat' },
  { id: 2, label: 'Del 2', subtitle: 'Arbetslivet & kommunikation' },
  { id: 3, label: 'Del 3', subtitle: 'Min bransch (ICT)' },
]

export const CATEGORIES = [
  { id: 'smaprat', label: 'Small talk' },
  { id: 'opiskelu', label: 'Opiskelu' },
  { id: 'tyoelama', label: 'Työelämä' },
  { id: 'viestinta', label: 'Viestintä' },
  { id: 'ict', label: 'ICT' },
]

// Apufunktiot: id -> näyttönimi. Palauttavat id:n itsensä jos nimeä ei löydy,
// jotta uusi (vielä nimeämätön) kategoria ei kaada käyttöliittymää.
export const categoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id

export const partLabel = (id) =>
  PARTS.find((p) => p.id === id)?.label ?? `Del ${id}`
