import * as uint8arrays from "uint8arrays"


export async function decrypt(encrypted: Uint8Array): Promise<string> {
  return uint8arrays.toString(
    await ethereum.decrypt(encrypted),
    "base64pad"
  )
}

export function encrypt(readKey: string): Promise<Uint8Array> {
  return ethereum.encrypt(
    uint8arrays.fromString(readKey, "base64pad")
  )
}