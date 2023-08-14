import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { WalletMock } from '../wallet.mock.test';
import * as utils from '../../src/utils/starknetUtils';
import { createAccount } from '../../src/createAccount';
import { SnapState } from '../../src/types/snapState';
import { STARKNET_MAINNET_NETWORK, STARKNET_TESTNET_NETWORK } from '../../src/utils/constants';
import {
  createAccountProxyTxn,
  createAccountProxyMainnetResp,
  getBip44EntropyStub,
  estimateDeployFeeResp,
  getBalanceResp,
} from '../constants.test';
import { getAddressKeyDeriver } from '../../src/utils/keyPair';
import { Mutex } from 'async-mutex';
import { ApiParams, CreateAccountRequestParams } from '../../src/types/snapApi';

chai.use(sinonChai);
const sandbox = sinon.createSandbox();

describe('Test function: createAccount', function () {
  this.timeout(10000);
  const walletStub = new WalletMock();
  const state: SnapState = {
    accContracts: [],
    erc20Tokens: [],
    networks: [STARKNET_MAINNET_NETWORK, STARKNET_TESTNET_NETWORK],
    transactions: [],
  };
  const apiParams: ApiParams = {
    state,
    requestParams: {},
    wallet: walletStub,
    saveMutex: new Mutex(),
  };

  beforeEach(async function () {
    walletStub.rpcStubs.snap_getBip44Entropy.callsFake(getBip44EntropyStub);
    apiParams.keyDeriver = await getAddressKeyDeriver(walletStub);
    sandbox.useFakeTimers(createAccountProxyTxn.timestamp);
    walletStub.rpcStubs.snap_dialog.resolves(true);
    walletStub.rpcStubs.snap_manageState.resolves(state);
  });

  afterEach(function () {
    walletStub.reset();
    sandbox.restore();
  });

  it('should create and store an user account with proxy in state correctly in mainnet', async function () {
    sandbox.stub(utils, 'deployAccount').callsFake(async () => {
      return createAccountProxyMainnetResp;
    });
    sandbox.stub(utils, 'getSigner').throws(new Error());
    sandbox.stub(utils, 'callContract').callsFake(async () => {
      return getBalanceResp;
    });
    sandbox.stub(utils, 'estimateAccountDeployFee').callsFake(async () => {
      return estimateDeployFeeResp;
    });
    const requestObject: CreateAccountRequestParams = {
      chainId: STARKNET_MAINNET_NETWORK.chainId,
      deploy: true,
    };
    apiParams.requestParams = requestObject;
    const result = await createAccount(apiParams, walletStub);

    expect(walletStub.rpcStubs.snap_manageState).to.have.been.callCount(4);
    expect(state.accContracts.length).to.be.eq(1);
    expect(state.accContracts[0].address).to.be.eq(createAccountProxyMainnetResp.contract_address);
    expect(state.transactions.length).to.be.eq(1);
  });
});
