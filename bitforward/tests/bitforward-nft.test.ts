import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

// Get simnet accounts for testing
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;
const wallet3 = accounts.get('wallet_3')!;

/*
 * Tests for the BitForward NFT contract
 */
describe('bitforward-nft', () => {
  // Constants for testing
  const contractId1 = 1;
  const contractId2 = 123;
  const invalidContractId = 0;

  // Error codes from the contract
  const errOwnerOnly = Cl.uint(300);
  const errNotTokenOwner = Cl.uint(301);
  const errTokenNotFound = Cl.uint(302);
  const errNotAuthorized = Cl.uint(303);

  describe('minting functions', () => {
    describe('mint-position', () => {
      it('allows contract owner to mint positions', () => {
        // Mint a position using the owner (deployer)
        const mintResult = simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet1),
          Cl.uint(contractId1)
        ], deployer); // deployer is the contract owner

        // Verify minting was successful
        expect(mintResult.result).toBeOk(Cl.uint(1)); // First NFT ID should be 1
      });

      it('prevents non-owners from minting positions', () => {
        // Try to mint with a non-owner wallet
        const unauthorizedMintResult = simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet2),
          Cl.uint(contractId1)
        ], wallet2); // wallet2 is not the contract owner

        // Verify minting fails with unauthorized error
        expect(unauthorizedMintResult.result).toBeErr(errNotAuthorized);
      });

      it('rejects minting with invalid contract ID (0)', () => {
        // Try to mint with contract ID 0 (invalid)
        const invalidMintResult = simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet1),
          Cl.uint(invalidContractId)
        ], deployer); // deployer is the contract owner

        // Verify minting fails with unauthorized error
        expect(invalidMintResult.result).toBeErr(errNotAuthorized);
      });

      it('assigns the correct owner to the minted NFT', () => {
        // Mint a position
        const mintResult = simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet1),
          Cl.uint(contractId1)
        ], deployer); // deployer is the contract owner

        const tokenId = 1; // Expected token ID

        // Verify the NFT owner is wallet1
        const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
          Cl.uint(tokenId)
        ], deployer);

        expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet1)));
      });

      it('increments token IDs correctly when minting multiple positions', () => {
        // Mint first position
        const mint1Result = simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet1),
          Cl.uint(contractId1)
        ], deployer); // deployer is the contract owner

        expect(mint1Result.result).toBeOk(Cl.uint(1)); // First NFT ID should be 1

        // Mint second position
        const mint2Result = simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet2),
          Cl.uint(contractId2)
        ], deployer); // deployer is the contract owner

        expect(mint2Result.result).toBeOk(Cl.uint(2)); // Second NFT ID should be 2

        // Mint third position
        const mint3Result = simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet3),
          Cl.uint(contractId2)
        ], deployer); // deployer is the contract owner

        expect(mint3Result.result).toBeOk(Cl.uint(3)); // Third NFT ID should be 3
      });
    });
  });

  describe('token metadata functions', () => {
    beforeEach(() => {
      // Mint a position as contract owner
      simnet.callPublicFn('bitforward-nft', 'mint-position', [
        Cl.principal(wallet1),
        Cl.uint(contractId2)
      ], deployer);
    });

    describe('get-token-uri', () => {
      it('returns the contract ID as the token URI', () => {
        // Get the token URI for token ID 1
        const uriResult = simnet.callReadOnlyFn('bitforward-nft', 'get-token-uri', [
          Cl.uint(1)
        ], deployer);

        // Verify the URI (contract ID) is correct
        expect(uriResult.result).toBeOk(Cl.some(Cl.uint(contractId2)));
      });

      it('returns the correct contract ID for multiple tokens', () => {
        // Mint a second position with a different contract ID
        simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet2),
          Cl.uint(contractId1)
        ], deployer);

        // Check first token's URI
        const uri1Result = simnet.callReadOnlyFn('bitforward-nft', 'get-token-uri', [
          Cl.uint(1)
        ], deployer);

        expect(uri1Result.result).toBeOk(Cl.some(Cl.uint(contractId2)));

        // Check second token's URI
        const uri2Result = simnet.callReadOnlyFn('bitforward-nft', 'get-token-uri', [
          Cl.uint(2)
        ], deployer);

        expect(uri2Result.result).toBeOk(Cl.some(Cl.uint(contractId1)));
      });

      it('returns 0 for non-existent tokens', () => {
        // Check URI for a token that doesn't exist
        const nonExistentTokenId = 999;
        const uriResult = simnet.callReadOnlyFn('bitforward-nft', 'get-token-uri', [
          Cl.uint(nonExistentTokenId)
        ], deployer);

        // Verify it returns 0 (default value)
        expect(uriResult.result).toBeOk(Cl.some(Cl.uint(0)));
      });
    });

    describe('get-owner', () => {
      it('returns the correct owner for a token', () => {
        // Check owner of token ID 1
        const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
          Cl.uint(1)
        ], deployer);

        // Verify the owner is wallet1
        expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet1)));
      });

      it('returns none for non-existent tokens', () => {
        // Check owner of a non-existent token
        const nonExistentTokenId = 999;
        const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
          Cl.uint(nonExistentTokenId)
        ], deployer);

        // Verify it returns none
        expect(ownerResult.result).toBeOk(Cl.none());
      });
    });

    describe('get-last-token-id', () => {
      // Note: We can't test "starts at 0" because beforeEach in the parent block already mints a token

      it('tracks the last token ID correctly after initial minting', () => {
        // We already minted one token in beforeEach, so check that first
        let lastTokenResult = simnet.callReadOnlyFn('bitforward-nft', 'get-last-token-id', [], deployer);
        expect(lastTokenResult.result).toBeOk(Cl.uint(1));

        // Mint a second position
        simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet2),
          Cl.uint(contractId1)
        ], deployer);

        // Verify last token ID increased
        lastTokenResult = simnet.callReadOnlyFn('bitforward-nft', 'get-last-token-id', [], deployer);
        expect(lastTokenResult.result).toBeOk(Cl.uint(2));

        // Mint a third position
        simnet.callPublicFn('bitforward-nft', 'mint-position', [
          Cl.principal(wallet3),
          Cl.uint(contractId2)
        ], deployer);

        // Verify last token ID increased again
        lastTokenResult = simnet.callReadOnlyFn('bitforward-nft', 'get-last-token-id', [], deployer);
        expect(lastTokenResult.result).toBeOk(Cl.uint(3));
      });
    });
  });

  describe('transfer functions', () => {
    beforeEach(() => {
      // Mint a position to wallet1 as contract owner
      simnet.callPublicFn('bitforward-nft', 'mint-position', [
        Cl.principal(wallet1),
        Cl.uint(contractId1)
      ], deployer);
    });

    describe('transfer', () => {
      it('allows the owner to transfer their NFT', () => {
        // Transfer the NFT from wallet1 to wallet2
        const transferResult = simnet.callPublicFn('bitforward-nft', 'transfer', [
          Cl.uint(1), // Token ID
          Cl.principal(wallet1), // Sender
          Cl.principal(wallet2)  // Recipient
        ], wallet1);

        // Verify transfer was successful
        expect(transferResult.result).toBeOk(Cl.bool(true));

        // Verify new ownership
        const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
          Cl.uint(1) // Token ID 1
        ], deployer);

        // Verify the new owner is wallet2
        expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
      });

      it('prevents non-owners from transferring the NFT', () => {
        // Attempt transfer from wallet2 (non-owner) to wallet3
        const transferResult = simnet.callPublicFn('bitforward-nft', 'transfer', [
          Cl.uint(1), // Token ID
          Cl.principal(wallet2), // Invalid sender (not the owner)
          Cl.principal(wallet3)  // Recipient
        ], wallet2);

        // Verify transfer fails with not-token-owner error
        expect(transferResult.result).toBeErr(errNotTokenOwner);

        // Verify ownership did not change
        const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
          Cl.uint(1) // Token ID 1
        ], deployer);

        // Verify the owner is still wallet1
        expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet1)));
      });

      it('prevents transferring non-existent tokens', () => {
        // Attempt to transfer a non-existent token
        const nonExistentTokenId = 999;
        const transferResult = simnet.callPublicFn('bitforward-nft', 'transfer', [
          Cl.uint(nonExistentTokenId), // Non-existent token ID
          Cl.principal(wallet1), // Sender
          Cl.principal(wallet2)  // Recipient
        ], wallet1);

        // Verify transfer fails with not-token-owner error
        expect(transferResult.result).toBeErr(errNotTokenOwner);
      });

      it('prevents transferring if sender is different from caller', () => {
        // Define a new error code for this specific check
        const errSenderNotTxSender = Cl.uint(304);

        // Attempt transfer with wallet1 as sender (owner) but wallet2 as caller
        const transferResult = simnet.callPublicFn('bitforward-nft', 'transfer', [
          Cl.uint(1), // Token ID
          Cl.principal(wallet1), // Valid sender (the owner)
          Cl.principal(wallet3)  // Recipient
        ], wallet2);

        // With the updated contract, this should fail because tx-sender (wallet2)
        // doesn't match the sender parameter (wallet1)
        expect(transferResult.result).toBeErr(errSenderNotTxSender);

        // Verify ownership has not changed
        const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
          Cl.uint(1)
        ], deployer);

        expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet1)));
      });

      it('allows transferring a token multiple times', () => {
        // First transfer: wallet1 -> wallet2
        let transferResult = simnet.callPublicFn('bitforward-nft', 'transfer', [
          Cl.uint(1), // Token ID
          Cl.principal(wallet1), // Sender
          Cl.principal(wallet2)  // Recipient
        ], wallet1);

        expect(transferResult.result).toBeOk(Cl.bool(true));

        // Second transfer: wallet2 -> wallet3
        transferResult = simnet.callPublicFn('bitforward-nft', 'transfer', [
          Cl.uint(1), // Token ID
          Cl.principal(wallet2), // Sender
          Cl.principal(wallet3)  // Recipient
        ], wallet2);

        expect(transferResult.result).toBeOk(Cl.bool(true));

        // Verify final ownership
        const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
          Cl.uint(1) // Token ID 1
        ], deployer);

        // Verify the new owner is wallet3
        expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet3)));
      });
    });
  });

  describe('integration tests', () => {
    it('supports a full NFT lifecycle', () => {
      // 1. Mint a position as contract owner
      const mintResult = simnet.callPublicFn('bitforward-nft', 'mint-position', [
        Cl.principal(wallet1),
        Cl.uint(contractId2)
      ], deployer);

      expect(mintResult.result).toBeOk(Cl.uint(1));

      // 2. Verify token metadata
      const uriResult = simnet.callReadOnlyFn('bitforward-nft', 'get-token-uri', [
        Cl.uint(1)
      ], deployer);

      expect(uriResult.result).toBeOk(Cl.some(Cl.uint(contractId2)));

      // 3. Transfer the token
      const transferResult = simnet.callPublicFn('bitforward-nft', 'transfer', [
        Cl.uint(1), // Token ID
        Cl.principal(wallet1), // Sender
        Cl.principal(wallet2)  // Recipient
      ], wallet1);

      expect(transferResult.result).toBeOk(Cl.bool(true));

      // 4. Verify new ownership
      const ownerResult = simnet.callReadOnlyFn('bitforward-nft', 'get-owner', [
        Cl.uint(1)
      ], deployer);

      expect(ownerResult.result).toBeOk(Cl.some(Cl.principal(wallet2)));
    });
  });
});