const { getQuery, versionCompare } = require('../middleware/middleware.js')
const { formatList, formatPost } = require('../utils/format.js')
const { sendError, recordApi } = require('../utils/utils.js')
const Api = require('../lib/api.js')
/*
 * @帖子列表
 */
exports.postlist = (req, res, next) => {
    const query = req.query
    let options = getQuery(query)
    const {
        appId,
        forumId
    } = req.params

    options = Object.assign(options, {
        topOrder: 1,
        circle  : 1,
        boardId : forumId,
    })

    let storgeKey = req.path + options.orderby
    if (options.sortid) {
        storgeKey = storgeKey + options.sortid
    }
    let endpointType = 'new'
    // 请求数据
    Api.getListUrl(appId, appId)
    .then(data => {
        if (versionCompare(data.mobcent_version, '2.6.1.7')) {
            endpointType = 'old'
        }
        return Api.postlist(storgeKey, appId, options, {
            type: endpointType,
            page: options.page
        })
    })
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json(formatList(data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @帖子、门户详情
 */
exports.postDetail = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const { appId } = req.params
    Api.post(appId, options)
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json(formatPost(options.page, data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @关注列表
 */
exports.followList = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const { appId } = req.params

    const storgeKey = req.path + options.orderby
    Api.followlist(storgeKey, appId, options, {
        page: options.page
    })
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json(formatList(data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
/*
 * @话题帖子列表
 */
exports.topiclist = (req, res, next) => {
    const query = req.query
    const options = getQuery(query)
    const {
        appId
    } = req.params
    const storgeKey = req.path + options.ti_id + options.orderby
    Api.topiclist(storgeKey, appId, options, {
        page: options.page
    })
    .then(data => {
        recordApi(req.requestTime, appId)
        res.json(formatList(data))
    })
    .catch(err => {
        next(sendError(err))
    })
}
