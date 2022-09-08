import * as auth from "webnative/auth/index.js"
import * as dataRoot from "webnative/data-root.js"
import * as debug from "webnative/common/debug.js"
import * as did from "webnative/did/index.js"
import * as appState from "webnative/auth/state/app.js"
import * as cidLog from "webnative/common/cid-log.js"
import * as path from "webnative/path.js"
import * as setup from "webnative/setup.js"
import * as storage from "webnative/storage/index.js"
import * as ucan from "webnative/ucan/index.js"
import * as ucanInternal from "webnative/ucan/internal.js"

import { AppState, InitialisationError, checkFileSystemVersion, crypto, isSupported, loadFileSystem } from "webnative"
import { USERNAME_STORAGE_KEY, authenticatedUsername } from "webnative/common/index.js"

import { decodeCID } from "webnative/common/cid.js"
import { leave } from "webnative/auth.js"
import { isUsernameAvailable, storeFileSystemRootKey } from "webnative/lobby/index.js"
import { setImplementations } from "webnative/setup.js"

import { getSimpleLinks } from "webnative/fs/protocol/basic.js"
import { PublicFile } from "webnative/fs/v1/PublicFile.js"
import { PublicTree } from "webnative/fs/v1/PublicTree.js"
import FileSystem from "webnative/fs/filesystem.js"

import * as readKey from "./read-key"
import * as walletUcan from "./ucan"
import * as wallet from "./wallet"

import { USE_WALLET_AUTH_IMPLEMENTATION } from "./auth/implementation"
import { hasProp } from "./common"



// ⛰


export const ROOT_PERMISSIONS = { fs: { private: [ path.root() ], public: [ path.root() ] } }
export const READ_KEY_PATH = path.file(path.Branch.Public, ".well-known", "read-key")



// 🚀



export async function app(options?: { resetWnfs?: boolean; useWnfs?: boolean }): Promise<AppState> {
  let fs

  options = options || {}

  const { resetWnfs = false, useWnfs = true } = options

  setImplementations(USE_WALLET_AUTH_IMPLEMENTATION)

  // Check if browser is supported
  if (hasProp(self, "isSecureContext") && self.isSecureContext === false) throw InitialisationError.InsecureContext
  if (await isSupported() === false) throw InitialisationError.UnsupportedBrowser

  // Authenticate & create user if necessary
  const username = await wallet.username()
  const isNewUser = await isUsernameAvailable(username) === true

  let authedUsername = await authenticatedUsername()
  if (resetWnfs || isNewUser || username !== authedUsername) {
    await leave({ withoutRedirect: true })
    authedUsername = null
  }

  // Ensure UCAN store
  await ucanInternal.store([])

  // Make new account if necessary & delegate to new key-pair
  if (!authedUsername) {
    if (isNewUser) {
      const { success } = await auth.register({ username })
      if (!success) throw new Error("Failed to create Fission user")
    }

    // Authenticate
    await storage.setItem(USERNAME_STORAGE_KEY, username)

    // Self-authorize a filesystem UCAN if needed
    if (useWnfs) {
      const u = ucan.encode(await walletUcan.build({
        issuer: await wallet.did(),
        audience: await did.ucan(),
        potency: "SUPER_USER",
        lifetimeInSeconds: 60 * 60 * 24 * 30 * 12 * 1000, // 1000 years
      }))

      await ucanInternal.store([ u ])
    }
  }

  // Create or load WNFS
  if (useWnfs) {
    let cid

    const isOnline = navigator.onLine
    const dataPointer = isNewUser || resetWnfs || !isOnline ? null : await dataRoot.lookup(username)
    const [ logIdx ] = dataPointer ? await cidLog.index(dataPointer.toString()) : [ -1, 0 ]

    if (!isOnline) {
      // Offline, use local CID
      debug.log("📓 Offline, using last available file system")
      cid = decodeCID(await cidLog.newest())

    } else if (!dataPointer) {
      // No DNS CID yet
      cid = await cidLog.newest()
      cid = cid ? decodeCID(cid) : null
      if (cid) debug.log("📓 No DNSLink, using local CID:", cid.toString())
      else debug.log("📓 Creating a new file system")

    } else if (logIdx === 0) {
      // DNS is up to date
      cid = dataPointer
      debug.log("📓 DNSLink is up to date:", cid.toString())

    } else if (logIdx > 0) {
      // DNS is outdated
      cid = decodeCID(await cidLog.newest())
      const idxLog = logIdx === 1 ? "1 newer local entry" : logIdx + " newer local entries"
      debug.log("📓 DNSLink is outdated (" + idxLog + "), using local CID:", cid.toString())

    } else {
      // DNS is newer
      cid = dataPointer
      await cidLog.add(cid.toString())
      debug.log("📓 DNSLink is newer:", cid.toString())

    }

    if (!cid) {
      // New FS
      const rootKey = await crypto.aes.genKeyStr()

      fs = await FileSystem.empty({
        permissions: ROOT_PERMISSIONS,
        rootKey: rootKey,
      })

      await fs.write(
        READ_KEY_PATH,
        await readKey.encrypt(rootKey)
      )

      await fs.addPublicExchangeKey()
      await fs.mkdir(path.directory("private", "Apps"))
      await fs.mkdir(path.directory("private", "Audio"))
      await fs.mkdir(path.directory("private", "Documents"))
      await fs.mkdir(path.directory("private", "Photos"))
      await fs.mkdir(path.directory("private", "Video"))

      const rootCid = await fs.publish()

      await cidLog.clear()
      await cidLog.add(rootCid.toString())

    } else {
      // Existing FS
      const publicCid = decodeCID((await getSimpleLinks(cid)).public.cid)
      const publicTree = await PublicTree.fromCID(publicCid)
      const unwrappedPath = path.unwrap(READ_KEY_PATH)
      const publicPath = unwrappedPath.slice(1)
      const readKeyChild = await publicTree.get(publicPath)

      if (!readKeyChild) {
        throw new Error(`Expected an encrypted read key at: ${path.log(publicPath)}`)
      }

      if (!PublicFile.instanceOf(readKeyChild)) {
        throw new Error(`Did not expect a tree at: ${path.log(publicPath)}`)
      }

      const encryptedRootKey = readKeyChild.content
      if (encryptedRootKey.constructor.name !== "Uint8Array") {
        throw new Error("The read key was not a Uint8Array as we expected")
      }

      const rootKey = await readKey.decrypt(encryptedRootKey as Uint8Array)

      await storeFileSystemRootKey(rootKey)
      await checkFileSystemVersion(cid)

      fs = await FileSystem.fromCID(cid, { permissions: ROOT_PERMISSIONS })

    }
  }

  return appState.scenarioAuthed(username, fs || undefined)
}


// 🙈


export { setup }
