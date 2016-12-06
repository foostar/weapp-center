const request = require('request')
const url = require('url')
const { raw, cmsAPI } = require("../middleware/middleware.js")
const { formatParams, formatList, formatNewsList, formatArticle, formatPost, formatArticleList } = require('../utils/util.js')
/*
 * @帖子列表
 */
exports.postlist = (req, res, next) => {
    const {
        sort,
        page,
        pageSize,
    } = req.query

    const {
        appId,
        forumId
    } = req.params
    let options = req.query.options
    try {
        options = Object.assign({
            circle: 1,
            isImageList: 1,
            topOrder: 1,
            sortby: sort || 'all',
            page,
            pageSize,
            boardId: forumId
        }, JSON.parse(options))
    } catch (err) {
        options = {}
    }
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topiclist&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(err)
            res.json(formatList(body))
        })
    })
}
/*
 * @帖子、门户详情
 */
exports.postDetail = (req, res, next) => {
    const {
        boardId,
        page,
        pageSize,
        topicId
    } = req.query

    const {
        id,
        appId
    } = req.params
    let options
    try {
        options = JSON.parse(req.query.options)
    }
    catch (e) {
        options = {}
    }
    options = formatParams(options)
    try {
        options = Object.assign({
            boardId,
            page,
            pageSize,
            topicId
        }, options)
    } catch (err) {
        options = {}
    }
    let result
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/postlist&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(err)
            res.json(formatPost(page, body))
        })
    })
}