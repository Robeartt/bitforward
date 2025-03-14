import { Cl } from '@stacks/transactions';

/**
 * BitForward Test Utilities
 * Helper functions for testing the BitForward contracts with sBTC compatibility
 */

// Constants - exported at module level for direct import
export const SCALAR = 100000000; // 10^8 for sBTC compatibility
export const STATUS_OPEN = 1;
export const STATUS_FILLED = 2;
export const STATUS_CLOSED = 3;

// Error codes
export const ERRORS = {
    OWNER_ONLY: 100,
    NO_VALUE: 102,
    CLOSE_BLOCK_NOT_REACHED: 103,
    CLOSE_BLOCK_IN_PAST: 104,
    NO_POSITION: 105,
    ALREADY_HAS_COUNTERPARTY: 106,
    PRICE_NOT_SET: 107,
    DIVIDE_BY_ZERO: 108,
    ASSET_NOT_SUPPORTED: 110,
    INVALID_LEVERAGE: 111,
    UNAUTHORIZED: 112,
    CONTRACT_NOT_FOUND: 113,
    TOKEN_NOT_FOUND: 115,
    NOT_TOKEN_OWNER: 116,
    INVALID_STATUS: 117,
    INVALID_POSITION_TYPE: 122,
    CONTRACT_STOPPED: 123,
    TRANSFER_FAILED: 124,
    PAYOUT_EXCEEDS_POOL: 125
};

// Contract data interface
export interface ContractData {
    'collateral-amount': number;
    'premium': number;
    'open-price': number;
    'close-price': number;
    'closing-block': number;
    'asset': string;
    'long-leverage': number;
    'short-leverage': number;
    'status': number;
    'long-id': number;
    'short-id': number;
    'long-payout': number;
    'short-payout': number;
}

/**
 * BitForward Test Utilities Class
 */
export class BitForwardUtils {
    private readonly simnet: any;

    /**
     * Constructor
     * @param simnet The simnet instance
     */
    constructor(simnet: any) {
        this.simnet = simnet;
    }

    /**
     * Initialize the testing environment
     * Sets up Oracle prices for testing
     */
    async initialize(): Promise<void> {
        // Set up the oracle with initial prices
        await this.setAssetPrice('USD', 10);
        await this.setAssetPrice('EUR', 9);
        await this.setAssetPrice('GBP', 8);

        // Approve the bitforward contract to create NFTs
        this.simnet.callPublicFn('bitforward-nft', 'mint-position', [
            Cl.principal(this.simnet.getAccounts().get('wallet_1')!),
            Cl.uint(1)
        ], this.simnet.getAccounts().get('deployer')!);
    }

    /**
     * Convert a regular number to sBTC compatible units (8 decimals)
     * @param value Value to convert
     * @returns Value scaled to 8 decimals
     */
    scaleAmount(value: number): number {
        return Math.floor(value * SCALAR);
    }

    /**
     * Convert an sBTC value back to regular number
     * @param value Value with 8 decimals
     * @returns Unscaled value
     */
    unscaleAmount(value: number): number {
        return value / SCALAR;
    }

    /**
     * Convert leverage to contract format (e.g., 2x leverage = 2 * SCALAR)
     * @param leverage Leverage multiplier (e.g., 2 for 2x)
     * @returns Scaled leverage value
     */
    scaleLeverage(leverage: number): number {
        return Math.floor(leverage * SCALAR);
    }

    /**
     * Set the price for an asset in the oracle
     * @param asset Asset symbol (e.g., 'USD')
     * @param price Price in whole units (e.g., 10 for $10)
     */
    async setAssetPrice(asset: string, price: number): Promise<void> {
        const scaledPrice = this.scaleAmount(price);

        this.simnet.callPublicFn(
            'bitforward-oracle',
            'set-price',
            [
                Cl.stringAscii(asset),
                Cl.uint(scaledPrice)
            ],
            this.simnet.getAccounts().get('deployer')!
        );
    }

    /**
     * Extract a number from a contract result
     * @param result Contract call result
     * @returns Extracted number
     */
    extractNumber(result: any): number {
        // Handle different result structures
        if (result.result && result.result.value && result.result.value.value) {
            return Number(result.result.value.value);
        } else if (result.result && typeof result.result.value === 'bigint') {
            return Number(result.result.value);
        } else if (result.value && typeof result.value === 'bigint') {
            return Number(result.value);
        } else if (typeof result === 'object') {
            return parseInt(JSON.stringify(result).replace(/[^0-9]/g, ''));
        }
        return 0;
    }

