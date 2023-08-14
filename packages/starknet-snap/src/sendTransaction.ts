import { toJson } from './utils/serializer';
import { num, constants } from 'starknet';
import { validateAndParseAddress } from '../src/utils/starknetUtils';
import { estimateFee } from './estimateFee';
import { Transaction, TransactionStatus, VoyagerTransactionType } from './types/snapState';
import { getNetworkFromChainId, getSigningTxnText, upsertTransaction } from './utils/snapUtils';
import { getKeysFromAddress, getCallDataArray, executeTxn, isAccountDeployed } from './utils/starknetUtils';
import { ApiParams, SendTransactionRequestParams } from './types/snapApi';
import { createAccount } from './createAccount';
import { DialogType } from '@metamask/rpc-methods';
import { heading, panel } from '@metamask/snaps-ui';
import { logger } from './utils/logger';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { SigningStargateClient, assertIsDeliverTxSuccess } from '@cosmjs/stargate';

export async function sendTransaction(params: ApiParams, snap) {
  try {
    const { state, wallet, saveMutex, keyDeriver, requestParams } = params;
    const requestParamsObj = requestParams as SendTransactionRequestParams;

    const senderAddress = requestParamsObj.senderAddress;
    const network = getNetworkFromChainId(state, requestParamsObj.chainId);
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

    const response = await wallet.request({
      method: 'snap_dialog',
      params: {
        type: DialogType.Confirmation,
        content: panel([heading('Do you want to sign this transaction ?')]),
      },
    });
    if (!response) return false;

    const client = await SigningStargateClient.connectWithSigner("https://rpc.sentry-01.theta-testnet.polypore.xyz:443", wallet1);

		  const amount = { denom: 'uatom', amount: '100000' };
		  const fee = {
			       amount: [{ denom: "uatom", amount: "50000" }],
			          gas: "200000",
		      };
		  const result = await client.sendTokens(senderAddress, senderAddress, [amount], fee);
		  console.log("Transfer result:", result)
		  assertIsDeliverTxSuccess(result);

      // const txn: Transaction = {
      //   txnHash: txnResp.transaction_hash,
      //   txnType: VoyagerTransactionType.INVOKE,
      //   chainId: network.chainId,
      //   senderAddress,
      //   contractAddress,
      //   contractFuncName,
      //   contractCallData: contractCallData.map((data: num.BigNumberish) => {
      //     try {
      //       return num.toHex(num.toBigInt(data));
      //     } catch (e) {
      //       throw new Error(`contractCallData could not be converted, ${e.message || e}`);
      //     }
      //   }),
      //   status: TransactionStatus.RECEIVED,
      //   failureReason: '',
      //   eventIds: [],
      //   timestamp: Math.floor(Date.now() / 1000),
      // };

      // await upsertTransaction(txn, wallet, saveMutex);
    // }

    // return txnResp;
  } catch (err) {
    logger.error(`Problem found: ${err}`);
    throw err;
  }
}
