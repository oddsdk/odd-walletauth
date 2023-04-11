import { Crypto, Storage } from "@oddjs/odd"
import { publicKeyToDid } from "@oddjs/odd/did/index"

import * as Wallet from "./implementation.js"


export async function did(
  crypto: Crypto.Implementation,
  storage: Storage.Implementation,
  wallet: Wallet.Implementation
): Promise<string> {
  const pubKey = await wallet.publicSignature.key(storage)
  return publicKeyToDid(crypto, pubKey, wallet.publicSignature.type)
}
