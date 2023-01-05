import { Storage } from "webnative"


export type Implementation = {
  decrypt: (encryptedMessage: Uint8Array) => Promise<Uint8Array>
  encrypt: (storage: Storage.Implementation, data: Uint8Array) => Promise<Uint8Array>
  init: (storage: Storage.Implementation, args: InitArgs) => Promise<void>

  /**
   * Properties of the key used for signing.
   *
   * The magic bytes are the `code` found in https://github.com/multiformats/multicodec/blob/master/table.csv
   * encoded as a variable integer (more info about that at https://github.com/multiformats/unsigned-varint).
   *
   * The key type is also found in that table.
   * It's the name of the codec minus the `-pub` suffix.
   *
   * Example
   * -------
   * Ed25519 public key
   * Key type: "ed25519"
   * Magic bytes: [ 0xed, 0x01 ]
   */
  publicSignature: {
    type: string
    magicBytes: Uint8Array
    key: (storage: Storage.Implementation) => Promise<Uint8Array>
  }
  sign: (data: Uint8Array) => Promise<Uint8Array>
  ucanAlgorithm: string
  username: () => Promise<string>
  verifySignedMessage: (storage: Storage.Implementation, args: VerifyArgs) => Promise<boolean>
}


export type InitArgs = {
  onAccountChange: () => Promise<unknown>
  onDisconnect: () => Promise<unknown>
}


export type VerifyArgs = {
  signature: Uint8Array
  message: Uint8Array
  publicKey?: Uint8Array
}
