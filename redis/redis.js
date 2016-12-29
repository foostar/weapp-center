const redis = require("redis")
const config = require("../config/index")

const client = redis.createClient(config.redis_url)

const setItem = (key, value, time) => {
    time = config.cacheTime || 300
    return new Promise((reslove, reject) => {
        client.set(key, value, (error) => {
            if (error) {
                return reject(error)
            }
            client.expire(key, time)
            // 模拟token
            reslove()
        })
    })
}

const getItem = (key) => {
    return new Promise((reslove, reject) => {
        client.get(key, (err, result) => {
            if (err || !result) {
                return reject({ errcode: 106, msg: "操作失败，请重试！" })
            }
            reslove(result)
        })
    })
}

const removeItem = (key) => {
    return new Promise((reslove, reject) => {
        client.del(key, (err, result) => {
            if (err) {
                return reject({ status: 400, msg: "操作失败，请重试！" })
            }
            reslove()
        })
    })
}

const setExpire = (key, time) => {
    time = time || parseInt(300)
    client.expire(key, time)
}

module.exports = {
    setItem,
    getItem,
    removeItem,
    setExpire
}
