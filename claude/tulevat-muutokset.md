# Tulevat muutokset — Language Learner

Repo: https://github.com/mrjerkkuu/Language_learner

## ✅ Tehty

**Vaihe 1 — UI/logiikka:** Oikein/Väärin-arviointi (johdettu helppo/vaikea), 3D-kääntymisanimaatio, piilotettu scrollbar.

**Vaihe 2 — monikielisyys + muodot:** ruotsi + englanti, kielivalinta, per-kieli edistyminen, contentService-kerros, Muodot-moduuli (kevyt).

**UI-korjaukset & hionta:**
- K1 — pillerit/chipit eivät enää leikkaannu (pystypadding scroll-riveihin).
- K2 — moduulikorttien väli korjattu (flex `gap-[7px]`; syy: `space-y` ei toimi inline-`<a>`:lla).
- Tumma tila (dark mode) — seuraa laitteen asetusta + käsikytkin aloitussivulla.
- Pehmeät sivunvaihtoanimaatiot (fade+slide, kunnioittaa reduced-motionia).
- Pienten tyylierojen yhtenäistys (fraasipankin kategoriachipit samaan tyyliin).
- I18n-korjaus: kaikki suodatinlabelit (aluepillerit + "Small talk" → "Rupattelu") suomeksi molemmille kielille; oppisisältö pysyy kohdekielellä.

**Vaihe 2.5 — Testit + CI (VALMIS):**
- **Vitest**-testisarja, **49 testiä / 8 tiedostoa, kaikki vihreitä.**
- *Puhdas logiikka:* `srLogic` (painot ×0.6/×2.0 + clamp, `learned`-johtaminen, `computeStats`, `pickNext` 2 min -suoja + painotus + excludeId), `activityLogic` (streak + viikkoyhteenveto), `quizLogic` (`distractorsFrom` sama kategoria+osa ensin/uniikit/oikea määrä, `weightedSample`), `shuffle`.
- *Datan validointi (per kieli):* uniikit id:t, jokainen sana antaa 3 distractoria, fillBlanksissa `___` + vastaus, wordForms-optioissa aina oikea vastaus, writingTasks hyvinmuodostuneita, contentServicen fallback.
- *Komponentti/integraatio (RTL + jsdom):* Flashcard (tap-flip + Oikein/Väärin → per-kieli SR-storage), Home (moduulilaskurit LanguageContextista sv/en + FilterContextin aluerajaus, laskurit johdettu oikeasta datasta), Quiz (koko session läpipeluu → tulosruutu + jokainen vastaus kirjautuu SR:ään).
- *Infra:* `vite.config.js` test-lohko, `src/test/setup.js` (jest-dom + per-testi localStorage/teema-reset), `src/test/renderWithProviders.jsx` (Language + Router + Filter).
- *CI:* `.github/workflows/deploy.yml` ajaa `npm run test` ennen buildia/julkaisua → **punaiset testit estävät julkaisun.** Ajetaan **Node 22:lla** (jsdom 30 / undici 8 vaatii sen).

**Vaihe 3 — Backend + kirjautuminen + tietokanta (VALMIS, tuotannossa):**
Node.js/Fastify + Prisma/SQLite (User/Progress/Activity), sessiot
(`@fastify/secure-session`, httpOnly+Secure+SameSite=Lax), argon2-hashays,
CSRF-suojaus, rate limiting, CSP (`@fastify/helmet`), progress/activity-sync
kirjautuneille käyttäjille. Julkaistu systemd-palveluna
(`language-learner.service`) + Tailscale Funnel. Suunnitelma:
`vaihe-3-suunnitelma.md` (ks. myös sen oma "✅ Toteutunut" -huomautus).

**Approval-gate — rekisteröinnin "pyydä pääsyä" -malli (VALMIS,
tuotannossa):** rekisteröinti luo käyttäjän mutta ei enää aloita sessiota
suoraan — tili odottaa admin-hyväksyntää (`User.approved`) ennen kuin
kirjautuminen onnistuu; `server/approve-user.js`-CLI admin-hyväksyntään
(lista + yksittäisen tilin hyväksyntä varmistuskysymyksellä). Committit
`4eaa65e..6e33963` (GitHub `main`).

**E1 — Fraasipankin kategoriachipit näkyvät aina (VALMIS):** poikkeus
8dfd15d:n yleissääntöön (joka piilottaa chipit "Kaikki"-tilassa) — toteutettu
vain `PhraseBank.jsx`:ään, koska fraasimäärä (181+) hyötyy selailusta myös
ilman aluevalintaa. `FilterBar.jsx` (Etusivu) ja Sanakortit säilyttävät
alkuperäisen piilotussäännön.

---

## Havaittu koodikonventio

