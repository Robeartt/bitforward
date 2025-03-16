require('dotenv').config();
const {
    makeContractCall,
    broadcastTransaction,
    stringAsciiCV,
    uintCV,
    cvToValue,
    getAddressFromPrivateKey
} = require('@stacks/transactions');

// Check if we have the required environment variables
if (!process.env.PRIVATE_KEY) {
    console.error('Error: PRIVATE_KEY not found in .env file');
    console.error('Please add your private key to the .env file as PRIVATE_KEY=<private-key>');
    process.exit(1);
}

// Get configuration from environment variables
const privateKey = process.env.PRIVATE_KEY;
const contractName = process.env.CONTRACT_NAME || 'bitforward-oracle';

// Derive address from private key
const address = getAddressFromPrivateKey(privateKey, 'testnet');

// Log the wallet address
console.log(`Testnet Wallet Address: ${address}`);
console.log(`Using contract: ${address}.${contractName}`);

// Set price in oracle
async function setPrice(asset, price) {
    try {
        // Price should be scaled by 10^8
        const scaledPrice = Math.round(price * 100000000);

        console.log(`Setting price for ${asset} to ${price} (scaled value: ${scaledPrice})...`);

        const txOptions = {
            contractAddress: address,
            contractName: contractName,
            functionName: 'set-price',
            functionArgs: [stringAsciiCV(asset), uintCV(scaledPrice)],
            senderKey: privateKey,
            validateWithAbi: true,
            network: 'testnet',
            fee: 5000n, // in microSTX, using BigInt (note the 'n')
            anchorMode: 1 // AnchorMode.Any
        };

        const transaction = await makeContractCall(txOptions);
        const broadcastResponse = await broadcastTransaction({ transaction, network: 'testnet' });

        if (broadcastResponse.error) {
            console.error(`\nTransaction failed: ${broadcastResponse.error}`);
            return null;
        }

        console.log('\nTransaction successfully submitted!');
        console.log(`Transaction ID: ${broadcastResponse.txid}`);
        console.log('Check transaction status at:');
        console.log(`https://explorer.stacks.co/txid/${broadcastResponse.txid}?chain=testnet`);

        return broadcastResponse.txid;
    } catch (error) {
        console.error('\nError setting price:', error);
        console.error(error.stack);
        return null;
    }
}

// Main function
async function main() {
    // Parse command line arguments
    const asset = process.argv[2];
    const price = parseFloat(process.argv[3]);

    if (!asset || isNaN(price)) {
        console.error('Error: Both asset and price are required');
        console.error('Usage: node oracle-operations.js USD 65000.55');
        console.error('This will set the price of USD to 65000.55');
        process.exit(1);
    }

    // Set the price
    await setPrice(asset, price);

    // Since we can't use read-only functions reliably, just inform the user
    console.log('\nTransaction has been submitted.');
    console.log('You can check the updated price on the Stacks Explorer.');
}

main().catch(error => {
    console.error('Unhandled error in main:', error);
    console.error(error.stack);
});