import { Crypto, Storage } from "@oddjs/odd"

import * as BrowserCrypto from "@oddjs/odd/components/crypto/implementation/browser"
import * as Wallet from "../../../wallet/implementation.js"


// 🛳


export async function implementation(
  storage: Storage.Implementation,
  wallet: Wallet.Implementation,
  opts: Crypto.ImplementationOptions
): Promise<Crypto.Implementation> {
  const browserCrypto = await BrowserCrypto.implementation(opts)

  return {
    aes: browserCrypto.aes,
    hash: browserCrypto.hash,
    misc: browserCrypto.misc,
    rsa: browserCrypto.rsa,

    did: {
      keyTypes: {
        ...browserCrypto.did.keyTypes,

        [ wallet.publicSignature.type ]: {
          magicBytes: wallet.publicSignature.magicBytes,
          verify: (...args) => wallet.verifySignedMessage(storage, ...args)
        }
      }
    },

    keystore: {
      clearStore: browserCrypto.keystore.clearStore,
      exportSymmKey: browserCrypto.keystore.exportSymmKey,
      importSymmKey: browserCrypto.keystore.importSymmKey,
      keyExists: browserCrypto.keystore.keyExists,
      publicExchangeKey: browserCrypto.keystore.publicExchangeKey,

      decrypt: wallet.decrypt,
      getAlgorithm: async () => wallet.publicSignature.type,
      getUcanAlgorithm: async () => wallet.ucanAlgorithm,
      publicWriteKey: () => wallet.publicSignature.key(storage),
      sign: wallet.sign
    }
  }
}
