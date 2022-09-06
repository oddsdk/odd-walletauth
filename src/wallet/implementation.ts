import { ETHEREUM_IMPLEMENTATION } from "./implementation/ethereum.ts"
import { Implementation } from "./implementation/types.ts"


export let impl: Implementation = ETHEREUM_IMPLEMENTATION


export function set(i: Partial<Implementation>): void { impl = { ...impl, ...i } }
