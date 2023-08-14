import { toJson } from './utils/serializer';
import {
	getKeysFromAddressIndex,
	getAccContractAddressAndCallData,
	deployAccount,
	callContract,
	estimateAccountDeployFee,
	getSigner,
} from './utils/starknetUtils';
import {
	getEtherErc20Token,
	getNetworkFromChainId,
	getValidNumber,
	upsertAccount,
	upsertTransaction,
} from './utils/snapUtils';
import { AccContract, VoyagerTransactionType, Transaction, TransactionStatus } from './types/snapState';
import { ApiParams, CreateAccountRequestParams } from './types/snapApi';
import { EstimateFee, num } from 'starknet';
import { ethers } from 'ethers';
import { DialogType } from '@metamask/rpc-methods';
import { heading, panel, text } from '@metamask/snaps-ui';
import { logger } from './utils/logger';
import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } from "@cosmjs/proto-signing"
import { assertIsDeliverTxSuccess, SigningStargateClient, StargateClient } from "@cosmjs/stargate";

export async function createAccount(params: ApiParams, snap) {
	try {
		let node = await snap.request({
			method: "snap_getBip44Entropy",
			params: {
				coinType: 118,
			},
		});
		if (typeof node.privateKey === "undefined") {
			console.log("Private key from node is undefined");
			throw Error("Private key from node is undefined");
		}

		// Create bytes key
		let pk = node.privateKey;
		if (pk.startsWith("0x")) {
			pk = pk.substring(2);
		}

		// create the wallet
		let wallet1 = await DirectSecp256k1Wallet.fromKey(
			Uint8Array.from(Buffer.from(pk, "hex")),
			"cosmos"
		);
		let account = await wallet1.getAccounts();
		let address = account[0].address
		let publickey = account[0].pubkey.toString()

		const { wallet, saveMutex } = params;

		// const hdwallet: DirectSecp256k1HdWallet = await DirectSecp256k1HdWallet.generate(24)
		// const accounts = await hdwallet.getAccounts()
		// console.log(accounts[0].address)

		// const address = "cosmos1s05sxlwwlqta4lsm2r0vec7ryd66vedtu6spx0"
		// const mnemonic = "taxi amateur stand forget comic museum film chicken strategy bulb dog tobacco banana section section waste glance obey prosper quantum foil wet return olympic"

		// const hdwallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
		// const accounts = await hdwallet.getAccounts();
		//   const client = await SigningStargateClient.connectWithSigner("https://rpc.sentry-01.theta-testnet.polypore.xyz:443", hdwallet);
		//   console.log(await client.getAllBalances("cosmos17tvd4hcszq7lcxuwzrqkepuau9fye3dal606zf"))
		const userAccount: AccContract = {
			addressSalt: publickey,
			address: address,
			publicKey: publickey,
			addressIndex: 0,
			derivationPath: "",
			chainId: ""
		};

		await upsertAccount(userAccount, wallet, saveMutex);

		console.log(address)

		return {
			address: address
		};
	} catch (err) {
		console.log(`Problem found: ${err}`);
		throw err;
	}
}
