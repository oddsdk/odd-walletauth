Use the [Webnative SDK](https://github.com/fission-codes/webnative#readme) with a blockchain wallet. Access your personal encrypted file system with your wallet keys.


## Usage

Uses Ethereum by default with `window.ethereum` as the provider. Currently only works with MetaMask because it's the only wallet with encryption and decryption.

```ts
import * as walletauth from "webnative-walletauth"
import { AppScenario } from "webnative"

// Initialise

const appState = await walletauth.app()

switch (appState.scenario) {
  case AppScenario.Authed:
    // ✅ Authenticated
    break;

  case AppScenario.NotAuthed:
    // Failed to authenticate with wallet
    break;
}
```

Use a custom Ethereum provider:

```ts
import * as ethereum from "webnative-walletauth/wallet/ethereum.ts"

ethereum.setProvider(window.ethereum)
```

You can also write an implementation for other wallets.

```ts
import * as walletImpl from "webnative-walletauth/wallet/implementation.ts"
import { Implementation } from "webnative-walletauth/wallet/types.ts"


const impl: Implementation = {
  decrypt:              () => Promise.resolve(...),
  did:                  () => Promise.resolve(...),
  encrypt:              () => Promise.resolve(...),
  sign:                 () => Promise.resolve(...),
  username:             () => Promise.resolve(...),
  verifySignedMessage:  () => Promise.resolve(...),
}

// NOTE: run this before you call `walletAuth.app()`
walletImpl.set(impl)
```