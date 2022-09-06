import { ETHEREUM_IMPLEMENTATION } from "./ethereum.ts"
import { Implementation } from "./types.ts"


export let impl: Implementation = ETHEREUM_IMPLEMENTATION


export function set(i: Partial<Implementation>): void { impl = { ...impl, ...i } }
