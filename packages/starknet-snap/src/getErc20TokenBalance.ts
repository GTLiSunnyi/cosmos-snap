import { toJson } from './utils/serializer';
import { ApiParams, GetErc20TokenBalanceRequestParams } from './types/snapApi';
import { logger } from './utils/logger';
import { StargateClient } from '@cosmjs/stargate';

export async function getErc20TokenBalance(params: ApiParams) {
  try {
    const { state, requestParams } = params;
    const requestParamsObj = requestParams as GetErc20TokenBalanceRequestParams;

    if (!requestParamsObj.userAddress) {
      throw new Error(
        `The given token address and user address need to be non-empty string, got: ${toJson(requestParamsObj)}`,
      );
    }

    const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"
    const client = await StargateClient.connect(rpc)
    const balance = await client.getAllBalances(requestParamsObj.userAddress)

    return balance[0].amount;
  } catch (err) {
    logger.error(`Problem found: ${err}`);
    throw err;
  }
}
