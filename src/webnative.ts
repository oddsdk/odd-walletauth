import * as uint8arrays from "uint8arrays"
import * as wn from "webnative"

import * as api from "webnative/common/api.js"
import * as appState from "webnative/auth/state/app.js"
import * as cidLog from "webnative/common/cid-log.js"
import * as storage from "webnative/storage/index.js"
import * as ucanInternal from "webnative/ucan/internal.js"

import { AppState, InitialisationError, authenticatedUsername } from "webnative"
import { Resource, Ucan } from "webnative/ucan/types.js"

import { BASE_IMPLEMENTATION } from "webnative/auth/implementation/base.js"
import { USE_WNFS_IMPLEMENTATION } from "webnative/auth/implementation/use-wnfs.js"
import { USERNAME_STORAGE_KEY } from "webnative/common/index.js"

import { decodeCID } from "webnative/common/cid.js"
import { setImplementations } from "webnative/setup"

import { getSimpleLinks } from "webnative/fs/protocol/basic.js"
import { PublicFile } from "webnative/fs/v1/PublicFile.js"
import { PublicTree } from "webnative/fs/v1/PublicTree.js"

import * as ethereum from "./ethereum.js"



// ⛰


export const WNFS_PERMISSIONS = { fs: { private: [ wn.path.root() ], public: [ wn.path.root() ] } }
export const READ_KEY_PATH = wn.path.file(wn.path.Branch.Public, ".well-known", "read-key")



// 🚀



export async function app(options?: { resetWnfs?: boolean, useWnfs?: boolean }): Promise<AppState> {
  let dataRoot, fs

  options = options || {}

  const { resetWnfs = false, useWnfs = true } = options

  if (useWnfs) {
    setImplementations(USE_WNFS_IMPLEMENTATION)
  } else {
    setImplementations(BASE_IMPLEMENTATION)
  }

  if (resetWnfs) await wn.leave({ withoutRedirect: true })

  // Check if browser is supported
  if (globalThis.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await wn.isSupported() === false) throw InitialisationError.UnsupportedBrowser

  const authedUsername = await authenticatedUsername()

  // Authenticate & create user if necessary
  const username = await ethereum.username()
  const isNewUser = await hasFissionAccount(username) === false

  if (!authedUsername) {
    const ethereumDID = await ethereum.did()
    const webnativeDID = await wn.did.ucan()

    if (isNewUser) {
      const { success } = await createFissionAccount(ethereumDID)
      if (!success) throw new Error("Failed to create Fission user")
    }

    // Authenticate
    await storage.setItem(USERNAME_STORAGE_KEY, username)

    // Self-authorize a filesystem UCAN if needed
    if (useWnfs) {
      const ucan = wn.ucan.encode(await createES256KUcan({
        issuer: ethereumDID,
        audience: webnativeDID,
        potency: "SUPER_USER",
        lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years
      }))

      await ucanInternal.store([ ucan ])
    }
  }

  if (useWnfs) {
    dataRoot = isNewUser ? null : await wn.dataRoot.lookup(username)

    if (!dataRoot || resetWnfs) {
      // New FS
      const readKey = await wn.crypto.aes.genKeyStr()

      fs = await wn.fs.empty({
        permissions: WNFS_PERMISSIONS,
        rootKey: readKey,
      })

      await fs.write(
        READ_KEY_PATH,
        await encryptReadKey(readKey)
      )

      await fs.addPublicExchangeKey()
      await fs.mkdir(wn.path.directory("private", "Apps"))
      await fs.mkdir(wn.path.directory("private", "Audio"))
      await fs.mkdir(wn.path.directory("private", "Documents"))
      await fs.mkdir(wn.path.directory("private", "Photos"))
      await fs.mkdir(wn.path.directory("private", "Video"))

      const rootCid = await fs.publish()

      await cidLog.clear()
      await cidLog.add(rootCid.toString())

    } else {
      // Existing FS
      const publicCid = decodeCID((await getSimpleLinks(dataRoot)).public.cid)
      const publicTree = await PublicTree.fromCID(publicCid)
      const unwrappedPath = wn.path.unwrap(READ_KEY_PATH)
      const publicPath = unwrappedPath.slice(1)
      const readKeyChild = await publicTree.get(publicPath)

      if (!readKeyChild) {
        throw new Error(`Expected an encrypted read key at: ${wn.path.log(publicPath)}`)
      }

      if (!PublicFile.instanceOf(readKeyChild)) {
        throw new Error(`Did not expect a tree at: ${wn.path.log(publicPath)}`)
      }

      const encryptedReadKey = readKeyChild.content
      if (encryptedReadKey.constructor.name !== "Uint8Array") {
        throw new Error("The read key was not a Uint8Array as we expected")
      }

      const readKey = await decryptReadKey(encryptedReadKey as Uint8Array)

      wn.lobby.storeFileSystemRootKey(readKey)

      fs = await wn.loadFileSystem(WNFS_PERMISSIONS, username, readKey)

    }
  }

  return appState.scenarioAuthed(username, fs)
}



