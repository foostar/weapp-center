const redis = require('redis')
const client = redis.createClient('6379', '127.0.0.1');
const crypto = require('crypto')
const request = require('request')
const WXBizDataCrypt = require('../utils/WXBizDataCrypt.js')
const { raw, cmsAPI } = require('../middleware/middleware.js')
const Promise = require('promise')
/*
 * @储存session
 */
const getSessionKey = (options) => {
    return new Promise((reslove, reject) => {
        request({
            url: `https://api.weixin.qq.com/sns/jscode2session?${options}`,
            json: true
        }, (err, response, body) => {
            if (err) reject(err)
            if (!body.expires_in) return reject({ "errcode": 40029, "errmsg": "session 过期" })
            reslove(body) 
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
    let appid = 'wxf1fa714cc2ee72dd'
    let options = raw({
        appid,
        secret: '41be269217ad0591ae5ab0aba74a9a2f',
        js_code: code,
        grant_type: 'authorization_code'
    })
    // 获取小程序appid
    // 获取openId、session_key和expires_in
    // request({
    //     url: `http://test-cmsapi.app.xiaoyun.com/GpCmsApi/wpp/${xyAppId}/setting.do?`,
    //     json: true
    // }, (err, response, body) => {
    //     if (err) reject(err)
    //     console.log("body", body)
    // })
    getSessionKey(options)
    .then((body) => {
        // 建立3rd_session
        const { openid, session_key } = body
        const value = JSON.stringify({ openid, session_key, appid })
        return createSession(value)
    }, (err) => {
        return next(err)
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
exports.authUser = (req, res, next) => {
    let { signature, token, rawData, iv, encryptedData } = req.query
    encryptedData = encryptedData.replace(/\s/g,"+")
    client.get(token, function(err,result){  
        if (err) {  
            return next({errcode:102, msg:'token过期'})
        }
        const sessionData = JSON.parse(result)
        const sessionKey = sessionData.session_key
        const openId = sessionData.openid
        const appId = sessionData.appid
        let pc,tmpData
        try {
            pc = new WXBizDataCrypt(appId, sessionKey)
            tmpData = pc.decryptData(encryptedData , iv)
        }
        catch(e) {
            return next({errcode:103, msg:'用户信息不正确'})
        }
        
        const sign = crypto.createHash('sha1').update(`${rawData}${sessionKey}`).digest('hex').toString()
        if (signature != sign) {
            return next({errcode:103, msg:'用户信息不正确'})
        }
        client.set(token, JSON.stringify(Object.assign({}, sessionData, { unionId: tmpData.unionId })), function(err, result){  
            if (err) {  
                return next(err);
            }  
            res.json({ rs: 1, msg: '用户信息正确' })
        })
    }); 
}
/*
 * @老用户绑定微信
 */
const bindPlatform_static = (appId, options) => {
    return new Promise((reslove, reject) => {
        cmsAPI.appBBS(appId).then((data) => {
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/saveplatforminfo&${options}`,
                json: true
            }, (err, response, body) => {
                if (err) reject(err)
                reslove(body)
            })
        })
    })
}
exports.bindPlatform = (req, res, next) => {
    const queryData = Object.assign({}, req.query)
    const { token } = queryData
    delete queryData.token;
    const xyAppId = req.params.appId
    client.get(token, function(err,result){  
        if (err) {  
            return next({errcode:102, msg:'token过期'})
        }
        const sessionData = JSON.parse(result)
        return bindPlatform_static(xyAppId, Object.assign({}, queryData, {
            openId:sessionData.openid,
            unionId:sessionData.unionId
        })) 
    })
    .then((data) => {
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
        console.log("platformLogin", options)
        cmsAPI.appBBS(appId).then((data) => {
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/wxlogin&${options}`,
                json: true
            }, (err, response, body) => {
                if (err) reject(err)
                reslove(body)
            })
        })
    })
}
exports.platformLogin = (req, res, next) => {
    // 根据appId拿到froumkey
    const queryData = Object.assign({}, req.query)
    console.log(queryData)
    const { token } = queryData
    delete queryData.token;
    const xyAppId = req.params.appId
    client.get(token, function(err,result){
        if (err || !result) {  
            return next({errcode:102, msg:'token过期'})
        }
        const sessionData = JSON.parse(result)
        return new Promise((reslove, reject) => {
            cmsAPI.appInfo(xyAppId).then((data) => {
                reslove({forumKey: data.forumKey, sessionData})
            },(err) => {
                reject(err)
            })
        })  
    })
    .then((data) => {
        const { forumKey, sessionData } = data
        const openid = sessionData.openid
        queryData.json = Object.assing({}, queryData.json, {
            openid,
            forumKey,
            unionid:sessionData.unionId
        })
        return platformLogin_static(xyAppId, queryData)
    }, (err) => {
        return next({errcode:102, msg:'获取appid失败！'})
    })
    .then((result) => {
        return Object.assign({}, result, { rs: 1 })
    })
}