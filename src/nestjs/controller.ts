import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './service';

@Controller('get-pools')
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  async findAll(@Query('protocol') protocol: string,@Query('chainId')chainId:number):Promise<string> {
    let dex = protocol.split(',');
    let returnData : string;
    await this.appService.getPools(dex,chainId)
    .then((data)=>{
      //console.log('data',data)
      returnData = data;
    }).catch((err)=>{
      returnData = 'server error'
      console.log('controller error: ' + err)
    });
    return returnData;
  }
}
