import { BarterSwapDB, TableName } from '../mongodb/client'
import { Injectable } from '@nestjs/common';
import { dexName } from '../event-update/utils/helper';

const DB = new BarterSwapDB();
@Injectable()
export class AppService {

  async getPools(dex: string[],chainId:number):Promise<string> {
    let pools = {
      updateTime:String,
      pancakeswap: String,
      quickswap: String,
      sushiswap: String,
      uniswap_v2: String,
      uniswap_v3: String,
      curve: String,
      balancer: String,
      hiveswap: String,
      bsctestswap:String
    }
    let filter = {
      name: { "$in": dex },
      chainId: Number(chainId),
    }
    let returnData:string;

    await DB.findData(TableName.SimplePools, filter).then((ret: any) => {
      let result = JSON.parse(ret)
      for (let i = 0; i < dex.length; i++) {
        try {
          switch (result[i].name) {
            case dexName.uniswap_v3:
              pools.updateTime = result[i].updateTime
              pools.uniswap_v3 = result[i].result.pools
              break;
            case dexName.uniswap_v2:
              pools.updateTime = result[i].updateTime
              pools.uniswap_v2 = result[i].result.pairs
              break;
            case dexName.sushiswap:
              pools.updateTime = result[i].updateTime
              pools.sushiswap = result[i].result.pairs
              break;
            case dexName.quickswap:
              pools.updateTime = result[i].updateTime
              pools.quickswap = result[i].result.pairs
              break;
            case dexName.pancakeswap:
              pools.updateTime = result[i].updateTime
              pools.pancakeswap = result[i].result.pairs
              break;
            case dexName.curve:
              pools.updateTime = result[i].updateTime
              pools.curve = result[i].result
              break;
            case dexName.balancer:
              pools.updateTime = result[i].updateTime
              pools.balancer = result[i].result
              break;
            case dexName.hiveswap:
              pools.updateTime = result[i].updateTime
              pools.hiveswap = result[i].result;
              break;           
          }
        } catch (err) {
          console.log("error by returning db data,", err)
        }
      }
      
      returnData = JSON.stringify(pools);
    }).catch((err) => {
      console.log('fail to fetch data, err' + err)
      returnData = 'database error'
    })

    return returnData;
  }
}