- **Älä kutsu toisen komponentin/contextin `setState`:a tai verkko-/tallennuskutsua `setState`-updater-funktion SISÄLLÄ** — laske arvo ensin, tee sivuvaikutus erillisenä lauseena. Syy: React voi ajaa updater-funktion useammin kuin kerran per tilanmuutos (esim. Strict Moden dev-only kaksinkertainen ajo), joten sen sisällä oleva sivuvaikutus voi toistua tahattomasti. Havaittu käytännössä `PhraseBank.jsx`:n `logActivity`-kutsussa (tuplasi `POST /api/activity/record`:n joka fraasin paljastuksella + Reactin oma "Cannot update a component while rendering a different component" -varoitus); korjattu myös ennaltaehkäisevästi `ProgressContext.jsx`:n `setData`:ssa.

---

## Jäljellä olevat korjaukset / parannukset

### K3. Muodot-moduulin laajennus kattavaksi taivutusharjoitukseksi
- Nykyinen Muodot on kevyt (en/ett + muutama muoto). Halutaan **täysi taivutus**:
  - **Verbit:** perusmuoto → preesens → imperfekti (→ perfekti).
    - Ruotsi: infinitiv / presens / preteritum / supinum (*att gå → går → gick → gått*).
    - Englanti: base / present / past / past participle (*go → goes → went → gone*).
  - **Substantiivit:** laajemmin (epämääräinen/määräinen, yksikkö/monikko).
- Vaatii rikkaamman datamallin (`wordForms.json` / oma `verbs.json`) + tehtävätyypit per muoto.
- UI samalla 2a-tyylillä; Muodot-moduulin alatila (artikkelit / substantiivit / verbit) tai
  erillinen "Verbit"-tyyppi.
- **Ajoituspäätös (sanaston uudelleenrakennuksen yhteydessä):** CV-verbit
  (~200 kpl, cv_verbit.pdf) lisätään ensin Sanakortteina imperfektimuodossa
  sellaisenaan, jotta ne ovat heti käytössä. K3-laajennus (täysi taivutussarja
  infinitiivi→preesens→imperfekti→perfekti kaikille sanaluokille) tehdään
  omana projektinaan Tailscale Funnel -julkaisun jälkeen — samoja 200 verbiä
  voidaan silloin käyttää uudelleen täydellä taivutuksella.

### K4. Harjoittelusession koon rajaus (Sanakortit/Muodot/Kirjoitus/Quiz)
- Nykyisin käyttäjä käy aina läpi **koko kategorian** kortit kerralla kaikissa
  neljässä moduulissa — ei tapaa harjoitella lyhyttä, rajattua erää.
- Halutaan: valittavissa oleva session-koko (esim. 10–20 korttia) joka
  arvotaan/painotetaan koko kategoriasta sen sijaan että koko lista käydään
  läpi.
- **Painotuslogiikka on jo olemassa** — `srLogic.js`:n `weight`-pohjainen
  järjestelmä (vaikeat/väärin menneet useammin, opitut harvemmin) kelpaa
  sellaisenaan valinnan perustaksi.
- **Puuttuu:** UI-toteutus — session-koon valinta ennen harjoittelun alkua ja
  katkaisu N kortin jälkeen (nykyinen `pickNext`/session-kulku ei tunne
  "lopeta N:n jälkeen" -käsitettä).
- Ajoitus: nyt vapaa toteutettavaksi — Tailscale Funnel -julkaisu on jo
  tapahtunut (ks. Vaihe 3 + approval-gate yllä "✅ Tehty"-osiossa), joka oli
  aiemmin tämän kohdan ajoitusedellytys (ks. aiempi kirjaus "Myöhempää
  harkintaa" -osiossa, konsolidoitu tähän).

---

## Myöhempää harkintaa
- AI-tarkistus kirjoitusharjoituksiin (`aiService.js`-rajapinta valmiina).
- Lisää opeteltavia kieliä (rakenne tukee jo).
- Sähköpostivarmennus + salasanan palautus (Vaihe 3:n jälkeen).
- **Fraasipankin selattavuus isolla määrällä (120+ fraasia):** nykyinen
  "selaa ylhäältä alas" -malli raskastuu kun kategoriat kasvavat. Harkittavia
  ratkaisuja: (A) yksinkertainen tekstihaku/suodatus listan yläpuolelle —
  halvin toteuttaa; (B) fraaseille oma kevyt SR-painotus (osaan/en osaa
  -merkintä, ei täyttä oikea/väärä-logiikkaa kuten Sanakorteissa); (C) erillinen
  "Harjoittele"-näkymä nykyisen "Selaa"-näkymän rinnalle, joka näyttäisi
  rajatun satunnaisotannan painotettuna (B):n mukaan — yhdistettävissä samaan
  aikaan toteutettavan session-koon rajaus -idean kanssa (ks. K4 yllä).
  (D) note-kenttää (lisätty ensin voimakkuustason merkintään "Samaa vai eri
  mieltä" -kategoriassa) voisi käyttää myös suodattimena isoissa kategorioissa.
  Ajoitus: ensimmäisen julkaisun jälkeen (joka on jo tapahtunut), samassa
  yhteydessä kuin K4:n session-koon rajaus -ominaisuus, koska logiikka on
  osin jaettavissa.
