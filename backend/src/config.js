import { STACKS_DEVNET, STACKS_TESTNET } from '@stacks/network';
import dotenv from 'dotenv';

dotenv.config();

STACKS_DEVNET.url = 'http://localhost:3999';

export const NETWORK = process.env.NETWORK === 'devnet' ? STACKS_DEVNET : STACKS_TESTNET
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
export const CONTRACT_NAME = 'bitforward';
export const CONTRACT_OWNER_KEY = process.env.CONTRACT_OWNER_KEY;