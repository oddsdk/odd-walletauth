import { impl } from "./wallet/implementation"


export const decrypt = (encryptedMessage: Uint8Array) => impl.decrypt(encryptedMessage)
export const did = () => impl.did()
export const encrypt = (data: Uint8Array) => impl.encrypt(data)
export const sign = (data: Uint8Array) => impl.sign(data)
export const ucanAlgorithm = () => impl.ucanAlgorithm
export const username = () => impl.username()
export const verifySignedMessage = (args: { signature: Uint8Array; message: Uint8Array; publicKey?: Uint8Array }) => impl.verifySignedMessage(args)
