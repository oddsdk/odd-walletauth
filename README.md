Use the [Webnative SDK](https://github.com/fission-codes/webnative#readme) with a blockchain wallet. Access your personal encrypted file system with your wallet keys.


## Usage

```ts
import * as walletauth from "webnative-walletauth"
import { AppScenario } from "webnative"

// Set up Ethereum

import * as ethereum from "webnative-walletauth/wallet/implementation/ethereum.ts"

ethereum.setProvider(window.ethereum) // Metamask

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

You can also use a custom wallet.

```ts
import * as walletImpl from "webnative-walletauth/wallet/implementation.ts"
import { Implementation } from "webnative-walletauth/wallet/implementation/types.ts"


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