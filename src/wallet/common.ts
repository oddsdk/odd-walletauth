import * as Crypto from "webnative/components/crypto/implementation.js"
import { publicKeyToDid } from "webnative/did/index.js"

import * as Wallet from "./implementation.js"


export async function did(
  crypto: Crypto.Implementation,
  wallet: Wallet.Implementation
): Promise<string> {
  const pubKey = await wallet.publicSignatureKey()
  return publicKeyToDid(crypto, pubKey.key, pubKey.type)
}