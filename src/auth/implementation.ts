import type { Implementation } from "webnative/auth/implementation/types.js"

import * as api from "webnative/common/api.js"
import * as base from "webnative/auth/implementation/base.js"
import * as storage from "webnative/storage/index.js"
import * as ucan from "webnative/ucan/index.js"
import * as useWnfs from "webnative/auth/implementation/use-wnfs.js"

import { USERNAME_STORAGE_KEY } from "webnative/common/index.js"
import { setup } from "webnative/setup/internal.js"

import * as walletUcan from "../ucan.js"
import * as wallet from "../wallet.js"


// 🛠


async function register(options: { username: string; email?: string }): Promise<{ success: boolean }> {
  const endpoints = setup.endpoints
  const apiEndpoint = `${endpoints.api}/${endpoints.apiVersion}/api`

  // Create UCAN
  const u = ucan.encode(await walletUcan.build({
    issuer: await wallet.did(),
    audience: await api.did(),
  }))

  // API request
  const response = await fetch(`${apiEndpoint}/user`, {
    method: "PUT",
    headers: {
      "authorization": `Bearer ${u}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      username: await wallet.username()
    })
  })

  const success = response.status < 300

  if (success) {
    await storage.setItem(USERNAME_STORAGE_KEY, options.username)
    return { success: true }
  }
  return { success: false }
}



// 🛳


export const implementation: Implementation = {
  init: base.init,
  register: register,
  isUsernameValid: base.isUsernameValid,
  isUsernameAvailable: base.isUsernameAvailable,
  createChannel: base.createChannel,
  checkCapability: useWnfs.checkCapability,
  delegateAccount: useWnfs.delegateAccount,
  linkDevice: useWnfs.linkDevice
}


export const USE_WALLET_AUTH_IMPLEMENTATION = {
  auth: implementation
}
