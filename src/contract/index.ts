/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-console */

import { ethers } from 'ethers';
import contracts from './contracts.json';
import { erc20ABI } from 'wagmi'
import { isTest } from 'src/config/test';

let signer: any = null;
let provider: any = null;

let Staking: any = null;

let StakingWithSigner: any = null;
let currencyContract: any = null;
let currencyContractWithSigner: any = null;
let KingContract: any = null;

const Addy = isTest ? contracts.King.testnet_address : contracts.King.address;
const stakingAddy = isTest ? contracts.King.testnet_staking : contracts.King.staking;

export const initializeWeb3 = async (provider_: any, signer_: any) => {
    currencyContract = new ethers.Contract(Addy, erc20ABI, provider_);
    currencyContractWithSigner = new ethers.Contract(Addy, erc20ABI, signer_);
    StakingWithSigner = new ethers.Contract(stakingAddy, contracts.King.abi, signer_);
    Staking = new ethers.Contract(stakingAddy, contracts.King.abi, provider_);
    KingContract = new ethers.Contract(Addy, contracts.King.abi, provider_);
    provider =  provider_;
    signer =  await signer_;
};

export const approve = async () => {
    if(signer !== null && signer !== undefined && currencyContractWithSigner !== null) {
        const max_allow = '115792089237316195423570985008687907853269984665640564039457584007913129639934'
        console.log("currencyContractWithSigner: ", currencyContractWithSigner)
        const tx =  await currencyContractWithSigner.approve(stakingAddy, max_allow);
        console.log("approved")
        await tx.wait();
    }
}

export const isApproved = async (address: string | undefined) => {
    if(currencyContract !== null && currencyContract !== undefined && address !== undefined) {
        const _allownace = await currencyContract.allowance(address, stakingAddy);
        const allowance = _allownace.toString();
        const isAllow = allowance > '100000000000';
        return isAllow
    }
}

export const tokenDeposit = async (amount: number) => {
    const tx = await StakingWithSigner.deposit((amount * (10 ** 18)).toString());
    await tx.wait();
}

export const compound = async () => {
    const tx = await StakingWithSigner.compound();
    await tx.wait();
}

export const withdraw = async (amount: number) => {
    const tx = await StakingWithSigner.withdraw((amount * (10 ** 18)).toString());
    await tx.wait();
}

export const getFreeData = async () => {
    const freeData = [];
    const rpc = isTest ? "https://data-seed-prebsc-2-s2.binance.org:8545" : "https://bsc-dataseed1.binance.org";
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const StakingContract = new ethers.Contract(stakingAddy, contracts.King.abi, provider);

    const _totalLocked = await StakingContract.totalUsersStake();
    const totalLocked = parseFloat(ethers.utils.formatUnits(_totalLocked.toString(), 18)).toFixed(4);

    const _totalUserRewards = await StakingContract.totalUsersRewards();
    const totalUserRewards = parseFloat(ethers.utils.formatUnits(_totalUserRewards.toString(), 18)).toFixed(4);

    // get APY
    const apy = getAPY(totalLocked);

    // const kingPrice = await getKingPrice();

    // const tvl = (Number(totalLocked) * kingPrice).toFixed(2);

    freeData.push(totalLocked, totalUserRewards, apy);
    return freeData;
}

export const getUserData = async (address: string | undefined) => {
    if(Staking !== undefined && address !== undefined && signer !== undefined) {
        const userData:any = [];
        const userInfos = await Staking.userInfo(address);
        const deposit = parseFloat(ethers.utils.formatUnits(userInfos[0].toString(), 18)).toFixed(4);
        const lockTime = (parseInt(userInfos[2])).toString();
        
        const _rewardDebt = ethers.utils.formatUnits(await Staking.pendingReward(address), 18)
        const __rewardDebt = parseFloat(_rewardDebt);
        const rewardDebt = __rewardDebt.toFixed(4).toString();

        const isApprove = await isApproved(address);
        const kingBalance = await getKingBalance(address);

        userData.push(deposit, lockTime, rewardDebt, isApprove, kingBalance);
        return userData;
    }
}

export const getKingBalance = async(address: string | undefined) => {
    if(currencyContract !== null && currencyContract !== undefined && address !== undefined) {
        const _kingBalance = await currencyContract.balanceOf(address);
        const kingBalance = parseFloat(ethers.utils.formatUnits(_kingBalance.toString(), 18)).toFixed(2);
        return kingBalance
    }
}

const getAPY = (_totalLocked: string) => {
    // APY 
    const totalLocked = parseFloat(_totalLocked);
    const rewardPerBlock = 0.0035
    const blockPerSecond = 0.3333
    const apy = (((rewardPerBlock * blockPerSecond * 86400 * 365) / totalLocked) * 100).toFixed(2)
    return apy;
}

// const getKingPrice = async () => {
//     const chainId = 56;
//     const response = await fetch(`https://api.dev.dex.guru/v1/chain/${chainId}/tokens/${stakingAddy}/market?api-key=UnK0BOsJoU3FhwiWcoIuBzGQVT3j_dw_656de3zEAAs`)
//     const data = await response.json()
//     const res = data.price_usd.toFixed(5);
//     return res
// };