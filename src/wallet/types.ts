export type Implementation = {
  decrypt: (encryptedMessage: Uint8Array) => Promise<Uint8Array>
  did: () => Promise<string>
  encrypt: (data: Uint8Array) => Promise<Uint8Array>
  init: (args: InitArgs) => Promise<void>
  sign: (data: Uint8Array) => Promise<Uint8Array>
  ucanAlgorithm: string
  username: () => Promise<string>
  verifySignedMessage: (args: VerifyArgs) => Promise<boolean>
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
