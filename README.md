Use the [ODD SDK](https://github.com/oddsdk/ts-odd#readme) with a blockchain wallet. Access your personal encrypted file system with your wallet keys.

## Usage

Uses Ethereum by default with `window.ethereum` as the provider. Currently only works with MetaMask because it's the only wallet with encryption and decryption.

```ts
import * as walletauth from "odd-walletauth";
import { AppScenario } from "@oddjs/odd";

// Initialise

const program = await walletauth.program({
  // optional event handlers
  onAccountChange: (newProgram) => handleProgram(newProgram),
  onDisconnect: () => {
    /* eg. logout() */
  },
});

handleProgram(program);

function handleProgram(program) {
  if (program.session) {
    // ✅ Authenticated
  } else {
    // Failed to authenticate with wallet
  }
}
```

Use a custom Ethereum provider:

```ts
import * as ethereum from "odd-walletauth/wallet/ethereum";

ethereum.setProvider(window.ethereum);
```

**You can also write an implementation for other wallets.** Note that the DID method has to be supported by the [Fission server](https://github.com/fission-codes/fission), unless you're using other services with the ODD SDK. At the moment of writing, you can only use the `key` method for DIDs with the Fission servers. It supports ED25519, RSA and SECP256K1 keys, same for the UCAN algorithms.

```ts
import { Implementation } from "odd-walletauth/wallet/implementation"

const impl: Implementation = {
  decrypt: (encryptedMessage: Uint8Array) => Promise<Uint8Array>,
  encrypt: (storage: Storage.Implementation, data: Uint8Array) => Promise<Uint8Array>,
  init: (storage: Storage.Implementation, args: InitArgs) => Promise<void>,
  publicSignature: {
    type: string
    magicBytes: Uint8Array
    key: (storage: Storage.Implementation) => Promise<Uint8Array>
  },
  sign: (data: Uint8Array) => Promise<Uint8Array>,
  ucanAlgorithm: string,
  username: () => Promise<string>,
  verifySignedMessage: (storage: Storage.Implementation, args: VerifyArgs) => Promise<boolean>,
}

// When creating a Program indicate that you want to use your custom wallet implementation.
walletauth.program({
  wallet: impl
})
```
