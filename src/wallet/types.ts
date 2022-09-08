export type Implementation = {
  decrypt: (encryptedMessage: Uint8Array) => Promise<Uint8Array>
  did: () => Promise<string>
  encrypt: (data: Uint8Array) => Promise<Uint8Array>
  sign: (data: Uint8Array) => Promise<Uint8Array>
  ucanAlgorithm: string
  username: () => Promise<string>
  verifySignedMessage: (args: { signature: Uint8Array; message: Uint8Array; publicKey?: Uint8Array }) => Promise<boolean>
}
