<p align="center"><img src="src/icons/icon-128.png" width="96" alt=""></p>

# RigForge Helper

Browser extension for **RigForge**, the PC builder for Brazilian gamers.
It does two things, only when you click a button on the RigForge site:

1. **Detects your PC:** graphics card, exact processor model and installed RAM, so RigForge can tell you how
   your current PC runs your games and what to upgrade.
2. **Fills your carts:** adds every part of a RigForge build to the KaBuM!, Pichau and Terabyte carts.
   **You** review each cart and check out yourself.

This repository exists so anyone can check what the extension does. It is small (~350 lines of plain JavaScript,
no dependencies, no build step, no minified code): read it in `src/`.

> **Português:** extensão do RigForge que detecta seu PC (placa de vídeo, processador e RAM) e coloca as peças de
> um PC montado no RigForge nos carrinhos da KaBuM!, Pichau e Terabyte. Ela **não envia nenhum dado para lugar
> nenhum**: não faz requisições de rede, não lê cookies, histórico, senhas nem outros sites. O código é aberto e
> auditado automaticamente a cada mudança. Veja [PRIVACY.md](PRIVACY.md).

## What it never does

- **No network requests of its own.** No `fetch`, XHR, WebSocket, beacons, analytics or remote code.
- **No access to cookies, history, bookmarks, downloads, passwords, or other websites.**
- **No checkout.** It never types card or payment details and never confirms a purchase.
- **No bypassing of human verification** (Cloudflare/CAPTCHA pages): it waits for you to solve them.

These are enforced in CI by [`scripts/audit.mjs`](scripts/audit.mjs), which fails the build if the code ever uses a
network or sensitive browser API, or if the manifest asks for any permission or site not listed there. A second
script, [`scripts/audit-selftest.mjs`](scripts/audit-selftest.mjs), plants those problems on purpose to prove the
audit catches them.

## Permissions, and why

| Permission | Why |
| --- | --- |
| `system.cpu` | Read the processor model (e.g. "AMD Ryzen 7 5800X3D") when you click **Detectar meu PC**. |
| `system.memory` | Read how much RAM is installed, for the same detection. |
| `offscreen` | Read the graphics card name through WebGL inside the extension (privacy browsers like Brave hide it from websites). |
| `tabs` | Open the store product pages one after another while filling your carts, then the carts and a report. |
| `storage` | Remember where it is in the cart-filling job (the browser can pause extensions in between) and the last report. Local only. |
| Host access to `kabum.com.br`, `pichau.com.br`, `terabyteshop.com.br` | Click "Comprar / Adicionar ao carrinho" on the product page it opened. |

It runs on exactly two kinds of sites (see `content_scripts` in [`src/manifest.json`](src/manifest.json)):

- the three stores above (`store.js`: acts only on the tab it opened itself, only on the product it was asked to add);
- the RigForge site (`site.js`: relays the site's "detect" and "fill carts" requests to the extension).

When filling carts it only opens pages on the three stores, or on these affiliate-link domains that redirect to
them: `awin1.com`, `lomadee.com`, `lomadee.com.br`, `lmdee.link` (RigForge may earn a commission; the price is the same).

## Data flow

```
RigForge page ──(postMessage, same tab)──► site.js ──► background.js
   "detect"                                              ├─ chrome.system.cpu / memory  (local)
                                                         └─ WebGL in the extension       (local)
   ◄──────────── { gpu, cpu, threads, ramBytes } ────────┘
```

The result goes only to the RigForge page you clicked on. The page fills in the form; it is saved to your RigForge
account only if you are signed in and click **Salvar**.

## Install

**From the stores:** coming soon (Chrome Web Store, which also serves Brave, Opera and Vivaldi; Edge Add-ons; Firefox Add-ons).

**From source (developer mode):**
1. Download this repository (or a release zip and unzip it).
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`), turn on **Developer mode**.
3. **Load unpacked** → select the `src` folder.

Firefox: `about:debugging` → *This Firefox* → *Load Temporary Add-on* → `src/manifest.json`. Firefox has no API for the
CPU model or RAM, so it detects the graphics card only.

| Browser | GPU | CPU model + RAM | Fill carts |
| --- | --- | --- | --- |
| Chrome, Edge, Brave, Opera, Vivaldi | yes | yes | yes |
| Firefox (121+) | yes | no | yes |

## Verify a release

Releases are built by GitHub Actions from a tagged commit, with a [build provenance attestation](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations).
The build is reproducible: the same source gives a byte-identical zip on any OS.

```bash
git clone https://github.com/EwertonRosendo/rigforge-helper && cd rigforge-helper
git checkout v0.3.0
node scripts/audit.mjs        # what it can and can't do
node scripts/build.mjs        # prints the zip's SHA-256: compare with SHA256SUMS on the release
gh attestation verify dist/rigforge-helper-0.3.0.zip --repo EwertonRosendo/rigforge-helper
```

Store copies are re-signed by each store, so their file differs, but the files inside are the same: unzip the store
package and compare against `SHA256SUMS` (it lists every file).

## Development

```bash
node scripts/audit.mjs && node scripts/audit-selftest.mjs   # security checks
node scripts/build.mjs                                      # dist/rigforge-helper-<version>.zip + SHA256SUMS
node scripts/make-icons.mjs                                 # regenerate src/icons
```

To point it at another RigForge address, add it to the `site.js` `matches` in `src/manifest.json` **and** to
`EXPECTED.siteScripts` in `scripts/audit.mjs` (the audit fails otherwise, on purpose).

## License

[MIT](LICENSE)
