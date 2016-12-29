const crypto = require('crypto')
const request = require('request')
const WXBizDataCrypt = require('../utils/WXBizDataCrypt.js')
const { raw, cmsAPI } = require('../middleware/middleware.js')
const { sendError } = require('../utils/util.js')
const { getItem, setItem, setExpire } = require('../redis/redis.js')
const Promise = require('promise')
/*
 * @静态方法
 */
const getSessionKey = (options) => {
    return new Promise((reslove, reject) => {
        request({
            url: `https://api.weixin.qq.com/sns/jscode2session?${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) reject(err)
            if (body.errcode) return reject({ "errcode": 101, "errmsg": "请检查用户是否合法，或者appId、secret配置错误！" })
            if (!body.expires_in) return reject({ "errcode": 102, "errmsg": "session 过期" })
            reslove(Object.assign(body, {
                appid:options.appid
            })) 
        })
    })
}
const createSession = (value) => {
    return new Promise((reslove, reject) => {
        crypto.randomBytes(16, function(err, buf) { 
            if(err) reject(err)
            const token = buf.toString('hex');  
            reslove({ key: token, value })
        }); 
    })
}
const getSessionData = (token) => {
    return new Promise((reslove, reject) => {
        getItem(token)
        .then((result) => {
            if(!result) {
                return reject({errcode:102, msg:'token过期'})
            }
            const sessionData = JSON.parse(result)
            reslove(sessionData)
        })
    })
}
const getForumKey = (xyAppId, result) => {
    return new Promise((reslove, reject) => {
        cmsAPI.appInfo(xyAppId).then((data) => {
            reslove({forumKey: data.forumKey, sessionData:result})
        },(err) => {
            reject(err)
        })
    })  
}
const platformLogin_static = (appId, options) => {
    return new Promise((reslove, reject) => {
        cmsAPI.appBBS(appId).then((data) => {
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/wxlogin&${raw(options)}`,
                json: true
            }, (err, response, body) => {
                if (err) reject(err)
                if (!body.rs) reject({msg: body})
                reslove(body)

            })
        }, err => {
            reject(err)
        })
    })
}
/*
 * @验证用户信息
 */
const authUser = (query) => {
    return new Promise((reslove, reject) => {
        if(process.env.NODE_ENV == 'admin') {
            return reject({ errcode:107, msg:'不能微信登录' })
        }
        let { signature, token, rawData, iv, encryptedData } = query
        if(!signature || !token || !rawData || !iv || !encryptedData) {
            return reject({msg:'缺少必要的参数', errcode:105})
        }
        getItem(token)
        .then((result) => {
            if (!result) return reject({errcode:102, msg:'token过期'})
            const sessionData = JSON.parse(result)
            const sessionKey = sessionData.session_key
            const openId = sessionData.openid
            const appId = sessionData.appid
            let pc,tmpData
            try {
                pc = new WXBizDataCrypt(appId, sessionKey)
                tmpData = pc.decryptData(encryptedData , iv)
            }
            catch(err){
                console.log("传输信息不正确")
                return reject({errcode:103, msg:'用户信息不正确'})
            }
            const sign = crypto.createHash('sha1').update(`${rawData}${sessionKey}`).digest('hex').toString()
            if (signature != sign) {
                console.log("签名不一致")
                return reject({errcode:103, msg:'用户信息不正确'})
            }
            if (tmpData.watermark.appid != appId) {
                console.log("appid错误")
                return reject({errcode:103, msg:'用户信息不正确'})
            }
            if (!tmpData.unionId) {
                return reject({errcode:104, msg:'没有unionId!'})
            }
            return setItem(token, JSON.stringify(Object.assign({}, sessionData, { 
                unionid: tmpData.unionId,
                openid: tmpData.openId,
                nickname: tmpData.nickName,
                sex: tmpData.gender,
                province: tmpData.province,
                city: tmpData.city,
                country: tmpData.country,
                headimgurl: tmpData.avatarUrl
            })))
        })
        .then(result => {
            return reslove({ rs: 1, msg: '用户信息正确' })
        })
        .catch(err => {
            return reject(err)
        }) 
    })
}
const bindPlatform_static = (appId, options) => {
    return new Promise((reslove, reject) => {
        cmsAPI.appBBS(appId).then((data) => {
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/saveplatforminfo&${raw(options)}`,
                json: true
            }, (err, response, body) => {
                if (err) reject(err)
                if (!body.rs) reject({msg: body})
                reslove(body)
            })
        }, err => {
            reject(err)
        })
    })
}
const platformInfo_static = (appId, options) => {
    return new Promise((reslove, reject) => {
        cmsAPI.appBBS(appId).then((data) => {
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/platforminfo&${raw(options)}`,
                json: true
            }, (err, response, body) => {
                if (err) reject(err)
                if (!body.rs) reject({msg: body})
                reslove(body)
            })
        }, err => {
            reject(err)
        })
    })
}



/*
 * @返回方法
 */
