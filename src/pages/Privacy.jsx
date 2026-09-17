import AuthShell from '../components/AuthShell'
import { ROUTES } from '../lib/routes'

// -----------------------------------------------------------------------------
// Privacy (/tietoa)
// -----------------------------------------------------------------------------
// Public "about + privacy" page, linked from Landing's footer. Static content,
// no state — just AuthShell for the shared page frame.
// -----------------------------------------------------------------------------

export default function Privacy() {
  return (
    <AuthShell kicker="Tietosuoja" title="Tietoa ja tietosuoja" backTo={ROUTES.landing}>
      <div className="mt-4 space-y-6 text-base leading-relaxed text-muted">
        <section>
          <h2 className="font-display text-xl font-bold text-ink">Tekijä</h2>
          <p className="mt-2">
            Sovelluksen on tehnyt <strong className="font-semibold text-ink">Jeremia Vepsäläinen</strong>{' '}
            oppiprojektina JAMK-opintojen aikana.
          </p>
          <p className="mt-2">
            Lähdekoodi:{' '}
            <a
              href="https://github.com/mrjerkkuu/Language_learner"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent underline underline-offset-2"
            >
              github.com/mrjerkkuu/Language_learner
            </a>
          </p>
          <p className="mt-2">
            Kysymyksiä tai palautetta?{' '}
            <a
              href="mailto:jeremia.projektit@gmail.com"
              className="font-semibold text-accent underline underline-offset-2"
            >
              jeremia.projektit@gmail.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">Tietosuoja</h2>

          <h3 className="mt-4 text-base font-semibold text-ink">Mitä tietoa kerätään</h3>
          <p className="mt-2">Kun rekisteröidyt, tallennamme:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>sähköpostiosoitteesi ja näyttönimesi</li>
            <li>
              salasanasi — <strong className="font-semibold text-ink">ei koskaan selväkielisenä</strong>, vain
              kryptografisena tiivisteenä (hashina), jota ei voi muuttaa takaisin alkuperäiseksi salasanaksi
            </li>
            <li>
              oppimisedistymisesi (mitkä sanat/fraasit olet harjoitellut ja kuinka hyvin) ja päivittäinen
              harjoitteluaktiivisuutesi
            </li>
          </ul>

          <h3 className="mt-4 text-base font-semibold text-ink">Miksi tietoa kerätään</h3>
          <p className="mt-2">
            Jotta voit kirjautua sisään ja edistymisesi säilyy laitteesta ja selaimesta riippumatta.
          </p>

          <h3 className="mt-4 text-base font-semibold text-ink">Kolmannet osapuolet</h3>
          <p className="mt-2">
            Sivustolla käytetään{' '}
            <a
              href="https://umami.is"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent underline underline-offset-2"
            >
              Umami
            </a>
            -kävijäseurantaa. Se on evästeetön eikä tallenna henkilöä yksilöivää tietoa.
          </p>
          <p className="mt-2">
            Emme jaa tietojasi kenellekään muulle kolmannelle osapuolelle emmekä käytä niitä mainontaan.
          </p>

          <h3 className="mt-4 text-base font-semibold text-ink">Miten voit vaikuttaa tietoihisi</h3>
          <p className="mt-2">
            Jos haluat, että tietosi poistetaan kokonaan, ota yhteyttä yllä olevaan sähköpostiosoitteeseen —
            poistamme tilisi ja siihen liittyvän datan.
          </p>

          <h3 className="mt-4 text-base font-semibold text-ink">Kokeile ilman tiliä</h3>
          <p className="mt-2">
            Jos et halua luoda tiliä, voit käyttää sovellusta demo-tilassa — tällöin mitään tietoa ei tallenneta
            palvelimelle, vain omaan selaimeesi väliaikaisesti.
          </p>
        </section>
      </div>
    </AuthShell>
  )
}
