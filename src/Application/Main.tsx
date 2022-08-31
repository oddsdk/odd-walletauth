import "@rainbow-me/rainbowkit/styles.css"
import { connectorsForWallets, RainbowKitProvider, wallet } from "@rainbow-me/rainbowkit"
import { chain, configureChains, createClient, WagmiConfig } from "wagmi"
import { publicProvider } from "wagmi/providers/public"
import ReactDOM from "react-dom/client"

import App from "./App"


const { chains, provider } = configureChains(
  [ chain.mainnet, chain.ropsten, chain.rinkeby, chain.goerli ],
  [ publicProvider() ]
)

const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [
      wallet.metaMask({ chains }),
      wallet.walletConnect({ chains })
    ],
  },
])

const wagmiClient = createClient({
  autoConnect: false,
  connectors,
  provider,
})

ReactDOM.createRoot(document.getElementById("app")!).render(
  <WagmiConfig client={wagmiClient}>
    <RainbowKitProvider coolMode chains={chains}>
      <App />
    </RainbowKitProvider>
  </WagmiConfig>
)
