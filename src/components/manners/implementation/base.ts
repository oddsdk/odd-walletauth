import * as Manners from "webnative/components/manners/implementation"

import * as FileSystem from "webnative/fs/types"
import * as FileSystemProtocol from "webnative/fs/protocol/basic"
import * as Path from "webnative/path/index"
import * as RootKey from "webnative/common/root-key"
import * as WebnativeManners from "webnative/components/manners/implementation/base"

import { PublicFile } from "webnative/fs/v1/PublicFile"
import { PublicTree } from "webnative/fs/v1/PublicTree"
import { CID, decodeCID } from "webnative/common/cid"

import * as Wallet from "../../../wallet/implementation.js"


// 🏔


export const READ_KEY_PATH = Path.file(Path.Branch.Public, ".well-known", "read-key")



// 🛳


export async function implementation(
  wallet: Wallet.Implementation,
  opts: Manners.ImplementationOptions
): Promise<Manners.Implementation> {
  const base = WebnativeManners.implementation(opts)

  return {
    ...base,

    fileSystem: {
      ...base.fileSystem,
      hooks: {
        ...base.fileSystem.hooks,

        afterLoadNew: async (fs: FileSystem.API, account: FileSystem.AssociatedIdentity, dataComponents: Manners.DataComponents) => {
          const readKey = await RootKey.retrieve({
            crypto: dataComponents.crypto,
            accountDID: account.rootDID,
          })

          await fs.write(
            READ_KEY_PATH,
            await wallet.encrypt(readKey)
          )

          return base.fileSystem.hooks.afterLoadNew(fs, account, dataComponents)
        },
        beforeLoadExisting: async (dataRoot: CID, account: FileSystem.AssociatedIdentity, dataComponents: Manners.DataComponents) => {
          const { crypto, depot, reference } = dataComponents

          if (await RootKey.exists({ crypto: crypto, accountDID: account.rootDID }) === true) return

          const publicCid = decodeCID((await FileSystemProtocol.getSimpleLinks(depot, dataRoot)).public.cid)
          const publicTree = await PublicTree.fromCID(depot, reference, publicCid)
          const unwrappedPath = Path.unwrap(READ_KEY_PATH)
          const publicPath = unwrappedPath.slice(1)
          const readKeyChild = await publicTree.get(publicPath)

          if (!readKeyChild) {
            throw new Error(`Expected an encrypted read key at: ${Path.log(publicPath)}`)
          }

          if (!PublicFile.instanceOf(readKeyChild)) {
            throw new Error(`Did not expect a tree at: ${Path.log(publicPath)}`)
          }

          const encryptedRootKey = readKeyChild.content
          const rootKey = await wallet.decrypt(encryptedRootKey)

          RootKey.store({
            crypto: crypto,
            accountDID: account.rootDID,
            readKey: rootKey
          })
        },
      }
    }
  }
}