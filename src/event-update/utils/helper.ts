import { ethers } from 'ethers'

export let ZERO_BD = ethers.BigNumber.from('0')
export let ONE_BD = ethers.BigNumber.from('1')

export enum ChainId {
    MAINNET = 1,
    POLYGON = 137,
    BSC = 56,
    MAP = 22776
}

export const CHAIN_RPC: { [chainId in ChainId]?: string } = {
    [ChainId.MAINNET]:
        'https://mainnet.infura.io/v3/8cce6b470ad44fb5a3621aa34243647f',
    [ChainId.POLYGON]:
        'https://polygon-mainnet.infura.io/v3/8cce6b470ad44fb5a3621aa34243647f',
    [ChainId.BSC]:
        'https://bsc-dataseed.binance.org/',
    [ChainId.MAP]:
        'https://poc3-rpc.maplabs.io'
}

export enum dexName {
    pancakeswap = 'pancakeswap',
    quickswap = 'quickswap',
    sushiswap = 'sushiswap',
    uniswap_v2 = 'uniswap_v2',
    uniswap_v3 = 'uniswap_v3',
    curve = 'curve',
    balancer = 'balancer',
    hiveswap = 'hiveswap'
}