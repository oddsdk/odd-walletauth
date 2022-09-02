import { impl } from "./wallet/implementation.js"


export const did = () => impl.did()
export const publicSignatureKey = () => impl.publicSignatureKey()
export const sign = (data: Uint8Array) => impl.sign(data)
export const username = () => impl.username()
export const verifySignedMessage = (args: { signature: Uint8Array; message: Uint8Array; publicKey: Uint8Array }) => impl.verifySignedMessage(args)