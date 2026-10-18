# WoofLabin julkisen GitHub-repon päivitys

Kohde: https://github.com/BOT-TI/wooflab

Paketin oletusohje on englanninkielinen README.md. Repon englanninkielinen
DEPLOYMENT.md on README:n ensisijainen deploy-ohje. Tämä paketti korvaa
edellisen version.

Jos käytit jo aiempaa public-päivitystä, käytä vain
`english-deploy-only.patch`-tiedostoa README.md:n ohjeen mukaan. Muussa
tapauksessa käytä alla olevaa koko päivitystä.

Päivitys on valmisteltu repon commitista
`6f1e49c0db94fe0c0cbd556897efbe3e696c1b97`. Suoraa GitHub-kirjoitusoikeutta ei
ollut käytettävissä, joten muutoksia ei ole vielä pushattu repoosi.

## Mitä päivitys sisältää

- Englanninkielinen README, Byte-kuva ja linkit sivustolle.
- Suomen- ja englanninkieliset käyttöönotto-ohjeet.
- Englanninkielinen DEPLOYMENT.md repon oletusohjeeksi deployamiseen.
- GitHub Actions: riippuvuuksien asennus, 15 nykyistä testiä, build ja sivutarkistus.
- Issue-lomakkeet, PR-pohja sekä osallistumis- ja tietoturvaohjeet.
- Repon, sivuston ja issue-seurannan tiedot package.jsoniin; versio 1.0.2.

Päivitys ei sisällä muutoksia sivuston asetuksiin, kuviin, sovelluskoodiin,
tietokantaan tai Cloudflaren wrangler-asetuksiin. Nykyiset tuotannon
Supabase-asetukset säilyvät. Riippuvuusversiot pysyvät samoina.

## Vie päivitys GitHubiin Windowsissa

1. Pura ZIP erilliseen kansioon.
2. Kopioi `wooflab-public.patch` oman projektisi juureen, jossa package.json on.
3. Avaa VS Coden terminaali tai PowerShell.
4. Aja seuraavat komennot yksi kerrallaan. Jos jokin komento epäonnistuu,
   pysähdy siihen ja tarkista virheilmoitus ennen seuraavaa komentoa.

```powershell
cd "C:\Users\Tommi\Desktop\wooflab"
git pull --ff-only
git apply --check .\wooflab-public.patch
git apply .\wooflab-public.patch
git add -- README.md DEPLOYMENT.md CHANGELOG.md CONTRIBUTING.md SECURITY.md docs .github package.json package-lock.json
git commit -m "Prepare WoofLab public repository"
git push
```

`git apply --check` tarkistaa ensin, että päivitys sopii paikallisiin
tiedostoihin. Paketti ei vaihda GitHub-repon näkyvyyttä; repo oli jo julkinen.

Päivityksen mukana tulevaa patch-tiedostoa ja näitä toimitusohjeita ei tarvitse
commitoida. Yllä oleva git add valitsee vain varsinaiset projektimuutokset.

Pushin jälkeen GitHubin Actions-välilehdelle ilmestyy CI-työnkulku. Cloudflare
Pages käynnistää oman buildin ja julkaisun Git-integraation kautta erikseen.

## GitHubin About-tiedot

Voit täydentää repon About-osaan nämä tiedot:

| Kenttä | Arvo |
| --- | --- |
| Description | Small paws. Big ideas. A creative playground built with Vite, Cloudflare Pages and Supabase. |
| Website | https://wooflab.eu |
| Topics | wooflab, vite, cloudflare-pages, supabase, vanilla-javascript, guestbook |

Package.jsonin metadata ei muuta GitHubin About-kenttiä automaattisesti.

## Tehdyt tarkistukset

- 15/15 testiä läpäisi.
- Tuotantobuild onnistui.
- Kuuden sivun, linkkien, kuvien ja julkisen konfiguraation tarkistus onnistui.
- Dokumentaation paikalliset linkit sekä CI:n ja issue-lomakkeiden YAML tarkistettiin.
- Tunnistettavien salaisten avainten tarkistus ei löytänyt osumia.
- Tuotannon public/site-config.json säilytettiin muuttumattomana.

Lisätiedot ja patchin SHA-256-tarkiste ovat tiedostossa update-info.json.
