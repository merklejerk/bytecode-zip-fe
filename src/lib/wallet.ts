import { EventEmitter } from 'events';
import { createPublicClient, createWalletClient, custom, type Address, type PublicClient, type TransactionReceipt, type WalletClient } from "viem";
import type { Buffer } from 'buffer/';

export abstract class Wallet extends EventEmitter {    
    public abstract get chainId(): number;
    public abstract get type(): string;
    public abstract get isConnected(): boolean;
    public abstract deploy(initCode: Buffer): Promise<PendingTransaction>;
}

export interface PendingTransaction {
    txhash: string;
    wait(): Promise<TransactionReceipt>;
}

export class MetamaskWallet extends Wallet {
    private readonly _wallet: WalletClient;
    private readonly _client: PublicClient;
    private _chainId: number | undefined;
    private _account: Address | undefined;

    public static async create(): Promise<MetamaskWallet> {
        const w = new MetamaskWallet();
        await w.connect();
        return w;
    }

    constructor() {
        super();
        this._wallet = createWalletClient({
            transport: custom((window as any).ethereum)
        });
        this._client = createPublicClient({
            transport: custom((window as any).ethereum)
        });
    }

    private async connect(): Promise<void> {
        this._chainId = await this._wallet.getChainId();
        await this._wallet.requestAddresses();
        const pollAccount = async () => {
            let acct;
            let chainId;
            [[acct], chainId] = await Promise.all([
                this._wallet.getAddresses(),
                this._wallet.getChainId(),
            ]);
            if (acct !== this._account || chainId !== this._chainId) {
                this._account = acct;
                this._chainId = chainId;
                this.emit('change');
            }
            if (!acct) {
                this.emit('disconnect');
                return;
            }
            setTimeout(pollAccount, 500);
        };
        pollAccount();
    }

    public get isConnected(): boolean {
        return !!this._account;
    }

    public get type(): string {
        return 'metamask';
    }

    public get chainId(): number {
        return this._chainId || 0;
    }

    public async deploy(initCode: Buffer): Promise<PendingTransaction> {
        if (!this.isConnected) {
            throw new Error('not connected');
        }
        const txHash = await this._wallet!.sendTransaction({
            chain: null,
            account: this._account!,
            data: `0x${initCode.toString('hex')}`,
        });
        return {
            txhash: txHash,
            wait: () => {
                return this._client.waitForTransactionReceipt({
                    hash: txHash,
                });
            },
        };
    }
}