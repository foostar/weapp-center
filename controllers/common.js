const { getQuery } = require('../middleware/middleware.js')
const { sendError, recordApi } = require('../utils/utils.js')
const Api = require('../lib/api.js')
const { formatList, formatArticleList } = require('../utils/format.js')
/*
 * @搜索帖子
 */
exports.searchPost = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const { appId } = req.params
    const storgeKey = req.path + options.keyword
    Api.search(storgeKey, appId, options, {
        type: 'post',
        page: options.page
    })
    .then((data) => {
        recordApi(req.requestTime, appId)
        res.json(formatList(data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @搜索文章
 */
exports.searchArticle = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const { appId } = req.params
    const storgeKey = req.path + options.keyword
    Api.search(storgeKey, appId, options, {
        type: 'article',
        page: options.page
    })
    .then((data) => {
        recordApi(req.requestTime, appId)
        res.json(formatArticleList(data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @搜索文章
 */
exports.searchUser = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const { appId } = req.params
    const storgeKey = req.path + options.keyword
    Api.search(storgeKey, appId, options, {
        type: 'user',
        page: options.page
    })
    .then((data) => {
        recordApi(req.requestTime, appId)
        res.json(data)
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @发表
 */
exports.createTopic = (req, res, next) => {
    const { appId } = req.params
    const { json } = req.body
    const body = JSON.parse(decodeURIComponent(json)).body.json
    let storgeKeys = []
    if (body.act != 'reply') {
        storgeKeys = [
            `/api/${appId}/forum/${body.fid}/postsall`,
            `/api/${appId}/forum/${body.fid}/postsnew`,
            `/api/${appId}/forum/0/postsall`,
            `/api/${appId}/forum/0/postsnew`,
            `/api/${appId}/topicdtl${body.ti_id}NEW`,
            `/api/${appId}/topicdtl${body.ti_id}HOT`
        ]
        if (body.sortId) {
            storgeKeys = storgeKeys.map((v) => {
                v = v + body.sortId
                return v
            })
        }
    }
    Api.createTopic(storgeKeys, appId, JSON.parse(req.query.options), {
        method: 'POST',
        body  : req.body
    })
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json(data)
    })
    .catch(err => {
        next(sendError(err))
    })
}
// app模块信息请求
exports.getAppinfo = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const { appId } = req.params
    const storgeKey = req.path

    Api.appInfo(storgeKey, appId, options)
    .then((data) => {
        recordApi(req.requestTime, appId)
        res.json(data)
    })
    .catch(err => {
        next(sendError(err))
    })
}
// APP初始化ui
exports.initUI = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const { appId } = req.params
    const storgeKey = req.path
    Api.appUI(storgeKey, appId, options)
    .then((data) => {
        recordApi(req.requestTime, appId)
        res.json(data)
    })
    .catch(err => {
        next(sendError(err))
    })
}
