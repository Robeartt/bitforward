const { generateWallet } = require('@stacks/wallet-sdk');

async function getPrivateKey() {
    try {
        // Get mnemonic from command line argument
        const mnemonic = process.argv[2];

        if (!mnemonic) {
            console.error('Error: No mnemonic provided');
            console.error('Usage: node get-private-key.js "your mnemonic phrase here"');
            return;
        }

        console.log('Generating wallet from mnemonic...');
        const wallet = await generateWallet({
            secretKey: mnemonic,
            password: '', // No password for simplicity
        });

        const privateKey = wallet.accounts[0].stxPrivateKey;
        console.log(privateKey);

    } catch (error) {
        console.error('Error generating wallet:', error);
        console.error(error.stack);
    }
}

getPrivateKey();