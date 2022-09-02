export type Implementation = {
  did: () => Promise<string>
  publicSignatureKey: () => Promise<Uint8Array>
  sign: (data: Uint8Array) => Promise<Uint8Array>
  username: () => Promise<string>
  verifySignedMessage: (args: { signature: Uint8Array; message: Uint8Array; publicKey: Uint8Array }) => Promise<boolean>
}
