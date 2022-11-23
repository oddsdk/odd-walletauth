import * as BrowserCrypto from "webnative/components/crypto/implementation/browser.js"
import * as Crypto from "webnative/components/crypto/implementation.js"

import * as Wallet from "../../../wallet/implementation.js"


// 🛳


export async function implementation(
  wallet: Wallet.Implementation,
  opts: Crypto.ImplementationOptions
): Promise<Crypto.Implementation> {
  const browserCrypto = await BrowserCrypto.implementation(opts)
  const pubKey = await wallet.publicSignatureKey()

  return {
    aes: browserCrypto.aes,
    hash: browserCrypto.hash,
    misc: browserCrypto.misc,
    rsa: browserCrypto.rsa,

    did: {
      keyTypes: {
        ...browserCrypto.did.keyTypes,

        [ pubKey.type ]: {
          magicBytes: pubKey.magicBytes,
          verify: wallet.verifySignedMessage
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
      getAlgorithm: async () => pubKey.type,
      getUcanAlgorithm: async () => wallet.ucanAlgorithm,
      publicWriteKey: () => wallet.publicSignatureKey().then(a => a.key),
      sign: wallet.sign
    }
  }
}