import { ETHEREUM_IMPLEMENTATION } from "./implementation/ethereum.js"
import { Implementation } from "./implementation/types.js"


export let impl: Implementation = ETHEREUM_IMPLEMENTATION


export function set(i: Partial<Implementation>): void { impl = { ...impl, ...i } }
