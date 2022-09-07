import * as uint8arrays from "uint8arrays"
import * as wallet from "./wallet"


export async function decrypt(encrypted: Uint8Array): Promise<string> {
  return uint8arrays.toString(
    await wallet.decrypt(encrypted),
    "base64pad"
  )
}

export function encrypt(readKey: string): Promise<Uint8Array> {
  return wallet.encrypt(
    uint8arrays.fromString(readKey, "base64pad")
  )
}
