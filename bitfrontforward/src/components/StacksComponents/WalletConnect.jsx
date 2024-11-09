import { useStacks } from '../../context/StacksContext';

export default function WalletConnect() {
  const { stacksUser, connectWallet, disconnectWallet } = useStacks();

  return (
    <div className="flex items-center">
      {!stacksUser ? (
        <button
          onClick={connectWallet}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Connect Stacks Wallet
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-gray-300">
              {stacksUser.profile.stxAddress.testnet.slice(0, 6)}...
              {stacksUser.profile.stxAddress.testnet.slice(-4)}
            </span>
            <span className="text-xs text-gray-400">Testnet</span>
          </div>
          <button
            onClick={disconnectWallet}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}