    /**
     * Get contract details
     * @param contractId Contract ID
     * @returns Contract data or null if not found
     */
    getContract(contractId: number): ContractData | null {
        const result = this.simnet.callReadOnlyFn(
            'bitforward',
            'get-contract',
            [Cl.uint(contractId)],
            this.simnet.getAccounts().get('deployer')!
        );

        // Handle case where contract doesn't exist
        if (result.result.type === 9) {
            return null; // None returned
        }

        const contractData = JSON.parse(JSON.stringify(result.result));

        // Handle different result formats
        if (contractData.value && contractData.value.data) {
            // Format in newer Clarity versions: Nested structure with value and data
            return this.parseNestedContractData(contractData);
        } else {
            // Format in older Clarity versions: Direct data object
            return this.parseDirectContractData(contractData);
        }
    }

    /**
     * Parse nested contract data structure
     * @param data Nested contract data
     * @returns Parsed contract data
     */
    private parseNestedContractData(data: any): ContractData {
        const nestedData = data.value.data;

        return {
            'collateral-amount': Number(nestedData['collateral-amount'].value),
            'premium': Number(nestedData['premium'].value),
            'open-price': Number(nestedData['open-price'].value),
            'close-price': Number(nestedData['close-price'].value),
            'closing-block': Number(nestedData['closing-block'].value),
            'asset': nestedData['asset'].data,
            'long-leverage': Number(nestedData['long-leverage'].value),
            'short-leverage': Number(nestedData['short-leverage'].value),
            'status': Number(nestedData['status'].value),
            'long-id': Number(nestedData['long-id'].value),
            'short-id': Number(nestedData['short-id'].value),
            'long-payout': Number(nestedData['long-payout'].value),
            'short-payout': Number(nestedData['short-payout'].value)
        };
    }

    /**
     * Parse direct contract data structure
     * @param data Direct contract data
     * @returns Parsed contract data
     */
    private parseDirectContractData(data: any): ContractData {
        return {
            'collateral-amount': Number(data['collateral-amount']),
            'premium': Number(data['premium']),
            'open-price': Number(data['open-price']),
            'close-price': Number(data['close-price']),
            'closing-block': Number(data['closing-block']),
            'asset': data['asset'],
            'long-leverage': Number(data['long-leverage']),
            'short-leverage': Number(data['short-leverage']),
            'status': Number(data['status']),
            'long-id': Number(data['long-id']),
            'short-id': Number(data['short-id']),
            'long-payout': Number(data['long-payout']),
            'short-payout': Number(data['short-payout'])
        };
    }

    /**
     * Create a position - Returns full result for better error handling
     * @param account Account address to create position
     * @param collateral Collateral amount in whole units (e.g., 1000 for 1000 sBTC)
     * @param isLong Whether this is a long position
     * @param asset Asset symbol (e.g., 'USD')
     * @param premium Premium amount in whole units (can be negative)
     * @param longLeverage Long leverage (e.g., 2 for 2x)
     * @param shortLeverage Short leverage (e.g., 1 for 1x)
     * @param blocksToExpiration Blocks until expiration
     * @returns Full result of the contract call
     */
    createPosition(
        account: string,
        collateral: number,
        isLong: boolean,
        asset: string = 'USD',
        premium: number = 10,
        longLeverage: number = 1,
        shortLeverage: number = 1,
        blocksToExpiration: number = 10
    ): any {
        // Scale values
        const scaledCollateral = this.scaleAmount(collateral);

        // Handle positive and negative premiums with appropriate Clarity types
        let premiumParam = Cl.int(this.scaleAmount(premium));

        const scaledLongLeverage = this.scaleLeverage(longLeverage);
        const scaledShortLeverage = this.scaleLeverage(shortLeverage);
        const closingBlock = this.simnet.burnBlockHeight + blocksToExpiration;

        // Call the contract
        return this.simnet.callPublicFn(
            'bitforward',
            'create-position',
            [
                Cl.uint(scaledCollateral),
                Cl.uint(closingBlock),
                Cl.bool(isLong),
                Cl.stringAscii(asset),
                premiumParam,
                Cl.uint(scaledLongLeverage),
                Cl.uint(scaledShortLeverage)
            ],
            account
        );
    }

    /**
     * Take a position (opposite side of an existing position) - Returns full result
     * @param account Account address to take position
     * @param contractId Contract ID
     * @returns Full result of the contract call
     */
    takePosition(account: string, contractId: number): any {
        // Call the contract
        return this.simnet.callPublicFn(
            'bitforward',
            'take-position',
            [Cl.uint(contractId)],
            account
        );
    }

