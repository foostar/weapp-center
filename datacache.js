const config = require('./config/index')
const redis = require('redis')
const DataCache = require('./lib/cache.js')

const { RadisStore } = DataCache
const store = new RadisStore(redis.createClient(config.redis_url))
const dataCache = new DataCache({ store })

module.exports = dataCache
