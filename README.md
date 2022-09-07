Use the [Webnative SDK](https://github.com/fission-codes/webnative#readme) with a blockchain wallet. Access your personal encrypted file system with your wallet keys.

## Usage

Uses Ethereum by default with `window.ethereum` as the provider. Currently only works with MetaMask because it's the only wallet with encryption and decryption.

```ts
import * as walletauth from "webnative-walletauth";
import { Scenario } from "webnative";

// Initialise

const appState = await walletauth.app();

switch (appState.scenario) {
  case Scenario.Authed:
    // ✅ Authenticated
    break;

  case Scenario.NotAuthed:
    // Failed to authenticate with wallet
    break;
}
```

Use a custom Ethereum provider:

```ts
import * as ethereum from "webnative-walletauth/wallet/ethereum.ts";

ethereum.setProvider(window.ethereum);
```

**You can also write an implementation for other wallets.** Note that the DID method has to be supported by the [Fission server](https://github.com/fission-codes/fission), unless you're using something else with webnative. At the moment of writing, you can only use the `key` method for DIDs with the Fission servers. It supports ED25519, RSA and SECP256K1 keys.

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
