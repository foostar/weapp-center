const config = require('./config/index')
const redis = require('redis')
const DataCache = require('./lib/cache.js')

const { RadisStore, MemoryStore } = DataCache
const store = process.env.NODE_ENV === 'production' ? new RadisStore(redis.createClient(config.redis_url)) : new MemoryStore()
const dataCache = new DataCache({ store })

module.exports = dataCache
