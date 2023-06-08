export const NETWORK_NAMES = {
    '1': 'Ethereum Mainnet',
    '5': 'Goerli Testnet',
    '11155111': 'Sepolia Testnet',
} as Record<string, string>;

export const EXPLORERS = {
    '1': 'https://etherscan.io',
    '5': 'https://goerli.etherscan.io',
    '11155111': 'https://sepolia.etherscan.io',
} as Record<string, string>;

export const ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/i;
export const CONTRACT_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/i;