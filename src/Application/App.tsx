import * as storage from "webnative/storage/index.js"
import * as wn from "webnative"
import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import Provider from "eip1193-provider"

import Header from "./components/Header"
import SignMessage from "./components/SignMessage"

import * as ethereum from "../ethereum.js"


const App = () => {
  const [ provider, setProvider ] = useState(null)
  const [ didSetup, setDidSetup ] = useState(false)
  const account = useAccount()
  const { isConnected } = account

  useEffect(() => {
    async function getProvider() {
      return account.connector
        ? await account.connector.getProvider()
        : null
    }

    if (isConnected) {
      console.log("✅ Connected")
      getProvider().then(p => { if (p) setProvider(p) })
    } else if (didSetup) {
      console.log("🛑 Disconnected")
      setProvider(null)
    }
  }, [ isConnected && !!account?.connector ])

  // Login when provider is set,
  // and logout when it is removed.
  useEffect(() => {
    if (provider) setup(provider, setDidSetup)
    else if (didSetup) teardown()
  }, [ provider ])

  // 🖼
  return (
    <div>
      <Header />

      {didSetup && provider
        ? <SignMessage />
        : null
      }
    </div>
  )
}


async function setup(prov: Provider, setDidSetup: React.Dispatch<React.SetStateAction<boolean>>) {
  console.log("💎 Setting up")
  ethereum.setProvider(prov)

  wn.setup.debug({ enabled: true })
  wn.setup.endpoints({
    api: "https://runfission.net",
    lobby: "https://auth.runfission.net",
    user: "fissionuser.net"
  })

  // @ts-ignore
  window.wn = wn

  setDidSetup(true)
}

async function teardown() {
  console.log("💥 Tearing down")
  await storage.removeItem("readKey")
  await storage.removeItem("ucan")
  await wn.leave({ withoutRedirect: true })
}


export default App;
