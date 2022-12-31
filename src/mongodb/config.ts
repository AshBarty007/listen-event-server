const MongoDBConfig = {
    default:  "mongodb://root:" + encodeURIComponent("Mr0s8#dFdf#8s386di2ds") + "@barterswap.cluster-ck74h9ydda33.ap-southeast-1.docdb.amazonaws.com:27017/?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false",
    host: "barterswap.cluster-ck74h9ydda33.ap-southeast-1.docdb.amazonaws.com", 
    port: 27017, 
    user: "root", 
    password: encodeURIComponent("Mr0s8#dFdf#8s386di2ds"),
    database: "BarterSwap", 
    auth: String(true) === process.env.MONGO_DB_NEED_AUTH,
 }
export default MongoDBConfig;