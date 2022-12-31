import { ONE_BD, ZERO_BD, CHAIN_RPC } from '../utils/helper'
import { ethers } from 'ethers'
import { FactoryAbi, PairAbi, TokenAbi } from '../utils/abi'
import { getCreate2Address } from '@ethersproject/address';
import { pack, keccak256 } from '@ethersproject/solidity';
import { INIT_CODE_HASH, FACTORY_ADDRESS } from '@uniswap/sdk';
import { uniswapV2_topPairs } from '../utils/constant'

const WHITELIST: string[] = [
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x0000000000085d4780b73119b644ae5ecd22b376', // TUSD
    '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643', // cDAI
    '0x39aa39c021dfbae8fac545936693ac917d5e7563', // cUSDC
    '0x86fadb80d8d2cff3c3680819e4da99c10232ba0f', // EBASE
    '0x57ab1ec28d129707052df4df418d58a2d46d5f51', // sUSD
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', // MKR
    '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP
    '0x514910771af9ca656af840dff83e8264ecf986ca', //LINK
    '0x960b236a07cf122663c4303350609a66a7b288c0', //ANT
    '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', //SNX
    '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e', //YFI
    '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8', // yCurv
    '0x853d955acef822db058eb8505911ed77f175b99e', // FRAX
    '0xa47c8bf37f92abed4a126bda807a7b7498661acd', // WUST
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' // WBTC
]

const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

type Pair = {
    id: string,
    token0Address: string,
    token1Address: string,
    reserve0: ethers.BigNumber,
    reserve1: ethers.BigNumber,
    trackedLiquidityETH: ethers.BigNumber
}

class ListenUniPool {
    public chainId: number;
    private provider: ethers.providers.JsonRpcProvider;
    private allPairs: Map<string, Pair> = new Map()
    private bestPairs: Map<string, Pair> = new Map()
    private BEST_LIQUIDITY_THRESHOLD_ETH: ethers.BigNumber = ethers.BigNumber.from('0') //eth

    constructor(chainId: number) {
        this.chainId = chainId;
        this.provider = new ethers.providers.JsonRpcProvider(CHAIN_RPC[chainId], chainId);
    }

    async run() {
        await this.fetchSpecifyPairs()
        for (let [k, v] of this.allPairs) {
            this.listen(k)
        }
    }

    async fetchAllPairs() {
        const factoryContract = new ethers.Contract(
            FACTORY_ADDRESS,
            FactoryAbi,
            this.provider
        );

        let allPairsLength: ethers.BigNumber = await factoryContract.allPairsLength()
        if (allPairsLength.toNumber() == 0) {
            return
        }

        for (let i = 0; i < 5; i++) {
            let pair: string = await factoryContract.allPairs(i)
            let PairContract = new ethers.Contract(pair, PairAbi, this.provider);
            type Reserves = {
                _reserve0: ethers.BigNumber,
                _reserve1: ethers.BigNumber,
                _blockTimestampLast: number
            }
            let reserves: Reserves = await PairContract.getReserves()
            let token0: string = await PairContract.token0()
            let token1: string = await PairContract.token1()
            this.allPairs.set(pair, {
                id: pair,
                token0Address: token0,
                token1Address: token1,
                reserve0: reserves._reserve0,
                reserve1: reserves._reserve1,
                trackedLiquidityETH: ZERO_BD
            })
        }
    }

    async fetchSpecifyPairs() {
        let index = 1
        for (let pair of uniswapV2_topPairs.pairs) {
            let PairContract = new ethers.Contract(pair.id, PairAbi, this.provider);
            type Reserves = {
                _reserve0: ethers.BigNumber,
                _reserve1: ethers.BigNumber,
                _blockTimestampLast: number
            }
            let reserves: Reserves = await PairContract.getReserves()
            let token0: string = await PairContract.token0()
            let token1: string = await PairContract.token1()
            console.log('fetch pair:', pair.id, ' process:', index++, '/', uniswapV2_topPairs.pairs.length)
            this.allPairs.set(pair.id, {
                id: pair.id,
                token0Address: token0,
                token1Address: token1,
                reserve0: reserves._reserve0,
                reserve1: reserves._reserve1,
                trackedLiquidityETH: ZERO_BD
            })
        }
    }

