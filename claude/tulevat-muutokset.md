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

---

## Vaihe 3 — Backend + kirjautuminen + tietokanta  ⭐ SEURAAVAKSI
Backend-suunnitelma: **`vaihe-3-suunnitelma.md`**. Stack: Node.js + Fastify, sessiot (httpOnly),
relaatiokanta + Prisma (SQLite→Postgres), hosting läppäri + Tailscale Funnel. Ei toteutettu vielä
(odottaa serverikoneen pystytystä).

Kirjautumissivun (frontin) suunnitelma: **`kirjautuminen-suunnitelma.md`** — landing + login + rekisteröinti,
pakollinen kirjautuminen + demotila, näyttönimi+sähköposti+salasana, AuthContext/ProtectedRoute,
virheviestit, tietoturva, testit. Valmis suunnitelmana, toteutus backendin yhteydessä.

**Testit laajennetaan tässä vaiheessa:** palvelintestit (Fastify `inject` → API/auth/route-guard),
oma testi-SQLite, samaan CI:hin.

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

---

## Myöhempää harkintaa
- AI-tarkistus kirjoitusharjoituksiin (`aiService.js`-rajapinta valmiina).
- Lisää opeteltavia kieliä (rakenne tukee jo).
- Sähköpostivarmennus + salasanan palautus (Vaihe 3:n jälkeen).
