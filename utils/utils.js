const crypto = require('crypto')
const WXBizDataCrypt = require('./WXBizDataCrypt.js')
const dataCache = require('../datacache.js')
const config = require('../config/index.js')
/*
 * @错误信息提示
 */
const errorType = {
    101     : { status: 400, errcode: 101, msg: '请检查用户是否合法，或者appId、secret配置错误！' },
    102     : { status: 400, errcode: 102, msg: 'token过期！' },
    103     : { status: 400, errcode: 103, msg: '用户信息不正确！' },
    106     : { status: 400, errcode: 106, msg: '操作失败，请重试！' },
    400     : { status: 400, errcode: 400, msg: '缺少必要参数或传入参数不合法！' },
    401     : { status: 400, errcode: 401, msg: '缓存失效，请重试！' },
    403     : { status: 400, errcode: 403, msg: '不能微信登录!' },
    405     : { status: 400, errcode: 405, msg: '对不起，没有找到匹配结果!' },
    406     : { status: 400, errcode: 406, msg: '发表失败，请重试!' },
    cmsError: (err) => {
        return { status: 400, errcode: 500, err, msg: 'cms服务错误!' }
    },
    mobcentError: (err) => {
        return { status: 400, errcode: 500, err, msg: 'mobcent服务错误!' }
    }
}
/*
 * @创建session
 */
const createSession = (value) => {
    return new Promise((reslove, reject) => {
        crypto.randomBytes(16, (err, buf) => {
            if (err) reject(err)
            const token = buf.toString('hex')
            reslove({ key: token, value })
        })
    })
}
/*
 * @验证用户信息
 */
const authUser = (query, token) => {
    return new Promise((reslove, reject) => {
        if (process.env.NODE_ENV == 'admin') {
            return reject(errorType[403])
        }
        let { signature, rawData, iv, encryptedData } = query
        if (!signature || !token || !rawData || !iv || !encryptedData) {
            return reject(errorType[400])
        }
        dataCache.get(token)
        .then((result) => {
            const sessionKey = result.session_key
            const appId = result.appid
            let pc = null
            let tmpData = null
            try {
                pc = new WXBizDataCrypt(appId, sessionKey)
                tmpData = pc.decryptData(encryptedData, iv)
            } catch (err) {
                console.log('传输信息不正确')
                return reject({ status: 400, errcode: 103, msg: '用户信息不正确！' })
            }
            const sign = crypto.createHash('sha1').update(`${rawData}${sessionKey}`).digest('hex')
            .toString()
            if (signature != sign) {
                console.log('签名不一致')
                return reject({ status: 400, errcode: 103, msg: '用户信息不正确！' })
            }
            if (tmpData.watermark.appid != appId) {
                console.log('appid错误')
                return reject({ status: 400, errcode: 103, msg: '用户信息不正确！' })
            }
            if (!tmpData.unionId) {
                return reject({ status: 400, errcode: 103, msg: '用户信息不正确！' })
            }
            /* eslint-disable */
            dataCache.add(token, () => new Promise((reslove) => reslove()), {
                expires: 3 * 24 * 3600 * 1000,
                sync   : 0,
                force  : false
            })
            /* eslint-enable */
            dataCache.set(token, Object.assign({}, result, {
                unionid   : tmpData.unionId,
                openid    : tmpData.openId,
                nickname  : tmpData.nickName,
                sex       : tmpData.gender,
                province  : tmpData.province,
                city      : tmpData.city,
                country   : tmpData.country,
                headimgurl: tmpData.avatarUrl
            }))
        })
        .then(() => {
            return reslove({ rs: 1, msg: '用户信息正确' })
        })
        .catch(err => {
            return reject(err)
        })
    })
}
/*
 * @发送错误信息
 */
const sendError = (err) => {
    if (err.errcode || Object.prototype.toString.call(this) == '[object Object]') {
        return err
    }
    return { errcode: 106, msg: err }
}
/*
 *
 */
const recordApi = (record, appId) => {
    if (config.showApiLog) {
        console.log(`自有服务：接口地址为：${record[0]}, appId为：${appId}, 访问时长为:${Date.now() - record[1]}毫秒`)
    }
}
module.exports = {
    createSession,
    authUser,
    sendError,
    errorType,
    recordApi
}
