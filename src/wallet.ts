import { impl } from "./wallet/implementation"
import { InitArgs, VerifyArgs } from "./wallet/types"


export const decrypt = (encryptedMessage: Uint8Array) => impl.decrypt(encryptedMessage)
export const did = () => impl.did()
export const encrypt = (data: Uint8Array) => impl.encrypt(data)
export const init = (args: InitArgs) => impl.init(args)
export const sign = (data: Uint8Array) => impl.sign(data)
export const ucanAlgorithm = () => impl.ucanAlgorithm
export const username = () => impl.username()
export const verifySignedMessage = (args: VerifyArgs) => impl.verifySignedMessage(args)