    listen(
        address: string,
    ) {
        console.log('listening', address)
        try{
            const contract = new ethers.Contract(address, PairAbi, this.provider)
            contract.on("Sync", async (reserve0: ethers.BigNumber, reserve1: ethers.BigNumber) => {
                console.log('sync pair',address,'reserve0',reserve0.toString(),',reserve1',reserve1.toString())
                let pair = this.allPairs.get(address)
                if(!pair){
                    throw new Error(`the pair ${address} has not init or not exit.`)
                }
                let trackedLiquidityETH = await this.getTrackedLiquidityETH(pair.token0Address, pair.token1Address, reserve0, reserve1)
                if (trackedLiquidityETH.gt(this.BEST_LIQUIDITY_THRESHOLD_ETH)) {
                    this.bestPairs.set(address, {
                        id: address,
                        token0Address: pair.token0Address,
                        token1Address: pair.token1Address,
                        reserve0: reserve0,
                        reserve1: reserve1,
                        trackedLiquidityETH: trackedLiquidityETH
                    })
                } else {
                    this.bestPairs.delete(address)
                    return
                }
            });
        }catch(err){
            console.log('listen fail, error:',err)
        }

    }

    async getTrackedLiquidityETH(
        token0: string,
        token1: string,
        tokenAmount0: ethers.BigNumber,
        tokenAmount1: ethers.BigNumber,
    ) {

        let price0: ethers.BigNumber = await this.findUsdPerToken(token0)
        let price1: ethers.BigNumber = await this.findUsdPerToken(token1)

        // both are whitelist tokens, take average of both amounts
        if (WHITELIST.includes(token0) && WHITELIST.includes(token1)) {
            return tokenAmount0.mul(price0).add(tokenAmount1.mul(price1))
        }

        // take double value of the whitelisted token amount
        if (WHITELIST.includes(token0) && !WHITELIST.includes(token1)) {
            return tokenAmount0.mul(price0).mul(ethers.BigNumber.from('2'))
        }

        // take double value of the whitelisted token amount
        if (!WHITELIST.includes(token0) && WHITELIST.includes(token1)) {
            return tokenAmount1.mul(price1).mul(ethers.BigNumber.from('2'))
        }

        // neither token is on white list, tracked volume is 0
        return ZERO_BD
    }

    async findUsdPerToken(address: string) {
        // loop through whitelist and check if paired with any
        for (let i = 0; i < WHITELIST.length; ++i) {
            let pairAddress = this.computePairAddress(address, WHITELIST[i])
            let pair = this.bestPairs.get(pairAddress)
            let derivedETH = await this.getDerivedETH(address)

            if (pair) {
                if (pair.token0Address == address) {
                    let token1Price = pair.reserve1.div(pair.reserve0)
                    return token1Price.mul(derivedETH) // return token1 per our token * Eth per token 1
                }
                if (pair.token1Address == address) {
                    let token0Price = pair.reserve0.div(pair.reserve1)
                    return token0Price.mul(derivedETH) // return token0 per our token * ETH per token 0
                }
            }
        }

        return ZERO_BD // nothing was found return 0
    }

    private computePairAddress(tokenA: string, tokenB: string): string {
        let token0: string
        let token1: string
        if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
            token0 = tokenA
            token1 = tokenB
        } else {
            token0 = tokenB
            token1 = tokenA
        }

        return getCreate2Address(
            FACTORY_ADDRESS,
            keccak256(
                ['bytes'],
                [pack(['address', 'address'], [token0, token1])]
            ),
            INIT_CODE_HASH
        );
    };

    async getDerivedETH(token: string) {
        if(token.toLowerCase() == WETH_ADDRESS){
            return ONE_BD
        }

        let TokenContract = new ethers.Contract(
            token,
            TokenAbi,
            this.provider
        );
        let decimals: number = await TokenContract.decimals()
        let pair = this.computePairAddress(token, WETH_ADDRESS)
        let PairContract = new ethers.Contract(
            pair,
            PairAbi,
            this.provider
        );
        type Reserves = {
            _reserve0: ethers.BigNumber,
            _reserve1: ethers.BigNumber,
            _blockTimestampLast: number
        }
        let reserves: Reserves = await PairContract.getReserves()
        if (token.toLowerCase() < WETH_ADDRESS) {
            let rate = reserves._reserve1.mul('1000000').div(reserves._reserve0.mul(Math.pow(10, 18 - decimals))).toNumber()
            return rate/1000000
        } else {
            let rate = reserves._reserve0.mul('1000000').div(reserves._reserve1.mul(Math.pow(10, 18 - decimals))).toNumber()
            return rate/1000000
        }
    };
}

const listener = new ListenUniPool(1)
listener.run()