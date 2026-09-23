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

**K3 — Muodot: täysi taivutusharjoitus, ruotsi (VALMIS, haarassa
`feat/k3-muodot`, ei vielä mainissa):** vanha kevyt Muodot (en/ett + muutama
määräinen muoto) korvattu kokonaan.
- *Harjoitus:* sana kysytään taivutusketjuna askel kerrallaan, monivalintana
  sanan omista muodoista, ja palaute tulee heti. Verbit: preesens → imperfekti →
  perfekti (supinum). Substantiivit: en/ett → määräinen muoto (→ monikko → määräinen
  monikko, jos `askPlural`). Lopuksi yhteenveto koko ketjusta. Valinta
  *Kaikki sanat / Verbit / Substantiivit* lisäksi osa- ja kategoriasuodattimen.
- *SR-malli (välimuoto):* jokainen muoto on oma korttinsa (`<id>:<muoto>`, esim.
  `wf-vb-v070:preteritum`), ja sana valitaan vaikeimman muodon painon mukaan
  (`srLogic.pickNext` sellaisenaan, `src/lib/wordFormsLogic.js`). srLogiciin,
  palvelimeen ja skeemaan ei tullut muutoksia. Vanhojen `wf-art-*`/`wf-def-*`-korttien
  edistyminen jää orvoksi (hyväksytty).
- *Data, SALDO-menetelmä:* taivutusmuodot haetaan SALDOsta (Språkbanken Text,
  Göteborgs universitet, Karp v7 -rajapinta, CC BY 4.0) skriptillä
  `scripts/fetch-saldo-forms.mjs` → `src/data/sv/wordForms.json` (`{ source, verbs,
  nouns }`). Säännöt ovat testattuina puhtaina funktioina `src/lib/saldoForms.js`:ssä.
  Ylläpitäjä ei osaa ruotsia, joten SALDOn yksiselitteiset osumat hyväksytään
  automaattisesti ja osumattomat jätetään pois. Muotoja ei tarkisteta rivi riviltä,
  ja jokaisella rivillä on SALDO-`lemgram`, jolla sen voi jäljittää lähteeseen.
  Tulos: 235 verbiketjua (245 sanaston riviä) ja 163 substantiivia; pois jäi
  2 verbiä ja 72 substantiivia (pääosin alojen nimiä, ammattinimikkeitä ja yhdyssanoja).
  **Päivitys:** aja skripti uudelleen, kun sanasto muuttuu, ja pistokoe `--verify`-lipulla.
- *Lähdemaininta:* `source`-kenttä datassa, `NOTICE`-tiedosto ja linkki Muodot-sivun
  alalaidassa.
- *Englanti:* Muodot piilotettu englannilta (ks. "Myöhempää harkintaa").
- *Session-rajaus* lisätty myöhemmin K4:ssä (ks. alla, osittain valmis).

---

## Havaittu koodikonventio

- **Älä kutsu toisen komponentin/contextin `setState`:a tai verkko-/tallennuskutsua `setState`-updater-funktion SISÄLLÄ** — laske arvo ensin, tee sivuvaikutus erillisenä lauseena. Syy: React voi ajaa updater-funktion useammin kuin kerran per tilanmuutos (esim. Strict Moden dev-only kaksinkertainen ajo), joten sen sisällä oleva sivuvaikutus voi toistua tahattomasti. Havaittu käytännössä `PhraseBank.jsx`:n `logActivity`-kutsussa (tuplasi `POST /api/activity/record`:n joka fraasin paljastuksella + Reactin oma "Cannot update a component while rendering a different component" -varoitus); korjattu myös ennaltaehkäisevästi `ProgressContext.jsx`:n `setData`:ssa.

---

## Jäljellä olevat korjaukset / parannukset

### K4. Harjoittelusession koon rajaus (Sanakortit/Muodot/Kirjoitus/Quiz)
- **Sanakortit + Muodot: VALMIS (2026-09-23, haara `feat/session-size`).**
  - Ennen jokaista sessiota näytetään valintanäyttö (`SessionSizePicker`): koko **5 / 10 / 15 / 20**
    (Muodoissa **sanoja**, 1 sana = 2–4 askelta). Valinta ei käynnistä sessiota; "Aloita" käynnistää.
  - Edellinen koko muistetaan esivalittuna, **erikseen kummallekin moduulille**
    (`flashcard-session-size-v1`, `forms-session-size-v1`, laitekohtainen, `useSessionSize`).
    Oletus ensimmäisellä kerralla: Sanakortit 20, Muodot 10.
  - `buildSession(dataMap, items, { size })`: opitut ja uudet `max(1, floor(koko/10))` kumpikin,
    loput harjoiteltuja → 5 = 3+1+1 · 10 = 8+1+1 · 15 = 13+1+1 · 20 = 16+2+2.
  - Muodot kokoaa session samalla `buildSession`:lla sanatason tilasta (`wordStateMap`, vaikein
    muoto ratkaisee). Uusi session tulosnäkymä: sanat kokonaan oikein / osittain / kokonaan
    väärin + vastaukset yhteensä + sanalista. Muotokohtaiset SR-kortit (`<id>:<muoto>`) ja
    tallennus ennallaan; testi todistaa, että aiempi edistyminen säilyy ja jatkuu.
  - Molemmissa tulosnäytöissä "Uusi sessio" (takaisin valintaan) ja "Valikkoon".
- **Jäljellä: Kirjoitus ja Quiz.** Quizissa on kiinteä `SESSION_SIZE = 10`, ja Kirjoitus käy
  koko listan läpi. Samaa `SessionSizePicker`- ja `useSessionSize`-mallia voi käyttää niihin.

---

## Myöhempää harkintaa
- AI-tarkistus kirjoitusharjoituksiin (`aiService.js`-rajapinta valmiina).
- Lisää opeteltavia kieliä (rakenne tukee jo).
- Sähköpostivarmennus + salasanan palautus (Vaihe 3:n jälkeen).
- **Muodot englanniksi:** Muodot-moduuli on piilotettu englannilta (K3). Se palautetaan, kun
  englannille on koneluettavaa taivutusdataa samalla menetelmällä kuin ruotsille:
  generointiskripti + avoin rakenteinen sanakirjalähde + automaattisesti hyväksytyt
  yksiselitteiset osumat + lähdemaininta. Ruotsin lähde oli SALDO (Språkbanken, Karp v7
  -rajapinta, CC BY 4.0), joka ei kata englantia, joten englannille valitaan eri lähde.
  Palautus: korvaa `wordForms: null` englannin datalla (`contentService.js`); Home ja reittisuoja
  näyttävät moduulin silloin automaattisesti.
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
