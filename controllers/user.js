const redis = require('redis')
const crypto = require('crypto')
const request = require('request')
const config = require("../config/index")
const WXBizDataCrypt = require('../utils/WXBizDataCrypt.js')
const { raw, cmsAPI } = require('../middleware/middleware.js')
const client = redis.createClient(config.redis_url)
const Promise = require('promise')
/*
 * @储存session
 */
const getSessionKey = (options) => {
    return new Promise((reslove, reject) => {
        request({
            url: `https://api.weixin.qq.com/sns/jscode2session?${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) reject(err)
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
exports.onLogin = (req, res, next) => {
    const code = req.query.code;
    const xyAppId = req.params.appId;    
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
    },err => {
        return next(err)
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
        // 存入redis
        client.set(key, value, function(err, result){  
            if (err) {  
                return next(err);  
            }  
            client.expire(key, parseInt(1800));
        })
        res.json({ rs: 1, token: key })
    })
    .catch((err) => {
        next(err)
    })

}
/*
 * @检测session是否过期
 */
exports.checkLogin = (req, res, next) => {
    const token = req.query.token;
    client.get(token, function(err,result){  
        if (err) {  
            return next({ msg: err })
        }  
        res.json({ rs:1 }) 
    });  
}
/*
 * @验证用户信息
 */
const authUser = (query) => {
    return new Promise((reslove, reject) => {
        let { signature, token, rawData, iv, encryptedData } = query
        if(!signature || !token || !rawData || !iv || !encryptedData) {
            return reject({msg:'缺少必要的参数', errcode:105})
        }
        encryptedData = encryptedData.replace(/\s/g,"+")
        iv = iv.replace(/\s/g,"+")
        client.get(token, function(err,result){
            if (err || !result) {  
                return reject({errcode:102, msg:'token过期'})
            }
            const sessionData = JSON.parse(result)
            const sessionKey = sessionData.session_key
            const openId = sessionData.openid
            const appId = sessionData.appid
            console.log(sessionData)
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
            client.set(token, JSON.stringify(Object.assign({}, sessionData, { 
                unionid: tmpData.unionId,
                openid: tmpData.openId,
                nickname: tmpData.nickName,
                sex: tmpData.gender,
                province: tmpData.province,
                city: tmpData.city,
                country: tmpData.country,
                headimgurl: tmpData.avatarUrl
            })), function(err, result){
                if (err) {  
                    return reject(err);
                }  
                return reslove({ rs: 1, msg: '用户信息正确' })
            })
        }); 
    })
}

/*
 * @老用户绑定微信
 */
const bindPlatform_static = (appId, options) => {
    return new Promise((reslove, reject) => {
        cmsAPI.appBBS(appId).then((data) => {
            console.log(`${data.forumUrl}/mobcent/app/web/index.php?r=user/saveplatforminfo&${raw(options)}`)
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/saveplatforminfo&${raw(options)}`,
                json: true
            }, (err, response, body) => {
                if (err) reject(err)
                if (!body.rs) reject({msg: body})
                reslove(body)
            })
        })
    })
}
exports.bindPlatform = (req, res, next) => {
    const { username, password, token, mobile, code } = req.query
    if(!username || !password || !token) {
        return next({msg:'缺少必要的参数', errcode:105})
    }
    const xyAppId = req.params.appId
    authUser(req.query)
    .then((data) => {
        return new Promise((reslove, reject) => {
            client.get(token, function(err,result){  
                if (err) {  
                    return reject({errcode:102, msg:'token过期'})
                }
                const sessionData = JSON.parse(result)
                reslove(sessionData)
            })
        })
    }, err => {
        return next(err)
    })
    .then((sessionData) => {
        if(!sessionData) return
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
        if(!data) return
        res.json(data)
    }, (err) => {
        return next(err)
    })
}
/*
 * @微信快速登录
 */
const platformLogin_static = (appId, options) => {
    return new Promise((reslove, reject) => {
        //console.log("platformLogin", `${data.forumUrl}/mobcent/app/web/index.php?r=user/wxlogin&${raw(options)}`)
        cmsAPI.appBBS(appId).then((data) => {
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/wxlogin&${raw(options)}`,
                json: true
            }, (err, response, body) => {
                if (err) reject(err)
                if (!body.rs) reject({msg: body})
                reslove(body)
            })
        })
    })
}
exports.platformLogin = (req, res, next) => {
    // 根据appId拿到froumkey
    const xyAppId = req.params.appId
    const { token } = req.query
    if(!token) return next({msg:'缺少必要的参数', errcode:105})
    authUser(req.query)
    .then((data) => {
        return new Promise((reslove, reject) => {
            client.get(token, function(err,result){
                if (err || !result) {  
                    return reject({errcode:102, msg:'token过期'})
                }
                const sessionData = JSON.parse(result)
                reslove(sessionData)
            })
        })
    }, err => {
        return next(err)
    })
    .then((result) => {
        if(!result) return
        return new Promise((reslove, reject) => {
            cmsAPI.appInfo(xyAppId).then((data) => {
                reslove({forumKey: data.forumKey, sessionData:result})
            },(err) => {
                reject(err)
            })
        })  
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
    }, (err) => {
        return next({errcode:102, msg:'获取appid失败！'})
    })
    .then((result) => {
        if(!result) return
        return res.json(Object.assign({}, result, { rs: 1 }))
    })
}
/*
 * @检测微信登录
 */
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
        })
    })
}
exports.platformInfo = (req, res, next) => {
    const xyAppId = req.params.appId
    const { token } = req.query
    if(!token) return next({msg:'缺少必要的参数', errcode:105})
    authUser(req.query)
    .then((data) => {
        return new Promise((reslove, reject) => {
            client.get(token, function(err,result){
                if (err || !result) {  
                    return reject({errcode:102, msg:'token过期'})
                }
                const sessionData = JSON.parse(result)
                reslove(sessionData)
            })
        })
    }, err => {
        return next(err)
    })
    .then((data) => {
        if(!data) return
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
    },err => {
        return next(err)
    })
    .catch((err) => {
        return next(err)
    })
}