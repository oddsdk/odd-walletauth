import * as uint8arrays from "uint8arrays"
import * as wn from "webnative"
import * as debug from "webnative/common/debug.js"

import { CID } from "multiformats/cid"
import { decodeCID } from "webnative/common/cid.js"
import { getSimpleLinks } from "webnative/fs/protocol/basic.js"
import RootTree from "webnative/fs/root/tree.js"
import { PublicFile } from "webnative/fs/v1/PublicFile.js"
import { PublicTree } from "webnative/fs/v1/PublicTree.js"
import { Resource, Ucan } from "webnative/ucan/types.js"
import { FileSystem } from "webnative/fs/filesystem.js"

import { USERNAME_STORAGE_KEY } from "webnative/common/index.js"
import { AppScenario } from "webnative/auth/state/app.js"
import * as storage from "webnative/storage/index.js"

import * as ethereum from "./ethereum.js"


// ⛰


export const FISSION_API_DID = "did:key:zStEZpzSMtTt9k2vszgvCwF4fLQQSyA15W5AQ4z3AR6Bx4eFJ5crJFbuGxKmbma4"
export const WNFS_PERMISSIONS = { fs: { private: [ wn.path.root() ], public: [ wn.path.root() ] } }
export const READ_KEY_PATH = wn.path.file(wn.path.Branch.Public, ".well-known", "read-key")



// 🚀


export async function login(): Promise<FileSystem | null> {
  const appState = await wn.app({
    useWnfs: true
  })

  switch (appState.scenario) {
    case AppScenario.NotAuthed:
      console.log("NotAuthed")
      const username = await ethereum.username()
      const isNewUser = await hasFissionAccount(username) === false
      const ethereumDID = await ethereum.did()
      const webnativeDID = await wn.did.ucan()

      // Create user if necessary
      console.log("isNewUser", isNewUser)
      if (isNewUser) {
        console.log("Creating new Fission account", ethereumDID)
        const { success } = await createFissionAccount(ethereumDID)
        if (!success) manageError("Failed to create Fission user")
      }

      // Authenticate
      const ucan = await createUcan({
        issuer: ethereumDID,
        audience: webnativeDID,
        potency: "SUPER_USER",
        lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years
      })

      storage.setItem(USERNAME_STORAGE_KEY, username)
      storage.setItem("ucan", wn.ucan.encode(ucan))

      // Load FS
      const fs = await login()

      if (fs) {
        await fs.addPublicExchangeKey()
        await fs.mkdir(wn.path.directory("private", "Apps"))
        await fs.mkdir(wn.path.directory("private", "Audio"))
        await fs.mkdir(wn.path.directory("private", "Documents"))
        await fs.mkdir(wn.path.directory("private", "Photos"))
        await fs.mkdir(wn.path.directory("private", "Video"))
        await fs.publish()
      }

      return fs

    case AppScenario.Authed:
      console.log("Authed")
      return appState.fs || null
  }
}


/**
 * Log into Fission with Ethereum.
 */
export async function loginWithEncryptedReadKey(): Promise<FileSystem> {
  let dataRoot

  const username = await ethereum.username()
  const isNewUser = await hasFissionAccount(username) === false

  console.log("isNewUser", isNewUser)

  // Create user if necessary
  if (isNewUser) {
    console.log("Creating new Fission account")
    const { success } = await createFissionAccount(await ethereum.did())
    if (!success) manageError("Failed to create Fission user")
  }

  // Load, or create, WNFS
  console.log("Looking up data root")
  dataRoot = isNewUser ? null : await wn.dataRoot.lookup(username)

  let fs

  if (!dataRoot) {
    // New user or new FS
    const readKey = await wn.crypto.aes.genKeyStr()

    console.log("Creating new WNFS")
    fs = await wn.fs.empty({
      permissions: WNFS_PERMISSIONS,
      rootKey: readKey,
      localOnly: true
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

    await updateDataRoot(await fs.root.put())
    console.log("Published")

    return fs

  } else {
    // Existing user & FS
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

    RootTree.storeRootKey(readKey)

    fs = await wn.fs.fromCID(
      dataRoot,
      { localOnly: true, permissions: WNFS_PERMISSIONS }
    )

    if (!fs) throw new Error("Was unable to load the filesystem from the data root: " + dataRoot)

    return fs

  }
}



// 🛠


export async function createFissionAccount(did: string) {
  const endpoints = wn.setup.endpoints({})
  const apiEndpoint = `${endpoints.api}/${endpoints.apiVersion}/api`

  // Create UCAN
  const ucan = wn.ucan.encode(await createUcan({
    issuer: did,
    audience: FISSION_API_DID,
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


export async function updateDataRoot(cidInstance: CID): Promise<{ success: boolean }> {
  const issuer = await ethereum.did()
  const fsUcan = await createUcan({
    issuer,
    audience: issuer,
    potency: "APPEND",
    lifetimeInSeconds: 180
  })

  const endpoints = wn.setup.endpoints({})

  const apiEndpoint = `${endpoints.api}/${endpoints.apiVersion}/api`
  const cid = cidInstance.toString()

  // Debug
  debug.log("🌊 Updating your DNSLink:", cid)

  // Make API call
  return await fetchWithRetry(`${apiEndpoint}/user/data/${cid}`, {
    headers: async () => {
      const jwt = wn.ucan.encode(await createUcan({
        issuer,
        audience: FISSION_API_DID,
        potency: "APPEND",
        proof: wn.ucan.encode(fsUcan)
      }))

      return { "authorization": `Bearer ${jwt}` }
    },
    retries: 100,
    retryDelay: 5000,
    retryOn: [ 502, 503, 504 ],

  }, {
    method: "PUT"

  }).then((response: Response) => {
    if (response.status < 300) debug.log("🪴 DNSLink updated:", cid)
    else debug.log("🔥 Failed to update DNSLink for:", cid)
    return { success: response.status < 300 }

  }).catch(err => {
    debug.log("🔥 Failed to update DNSLink for:", cid)
    console.error(err)
    return { success: false }

  })
}



// 🛠  ~  UCAN


export async function createUcan({
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



// ㊙️


type RetryOptions = {
  headers: () => Promise<{ [ _: string ]: string }>
  retries: number
  retryDelay: number
  retryOn: Array<number>
}


async function fetchWithRetry(
  url: string,
  retryOptions: RetryOptions,
  fetchOptions: RequestInit,
  retry = 0
): Promise<Response> {
  const headers = await retryOptions.headers()
  const response = await fetch(url, {
    ...fetchOptions,
    headers: { ...fetchOptions.headers, ...headers }
  })

  if (retryOptions.retryOn.includes(response.status)) {
    if (retry < retryOptions.retries) {
      return await new Promise((resolve, reject) => setTimeout(
        () => fetchWithRetry(url, retryOptions, fetchOptions, retry + 1).then(resolve, reject),
        retryOptions.retryDelay
      ))
    } else {
      throw new Error("Too many retries for fetch")
    }
  }

  return response
}


function manageError(err: string) {
  alert(`Error: ${err}`)
  throw new Error(err)
}