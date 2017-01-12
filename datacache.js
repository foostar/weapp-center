const config = require('./config/index')
const redis = require('redis')
const DataCache = require('./lib/cache.js')

const { RadisStore } = DataCache
const client = redis.createClient(config.redis_url)
const store = new RadisStore(client)
const dataCache = new DataCache({ store })

module.exports = dataCache
