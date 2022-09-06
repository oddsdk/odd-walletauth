import { ETHEREUM_IMPLEMENTATION } from "./ethereum"
import { Implementation } from "./types"


export let impl: Implementation = ETHEREUM_IMPLEMENTATION


export function set(i: Partial<Implementation>): void { impl = { ...impl, ...i } }
