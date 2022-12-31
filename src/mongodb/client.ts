import { MongoClient, Filter} from 'mongodb'
import MongoDBConfig from './config'

export enum TableName {
    DetailedPools = 'DetailedPools',
    SimplePools = 'SimplePools',
    OnChainPools = 'OnChainPools',
    ApiPools = 'ApiPools',
}

export class BarterSwapDB {
    private url: string
    private dbName: string

    constructor(
        url = MongoDBConfig.default,
        dbName = MongoDBConfig.database
    ) {
        this.url = url
        this.dbName = dbName
    }

    private async connectDB(): Promise<MongoClient> {
        return new Promise((res, rej) => {
            MongoClient.connect(this.url).then((db) => {
                res(db)
            }).catch((err) => {
                rej(err)
            })
        })
    }

    async insertData<Document>(collectionName: string, data: Document[] | Document, many = false) {
        await this.connectDB().then((client) => {
            let collection = client.db(this.dbName).collection(collectionName)
            if (many) {
                collection.insertMany(data as Document[])
                    .catch((err) => { console.log("fail to insert many data,error:", err) })
                    .finally(() => { client.close() })
            } else {
                collection.insertOne(data as Document)
                    .catch((err) => { console.log("fail to insert a data,error:", err) })
                    .finally(() => { client.close() })
            }
        }).catch((err) => {
            console.log("fail to connect mongoDB,error:", err);
        })
    }

    async findData<Document>(collectionName: string, filter: Filter<Document>): Promise<string> {
        return new Promise((res,rej)=>{
            this.connectDB().then((client)=>{
                let collection = client.db(this.dbName).collection(collectionName)
                collection.find(filter).toArray()
                .then((data)=>{res(JSON.stringify(data))})
                .catch((err)=>{console.log("fail to find data,error:",err),rej(err)})
                .finally(()=>{client.close()})
            }).catch((err)=>{
                console.log("fail to connect mongoDB,error:",err);
                rej(err)
            })
        })
    }

    async deleteData<Document>(collectionName: string, filter: Filter<Document>, many = false) {
        await this.connectDB().then((client) => {
            let collection = client.db(this.dbName).collection(collectionName)
            if (many) {
                collection.deleteMany(filter)
                    .catch((err) => { console.log("fail to delete many data,error:", err) })
                    .finally(() => { client.close() })
            } else {
                collection.deleteOne(filter)
                    .catch((err) => { console.log("fail to delete a data,error:", err) })
                    .finally(() => { client.close() })
            }
        }).catch((err) => {
            console.log("fail to connect mongoDB,error:", err);
        })
    }

    async updateData<Document>(collectionName: string, filter: Filter<Document>, updateFilter: Filter<Document>, many = false) {
        await this.connectDB().then((client) => {
            let collection = client.db(this.dbName).collection(collectionName)
            if (many) {
                collection.updateMany(filter, {$set:updateFilter},{upsert:true})
                    .catch((err) => { console.log("fail to update many data,error:", err) })
                    .finally(() => { client.close() })
            } else {
                collection.updateOne(filter, {$set:updateFilter},{upsert:true})
                    .catch((err) => { console.log("fail to update a data,error:", err) })
                    .finally(() => { client.close() })
            }
        }).catch((err) => {
            console.log("fail to connect mongoDB,error:", err);
        })
    }

}


