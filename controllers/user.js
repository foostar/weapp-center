const { raw, cmsAPI } = require('../middleware/middleware.js')
const { sendError, errorType, createSession, authUser, recordApi } = require('../utils/utils.js')
const Api = require('../lib/api.js')
const dataCache = require('../datacache.js')
/*
 * @静态方法
 * @desc  获取forumkey
 */
const getForumKey = (xyAppId, result) => {
    return new Promise((reslove, reject) => {
        cmsAPI.appInfo(xyAppId).then((data) => {
            reslove({ forumKey: data.forumKey, sessionData: result })
        }, (err) => {
            reject(errorType.cmsError(err))
        })
    })
}
/*
 * @初次登录、获取sessionkey
 */
exports.onLogin = (req, res, next) => {
    if (process.env.NODE_ENV == 'admin') {
        return res.json({ rs: 1, token: 'XIAOYUNadmin' })
    }
    const code = req.query.code
    const xyAppId = req.params.appId
    let options
    cmsAPI.wxAppId(xyAppId)
    .then((data) => {
        if (!data.wppAppId || !data.wppSecret) {
            return Promise.reject(errorType[400])
        }
        options = {
            appid     : data.wppAppId,
            secret    : data.wppSecret,
            js_code   : code,
            grant_type: 'authorization_code'
        }
        return Api.getSessionKey(xyAppId, '', options, {
            url: `https://api.weixin.qq.com/sns/jscode2session?${raw(options)}`
        })
    }, err => {
        return Promise.reject(errorType.cmsError(err))
    })
    .then((body) => {
        // 建立3rd_session
        const { openid, session_key } = body
        const value = { openid, session_key, appid: options.appid }
        return createSession(value)
    })
    .then((data) => {
        const { key, value } = data
        if (!value || !key) return Promise.reject(errorType[106])
        dataCache.add(key, () => new Promise(reslove => reslove()), {
            expires: 3 * 24 * 3600 * 1000,
            sync   : 0,
            force  : false
        })
        return dataCache.set(key, value)
            .then(() => {
                recordApi(req.requestTime, xyAppId)
                res.json({ rs: 1, token: key })
            })
    })
    .catch((err) => {
        next(sendError(err))
    })
}
/*
 * @检测session是否过期
 */
exports.checkLogin = (req, res, next) => {
    const token = req.query.token
    const { appId } = req.params
    dataCache.get(token)
    .then((data) => {
        if (!data) return Promise.reject(errorType[102])
        recordApi(req.requestTime, appId)
        res.json({ rs: 1 })
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @老用户绑定微信
 */
exports.bindPlatform = (req, res, next) => {
    const { username, password, token, mobile, code } = req.body
    if (!username || !password || !token) {
        return next(errorType[400])
    }
    const xyAppId = req.params.appId
    authUser(req.body, token)
    .then(() => {
        return dataCache.get(token)
    })
    .then((sessionData) => {
        const { openid, nickname, sex, province, city, country, headimgurl, unionid } = sessionData
        let options = Object.assign({
            json: encodeURIComponent(encodeURIComponent(JSON.stringify({
                openid,
                unionid,
                nickname,
                sex,
                province,
                city,
                country,
                headimgurl
            }))),
            platformId  : 70,
            username,
            password,
            oauthToken  : '',
            openId      : openid,
            act         : 'bind',
            isValidation: 1
        }, JSON.parse(req.query.options))
        if (mobile && code) {
            options.mobile = mobile
            options.code = code
        }
        return Api.bindPlatform(xyAppId, options)
    })
    .then((data) => {
        recordApi(req.requestTime, xyAppId)
        res.json(data)
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @微信快速登录
 */
exports.platformLogin = (req, res, next) => {
    // 根据appId拿到froumkey
    const xyAppId = req.params.appId
    const { token } = req.body
    if (!token) return next(errorType[400])
    authUser(req.body, token)
    .then(() => {
        return dataCache.get(token)
    })
    .then((result) => {
        return getForumKey(xyAppId, result)
    })
    .then((data) => {
        const { forumKey, sessionData } = data
        const { openid, nickname, sex, province, city, country, headimgurl, unionid } = sessionData
        let options = Object.assign({
            json: encodeURIComponent(encodeURIComponent(JSON.stringify({
                openid,
                forumKey,
                unionid,
                nickname,
                sex,
                province,
                city,
                country,
                headimgurl
            }))),
            platformId: 70,
            oauthToken: '',
            openId    : openid
        }, JSON.parse(req.query.options))
        return Api.platformLogin(xyAppId, options)
    })
    .then((result) => {
        recordApi(req.requestTime, xyAppId)
        return res.json(Object.assign({}, result, { rs: 1 }))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @检测微信登录、微信快速登录
 */
exports.platformInfo = (req, res, next) => {
    const xyAppId = req.params.appId
    const { token } = req.body
    if (!token) return next(errorType[400])
    authUser(req.body, token)
    .then(() => {
        return dataCache.get(token)
    })
    .then((data) => {
        const { openid, nickname, sex, province, city, country, headimgurl, unionid } = data
        let options = Object.assign({
            json: encodeURIComponent(encodeURIComponent(JSON.stringify({
                openid,
                unionid,
                nickname,
                sex,
                province,
                city,
                country,
                headimgurl
            }))),
            platformId: 70,
            oauthToken: '',
            openId    : openid
        }, JSON.parse(req.query.options))
        return Api.platformInfo(xyAppId, options)
    })
    .then((data) => {
        recordApi(req.requestTime, xyAppId)
        if (/wxLogin/.test(req.path)) {
            if (data.body.register == 1) return Promise.reject(errorType[403])
            return res.json(Object.assign({}, data.body, { rs: 1 }))
        }
        res.json(Object.assign({}, data, { rs: 1 }))
    })
    .catch((err) => {
        next(sendError(err))
    })
}
/*
 * @获取小程序信息
 */
exports.weapp = (req, res, next) => {
    const { appId } = req.params
    cmsAPI.wxAppId(appId)
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json({ rs: 1, data })
    })
    .catch(err => {
        next(errorType.cmsError(err))
    })
}
