# Privacy policy: RigForge Helper

*Last updated: 2026-11-25*

**RigForge Helper does not collect, store on any server, sell or share any personal data.**
The extension makes no network requests of its own; this is checked automatically on every change
([`scripts/audit.mjs`](scripts/audit.mjs)).

## What it reads, and when

| Data | When | Where it goes |
| --- | --- | --- |
| Processor model, number of threads, installed RAM, graphics card name | Only when you click **Detectar meu PC** on the RigForge site | Returned to that RigForge page in the same tab. RigForge saves it to your account only if you are signed in and click **Salvar**. |
| The list of products of a RigForge build (store links and names) | When you click **Adicionar tudo aos carrinhos** | Kept in the browser's local extension storage while the carts are being filled, plus the last report. Never sent anywhere. |
| The product page it opened on KaBuM!, Pichau or Terabyte | While filling carts | Read only to find the "Comprar / Adicionar ao carrinho" button on that page. |

## What it never accesses

Cookies, passwords, form data, browsing history, bookmarks, downloads, other tabs, or any website other than the
three stores and the RigForge site.

## Affiliate links

When filling carts, the extension may open a store product through an affiliate link (Awin, Lomadee) provided by
RigForge, which may earn a commission. The price you pay is the same.

## Removing data

Uninstalling the extension deletes its local storage. Data you chose to save on RigForge can be deleted from your
RigForge account.

## Contact

Open an issue on this repository.

---

**Português (resumo):** a extensão não coleta nem envia nenhum dado. Ela só lê o processador, a RAM e a placa de vídeo
quando você clica em *Detectar meu PC*, e entrega isso apenas à página do RigForge aberta. Ao encher os carrinhos, guarda
a lista de produtos só no seu navegador. Nunca acessa cookies, senhas, histórico ou outros sites.
