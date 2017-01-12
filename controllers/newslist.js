const { getQuery } = require('../middleware/middleware.js')
const Api = require('../lib/api.js')
const { sendError, recordApi } = require('../utils/utils.js')
const { formatArticle, formatNewsList } = require('../utils/format.js')
/*
 * @门户、文章列表
 */
exports.newsList = (req, res, next) => {
    const query = req.query
    let options = getQuery(query)

    const {
        id,
        appId
    } = req.params

    options = Object.assign({
        circle     : 1,
        isImageList: 1,
        moduleId   : id
    }, options)

    let storgeKey = req.path + options.orderby
    if (options.sortid) {
        storgeKey = storgeKey + options.sortid
    }
    Api.newslist(storgeKey, appId, options, {
        page: options.page
    })
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json(formatNewsList(data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @文章详情
 */
exports.newsDetail = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const {
        id,
        appId
    } = req.params
    const params = Object.assign({}, options, {
        json: JSON.stringify({
            id,
            idType  : 'aid',
            pageSize: 20,
            page    : parseInt(options.page, 10)
        })
    })
    const storgeKey = req.path + options.aid
    let result
    Api.newsview(storgeKey, appId, options, {
        page: options.page
    })
    .then(body => {
        result = body.body.newsInfo
        result.content && result.content.forEach((v) => {
            if (v.type == 'image') {
                v.type = 1
                v.content = v.content.replace('xgsize_', 'mobcentSmallPreview_')
                delete v.extraInfo
            } else {
                v.type = 0
            }
        })
        return Api.newscomment(`${storgeKey}comments`, appId, params, {
            page: options.page
        })
    })
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json(formatArticle(result, data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