    /**
     * Create and take a position in one step
     * @param creator Account address creating the initial position
     * @param taker Account address taking the opposite side
     * @param collateral Collateral amount (whole units)
     * @param isCreatorLong Whether creator is taking long position
     * @param asset Asset symbol
     * @param premium Premium amount (whole units, can be negative)
     * @param longLeverage Long leverage
     * @param shortLeverage Short leverage
     * @param blocksToExpiration Blocks until expiration
     * @returns Object with contract ID and position IDs, and results
     */
    createAndTakePosition(
        creator: string,
        taker: string,
        collateral: number,
        isCreatorLong: boolean,
        asset: string = 'USD',
        premium: number = 10,
        longLeverage: number = 1,
        shortLeverage: number = 1,
        blocksToExpiration: number = 10
    ): { contractId: number, creatorPositionId: number, takerPositionId: number, createResult: any, takeResult: any } {
        // Create position
        const createResult = this.createPosition(
            creator,
            collateral,
            isCreatorLong,
            asset,
            premium,
            longLeverage,
            shortLeverage,
            blocksToExpiration
        );

        const creatorPositionId = createResult.result.type === 7 ? Number(createResult.result.value.value) : 0;

        if (creatorPositionId === 0) {
            return {
                contractId: 0,
                creatorPositionId: 0,
                takerPositionId: 0,
                createResult,
                takeResult: null
            };
        }

        // Get contract ID from NFT
        const nftResult = this.simnet.callReadOnlyFn(
            'bitforward-nft',
            'get-token-uri',
            [Cl.uint(creatorPositionId)],
            this.simnet.getAccounts().get('deployer')!
        );

        let contractId = 0;
        if (nftResult.result.type === 7) { // OK result
            if (nftResult.result.value.type === 4) { // Some value
                contractId = Number(nftResult.result.value.value.value);
            }
        }

        if (contractId === 0) {
            return {
                contractId: 0,
                creatorPositionId,
                takerPositionId: 0,
                createResult,
                takeResult: null
            };
        }

        // Take position
        const takeResult = this.takePosition(taker, contractId);

        const takerPositionId = takeResult.result.type === 7 ? Number(takeResult.result.value.value) : 0;

        return {
            contractId,
            creatorPositionId,
            takerPositionId,
            createResult,
            takeResult
        };
    }

    /**
     * Close a contract
     * @param account Account address closing the contract
     * @param contractId Contract ID
     * @returns Full result of the contract call
     */
    closeContract(account: string, contractId: number): any {
        // Call the contract
        return this.simnet.callPublicFn(
            'bitforward',
            'close-contract',
            [Cl.uint(contractId)],
            account
        );
    }

    /**
     * Check if a result is OK (successful)
     * @param result Contract call result
     * @returns true if successful, false if an error
     */
    isOk(result: any): boolean {
        return result.result && result.result.type === 7;
    }

    /**
     * Get position ID from create position result
     * @param result Create position result
     * @returns Position ID or 0 if failed
     */
    getPositionId(result: any): number {
        if (this.isOk(result)) {
            return Number(result.result.value.value);
        }
        return 0;
    }

    /**
     * Get error code from a result if it's an error
     * @param result Contract call result
     * @returns Error code or null if not an error
     */
    getErrorCode(result: any): number | null {
        if (result.result && result.result.type === 2) { // Error result
            return Number(result.result.value);
        }
        return null;
    }

    /**
     * Get error message for an error code
     * @param errorCode Error code
     * @returns Error message or "Unknown error" if not found
     */
    getErrorMessage(errorCode: number): string {
        const errorMap: { [key: number]: string } = {
            [ERRORS.OWNER_ONLY]: "Owner only",
            [ERRORS.NO_VALUE]: "No value",
            [ERRORS.CLOSE_BLOCK_NOT_REACHED]: "Close block not reached",
            [ERRORS.CLOSE_BLOCK_IN_PAST]: "Close block in past",
            [ERRORS.NO_POSITION]: "No position",
            [ERRORS.ALREADY_HAS_COUNTERPARTY]: "Already has counterparty",
            [ERRORS.PRICE_NOT_SET]: "Price not set",
            [ERRORS.DIVIDE_BY_ZERO]: "Divide by zero",
            [ERRORS.ASSET_NOT_SUPPORTED]: "Asset not supported",
            [ERRORS.INVALID_LEVERAGE]: "Invalid leverage",
            [ERRORS.UNAUTHORIZED]: "Unauthorized",
            [ERRORS.CONTRACT_NOT_FOUND]: "Contract not found",
            [ERRORS.TOKEN_NOT_FOUND]: "Token not found",
            [ERRORS.NOT_TOKEN_OWNER]: "Not token owner",
            [ERRORS.INVALID_STATUS]: "Invalid status",
            [ERRORS.INVALID_POSITION_TYPE]: "Invalid position type",
            [ERRORS.CONTRACT_STOPPED]: "Contract stopped",
            [ERRORS.TRANSFER_FAILED]: "Transfer failed",
            [ERRORS.PAYOUT_EXCEEDS_POOL]: "Payout exceeds pool"
        };

        return errorMap[errorCode] || "Unknown error";
    }

    /**
     * Calculate expected fee amount
     * @param premium Premium amount (can be negative)
     * @returns Fee amount (always positive)
     */
    calculateFee(premium: number): number {
        const premiumAbs = Math.abs(premium);
        return premiumAbs * 0.01; // 1% fee
    }
}