exports.onLogin = (req, res, next) => {
    if(process.env.NODE_ENV == 'admin') {
        return res.json({ rs: 1, token: 'XIAOYUNadmin' })
    }
    const code = req.query.code
    const xyAppId = req.params.appId
    cmsAPI.wxAppId(xyAppId)
    .then((data) => {
        if(!data.wppAppId || !data.wppSecret) {
            return next({"errcode": 102, "errmsg": "缺少必要配置项"})
        }
        let options = {
            appid: data.wppAppId,
            secret: data.wppSecret,
            js_code: code,
            grant_type: 'authorization_code'
        }
        return getSessionKey(options)
    })
    .then((body) => {
        // 建立3rd_session
        const { openid, session_key, appid } = body
        const value = JSON.stringify({ openid, session_key, appid })
        return createSession(value)
    })
    .then((data) => {
        const { key, value } = data
        if(!value || !key) return next({ errcode:10000, errmsg:' 系统出错，请操作' })
        setItem(key, value)
        .then(() => {
            setExpire(key, parseInt(1800))
        })
        res.json({ rs: 1, token: key })
    })
    .catch((err) => {
        next(sendError(err))
    })

}
/*
 * @检测session是否过期
 */
exports.checkLogin = (req, res, next) => {
    const token = req.query.token;
    getItem(token)
    .then(result => {
        if(!result) return Promise.reject({ errcode: 106, msg: err })
        res.json({ rs:1 })
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
    if(!username || !password || !token) {
        return next({msg:'缺少必要的参数', errcode:105})
    }
    const xyAppId = req.params.appId
    authUser(req.body)
    .then((data) => {
        return getSessionData(token)
    })
    .then((sessionData) => {
        const { openid, nickname, sex, province, city, country, headimgurl, unionid } = sessionData
        let options = Object.assign({
            json:encodeURIComponent(encodeURIComponent(JSON.stringify({
                openid,
                unionid,
                nickname,
                sex,
                province,
                city,
                country,
                headimgurl
            }))),
            platformId:70,
            username,
            password,
            oauthToken:"",
            openId:openid,
            act:'bind',
            isValidation:1
        },JSON.parse(req.query.options))
        if (mobile && code) {
            options.mobile = mobile
            options.code = code
        }
        return bindPlatform_static(xyAppId, options) 
    })
    .then((data) => {
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
    if(!token) return next({msg:'缺少必要的参数', errcode:105})
    authUser(req.body)
    .then((data) => {
        return getSessionData(token)
    })
    .then((result) => {
        return getForumKey(xyAppId, result)
    })
    .then((data) => {
        if(!data) return
        const { forumKey, sessionData } = data
        const { openid, nickname, sex, province, city, country, headimgurl, unionid } = sessionData
        let options = Object.assign({
            json:encodeURIComponent(encodeURIComponent(JSON.stringify({
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
            platformId:70,
            oauthToken: "",
            openId: openid
        },JSON.parse(req.query.options))
        return platformLogin_static(xyAppId, options)
    })
    .then((result) => {
        return res.json(Object.assign({}, result, { rs: 1 }))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @检测微信登录
 */
exports.platformInfo = (req, res, next) => {
    const xyAppId = req.params.appId
    const { token } = req.body
    if(!token) return next({msg:'缺少必要的参数', errcode:105})
    authUser(req.body)
    .then((data) => {
        return getSessionData(token)
    })
    .then((data) => {
        const { openid, nickname, sex, province, city, country, headimgurl, unionid } = data
        let options = Object.assign({
            json:encodeURIComponent(encodeURIComponent(JSON.stringify({
                openid,
                unionid,
                nickname,
                sex,
                province,
                city,
                country,
                headimgurl
            }))),
            platformId:70,
            oauthToken: "",
            openId:openid
        },JSON.parse(req.query.options))
        return platformInfo_static(xyAppId, options)
    })
    .then((data) => {
        if(!data) return
        res.json(Object.assign({}, data, { rs: 1 }))
    })
    .catch((err) => {
        next(sendError(err))
    })
}
/*
 * @微信快速登录
 */
exports.wxLogin = (req, res, next) => {
    const xyAppId = req.params.appId
    const { token } = req.body
    let forumKey = {}
    let sessionData = {}
    let options = {}
    if(!token) return next({msg:'缺少必要的参数', errcode:105})
    authUser(req.body)
    .then(() => {
        return getSessionData(token)
    })
    .then((result) => {
        return getForumKey(xyAppId, result)
    })
    .then((data) => {
        forumKey = data.forumKey
        sessionData = data.sessionData
        const { openid, nickname, sex, province, city, country, headimgurl, unionid } = sessionData
        options = Object.assign({
            json:encodeURIComponent(encodeURIComponent(JSON.stringify({
                openid,
                unionid,
                nickname,
                sex,
                province,
                city,
                country,
                headimgurl
            }))),
            platformId:70,
            oauthToken: "",
            openId:openid
        },JSON.parse(req.query.options))
        return platformInfo_static(xyAppId, options)
    })
    .then((data) => {
        if(data.body.register == 1) return Promise.reject({ errcode: 106, msg: "操作失败，请重试！" })
        res.json(Object.assign({}, data.body, { rs: 1 }))
    })
    .catch(err => {
        console.log(err)
        next(sendError(err))
    })
}