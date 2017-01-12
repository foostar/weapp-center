const config = require('../config/index.js')
const isNil = (v) => v === null || v === undefined

class MemoryStore {
    constructor() {
        this.data = {}
    }
    get(id) {
        const data = this.data[id]
        return Promise.resolve(data ? JSON.parse(data) : null)
    }
    set(id, data) {
        this.data[id] = JSON.stringify(data)
        return Promise.resolve()
    }
    del(id) {
        delete this.data[id]
        return Promise.resolve()
    }
}

class RadisStore {
    constructor(client) {
        this.client = client
    }
    get(id) {
        return new Promise((resolve, reject) => {
            this.client.get(id, (err, data) => {
                if (err) return reject(err)
                resolve(JSON.parse(data))
            })
        })
    }
    set(id, data) {
        return new Promise((resolve, reject) => {
            this.client.setex(id, config.cacheTime || 30 * 60, JSON.stringify(data), err => {
                if (err) return reject(err)
                resolve()
            })
        })
    }
    del(id) {
        return new Promise((resolve, reject) => {
            this.client.del(id, err => {
                if (err) return reject(err)
                resolve()
            })
        })
    }
}

const requests = {}

class Cache {
  /*
  options: {
    expires: 100, // ms
    sync: -1: 直接请求 0: 取缓存 1: 每次更新 2: 过期更新
    force: true,
  }
   */
    constructor(id, fetch, {
    expires = 5 * 60 * 1000,
    sync = 0,
    force = false,
  } = {}) {
        this.id = id
        this.fetch = oid => {
            const promise = requests[oid] = requests[oid] || fetch(oid)
            promise.then(() => {
                delete requests[oid]
            }, () => {
                delete requests[oid]
            })
            return promise
        }
        this.deletedAt = 0
        Object.assign(this, { expires, sync, force })
    }
}

class DataCache {
    constructor({ store = new MemoryStore() } = {}) {
        this.store = store
        this.caches = {}
        this.promise = Promise.resolve()
    }
    add(id, fetch, options) {
        if (id instanceof Cache) {
            this.caches[id.id] = id
        } else {
            if (this.caches[id]) return
            if (isNil(fetch)) throw new Error('fetch 参数不能为空')
            this.caches[id] = new Cache(id, fetch, options)
        }
    }

    async get(id, { sync, force } = {}) {
        const store = this.store
        const cache = this.caches[id]
        if (!cache) return null
        sync = isNil(sync) ? cache.sync : sync
        force = isNil(force) ? cache.force : force
        let data = null
        let newData
        let storeData
        switch (sync) {
            case -1: // 直接请求
                data = await cache.fetch(id)
                this.set(id, data)
                return data
            case 0: // 取缓存 过期后返回 null
                storeData = await store.get(id)
                if (storeData && storeData.expired > Date.now()) {
                    data = storeData.raw
                }
                if (data) return data
                if (force) {
                    data = await cache.fetch(id)
                    await this.set(id, data)
                }
                return data
            case 1: // 取缓存 每次更新
                storeData = await store.get(id)
                if (storeData) {
                    data = storeData.raw
                }
                newData = cache.fetch(id)
                if (!data && force) {
                    data = await newData
                    await this.set(id, data)
                } else {
                    newData.then(nd => this.set(id, nd))
                }
                return data
            case 2: // 取缓存 过期更新
                storeData = await store.get(id)
                if (storeData) {
                    data = storeData.raw
                    if (storeData.expired <= Date.now()) {
                        newData = cache.fetch(id)
                    }
                }
                if (!data && force) {
                    data = await (newData || cache.fetch(id))
                    await this.set(id, data)
                } else if (newData) {
                    newData.then(nd => this.set(id, nd))
                }
                return data
            default:
                return null
        }
    }

    set(id, data, { expires } = {}) {
        const cache = this.caches[id]
        expires = isNil(expires) ? cache.expires : expires
        this.promise = this.promise.then(() => this.store.set(id, {
            expired: Date.now() + expires,
            raw    : data
        }))
        return this.promise
    }

    del(id) {
        this.promise = this.promise.then(() => this.store.del(id))
        return this.promise
    }
}

DataCache.Cache = Cache
DataCache.MemoryStore = MemoryStore
DataCache.RadisStore = RadisStore

module.exports = DataCache
