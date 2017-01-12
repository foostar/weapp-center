const request = require('request')
const { raw, cmsAPI } = require('../middleware/middleware.js')
const { errorType } = require('../utils/utils.js')
const dataCache = require('../datacache.js')

function Weapp() {

}
Weapp.prototype = {
    constructor: Weapp,
    // 请求函数
    fetch(appId, endpoint, options, extparams) {
        extparams = extparams || {}
        return new Promise((reslove, reject) => {
            cmsAPI.appBBS(appId)
            .then((data) => {
                if (extparams.method && extparams.method == 'POST') {
                    return request.post({
                        url : `${data.forumUrl}/mobcent/app/web/index.php?r=${endpoint}&${raw(options)}`,
                        form: extparams.body
                    }, (err, response, body) => {
                        if (err) return reject(errorType.mobcentError(err))
                        const result = JSON.parse(body)
                        if (!result.rs) return reject(errorType.mobcentError(result))
                        reslove(result)
                    })
                }
                const ext = /http/
                if (!ext.test(data.forumUrl)) {
                    data.forumUrl = `http://${data.forumUrl}`
                }
                let url = `${data.forumUrl}/mobcent/app/web/index.php?r=${endpoint}&${raw(options)}`
                if (extparams.url) {
                    url = extparams.url
                }
                request({
                    url
                }, (err, response, body) => {
                    if (err) return reject(errorType.mobcentError(err))
                    let json
                    try {
                        json = JSON.parse(body)
                    } catch (error) {
                        try {
                            /* eslint-disable */
                            const vm = require('vm')
                            /* eslint-enable */
                            const sandbox = { json: null }
                            const script = new vm.Script(`json=${body}`, sandbox)
                            const context = vm.createContext(sandbox)
                            script.runInContext(context)
                            json = sandbox.json
                        } catch (e) {
                            json = {}
                        }
                    }
                    if (endpoint != 'test/plugininfo' && !extparams.url) {
                        if (!json.rs) return reject(errorType.mobcentError(json))
                    }
                    if (extparams.url) {
                        if (json.errcode) return reject(errorType[101])
                        if (!json.expires_in) return reject(errorType[102])
                    }
                    reslove(json)
                })
            }, err => {
                reject(errorType.cmsError(err))
            })
        })
    },
    // app信息
    appInfo(storgeKey, appId, options) {
        dataCache.add(storgeKey, () => this.fetch(appId, 'htmlapi/getappinfo', options), {
            expires: 3 * 24 * 60 * 60 * 1000,
            sync   : 2,
            force  : true
        })
        return dataCache.get(storgeKey)
    },
    // ui模块信息
    appUI(storgeKey, appId, options) {
        dataCache.add(storgeKey, () => this.fetch(appId, 'app/initui', options), {
            expires: 3 * 24 * 60 * 60 * 1000,
            sync   : 1,
            force  : true
        })
        return dataCache.get(storgeKey)
    },
    // 搜索
    search(storgeKey, appId, options, extparams) {
        let endpoint = 'forum/search'
        if (extparams.type == 'article') {
            endpoint = 'portal/search'
        } else if (extparams.type == 'user') {
            endpoint = 'user/searchuser'
        }
        const fetch = () => this.fetch(appId, endpoint, options)
        dataCache.add(storgeKey, fetch, {
            expires: 5 * 60 * 1000,
            sync   : 2,
            force  : true
        })
        if (extparams.page != 1) return fetch()
        return dataCache.get(storgeKey)
    },
    // 发布帖子
    createTopic(storgeKeys, appId, options, extparams) {
        Promise.all(storgeKeys.map(v => {
            return dataCache.del(v)
        }))
        return this.fetch(appId, 'forum/topicadmin', options, extparams)
    },
    // 门户列表（帖子、文章）
    newslist(storgeKey, appId, options, extparams) {
        const fetch = () => this.fetch(appId, 'portal/newslist', options)
        dataCache.add(storgeKey, fetch, {
            expires: 5 * 60 * 1000,
            sync   : -1,
            force  : true
        })
        if (extparams.page != 1) return fetch()
        return dataCache.get(storgeKey)
    },
    // 文章详情
    newsview(storgeKey, appId, options, extparams) {
        const fetch = () => this.fetch(appId, 'portal/newsview', options)
        dataCache.add(storgeKey, fetch, {
            expires: 5 * 60 * 1000,
            sync   : 2,
            force  : true
        })
        if (extparams.page != 1) return fetch()
        return dataCache.get(storgeKey)
    },
    // 文章评论详情
    newscomment(storgeKey, appId, options, extparams) {
        const fetch = () => this.fetch(appId, 'portal/commentlist', options)
        dataCache.add(storgeKey, fetch, {
            expires: 5 * 60 * 1000,
            sync   : 1,
            force  : true
        })
        if (extparams.page != 1) return fetch()
        return dataCache.get(storgeKey)
    },
    // 帖子列表
    getListUrl(storgeKey, appId) {
        dataCache.add(storgeKey, () => this.fetch(appId, 'test/plugininfo', {}), {
            expires: 3 * 24 * 60 * 60 * 1000,
            sync   : 2,
            force  : true
        })
        return dataCache.get(storgeKey)
    },
    // 帖子列表
    postlist(storgeKey, appId, options, extparams) {
        const endpoint = extparams.type == 'new' ? 'forum/topiclistex' : 'forum/topiclist'
        const fetch = () => this.fetch(appId, endpoint, options)
        dataCache.add(storgeKey, fetch, {
            expires: 5 * 60 * 1000,
            sync   : 2,
            force  : true
        })
        if (extparams.page != 1) return fetch()
        return dataCache.get(storgeKey)
    },
    // 帖子详情
    post(appId, options) {
        return this.fetch(appId, 'forum/postlist', options)
    },
    // 关注列表
    followlist(storgeKey, appId, options, extparams) {
        const fetch = () => this.fetch(appId, 'forum/followlist', options)
        dataCache.add(storgeKey, fetch, {
            expires: 3 * 24 * 60 * 60 * 1000,
            sync   : 1,
            force  : true
        })
        if (extparams.page != 1) return fetch()
        return dataCache.get(storgeKey)
    },
    // 话题列表
    topiclist(storgeKey, appId, options, extparams) {
        const fetch = () => this.fetch(appId, 'topic/topicdtl', options)
        dataCache.add(storgeKey, fetch, {
            expires: 3 * 24 * 60 * 60 * 1000,
            sync   : 1,
            force  : true
        })
        if (extparams.page != 1) return fetch()
        return dataCache.get(storgeKey)
    },
    // 获取session
    getSessionKey(appId, endpoint, options, extparams) {
        return this.fetch(appId, endpoint, options, extparams)
    },
    // 微信快速登录
    platformLogin(appId, options) {
        return this.fetch(appId, 'user/wxlogin', options)
    },
    // 老用户绑定微信
    bindPlatform(appId, options) {
        return this.fetch(appId, 'user/saveplatforminfo', options)
    },
    // 检测是否能够微信登录
    platformInfo(appId, options) {
        return this.fetch(appId, 'user/platforminfo', options)
    }
}
const Api = Object.create(Weapp.prototype)
module.exports = Api