// 🛠


export async function createFissionAccount(did: string) {
  const endpoints = wn.setup.endpoints({})
  const apiEndpoint = `${endpoints.api}/${endpoints.apiVersion}/api`

  // Create UCAN
  const ucan = wn.ucan.encode(await createES256KUcan({
    issuer: did,
    audience: await api.did(),
  }))

  // API request
  const response = await fetch(`${apiEndpoint}/user`, {
    method: "PUT",
    headers: {
      "authorization": `Bearer ${ucan}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: await ethereum.email(),
      username: await ethereum.username()
    })
  })

  return {
    success: response.status < 300
  }
}


export async function hasFissionAccount(username: string): Promise<boolean> {
  return wn.lobby.isUsernameAvailable(username).then((a: boolean) => !a)
}



// 🛠  ~  UCAN


export async function createES256KUcan({
  audience,
  issuer,
  lifetimeInSeconds = 90,
  potency,
  proof,
  resource
}: {
  audience: string
  issuer: string
  lifetimeInSeconds?: number
  potency?: string
  proof?: string
  resource?: Resource
}): Promise<Ucan> {
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)

  const header = {
    alg: "ES256K",
    typ: "JWT",
    uav: "1.0.0"
  }

  const payload = {
    aud: audience,
    exp: currentTimeInSeconds + lifetimeInSeconds,
    fct: [],
    iss: issuer,
    nbf: currentTimeInSeconds - 90,
    prf: proof || null,
    ptc: potency || null,
    rsc: resource || "*",
  }

  const encodedHeader = wn.ucan.encodeHeader(header)
  const encodedPayload = wn.ucan.encodePayload(payload)
  const signature = uint8arrays.toString(
    await ethereum.sign(
      uint8arrays.fromString(
        `${encodedHeader}.${encodedPayload}`,
        "utf8"
      )
    ),
    "base64url"
  )

  return {
    header,
    payload,
    signature
  }
}


export async function decryptReadKey(encrypted: Uint8Array): Promise<string> {
  return uint8arrays.toString(
    await ethereum.decrypt(encrypted),
    "base64pad"
  )
}


export function encryptReadKey(readKey: string): Promise<Uint8Array> {
  return ethereum.encrypt(
    uint8arrays.fromString(readKey, "base64pad")
  )
}


export async function verifyUcanSignature(ucan: Ucan): Promise<boolean> {
  const message = uint8arrays.fromString(
    `${wn.ucan.encodeHeader(ucan.header)}.${wn.ucan.encodePayload(ucan.payload)}`,
    "utf8"
  )

  const signature = uint8arrays.fromString(
    ucan.signature || "",
    "base64url"
  )

  return ethereum.verifySignedMessage({
    signature: signature,
    message,
    publicKey: await ethereum.publicSignatureKey()
  })
}
