const request = require('request')
const url = require('url')
const { raw, cmsAPI } = require("../middleware/middleware.js")
const { removeItem } = require('../redis/redis.js')
const { sendError } = require('../utils/util.js')
const { formatParams, formatList, formatNewsList, formatArticle, formatPost, formatArticleList } = require('../utils/util.js')
/*
 * @搜索帖子
 */
exports.searchPost = (req, res, next) => {
    const {
        appId
    } = req.params
    const {
        keyword,
        page,
        pageSize,
        searchid
    } = req.query
    let options
    try {
        options = Object.assign({
            keyword,
            page,
            pageSize,
            searchid
        }, JSON.parse(req.query.options))
    } catch (err) {
        options = {}
    }
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/search&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(sendError(err))
            if (!body.rs) return next(sendError(err));
            res.json(formatList(body))
        })
    }, err => {
        return next(sendError(err))
    })
}
/*
 * @搜索文章
 */
exports.searchArticle = (req, res, next) => {
    const {
        appId
    } = req.params
    const {
        keyword,
        page,
        pageSize,
        searchid
    } = req.query
    let options
    try {
        options = Object.assign({
            keyword,
            page,
            pageSize,
            searchid
        }, JSON.parse(req.query.options))
    } catch (err) {
        options = {}
    }
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=portal/search&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(sendError(err))
            if (!body.total_num) return next(sendError({rs:0, errcode: '对不起，没有找到匹配结果'}));
            res.json(formatArticleList(body))
        })
    }, err => {
        return next(sendError(err))
    })    
}
/*
 * @搜索文章
 */
exports.searchUser = (req, res, next) => {
    const {
        appId
    } = req.params
    const {
        keyword,
        page,
        pageSize,
        searchid
    } = req.query
    let options
    try {
        options = Object.assign({
            keyword,
            page,
            pageSize,
            searchid
        }, JSON.parse(req.query.options))
    } catch (err) {
        options = {}
    }
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=user/searchuser&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(sendError(err))
            if (!body.total_num) return next(sendError({rs:0, errcode: '对不起，没有找到匹配结果'}));
            res.json(body)
        })
    }, err => {
        return next(sendError(err))
    })
}
/*
 * @发表
 */
exports.createTopic = (req, res, next) => {
    const {
        appId
    } = req.params

    const { act, json } = req.body
    const body = JSON.parse(decodeURIComponent(decodeURIComponent(json))).body.json
    if (body.act != 'reply') {
        const storgeKeys = [
            `/api/${appId}/forum/${body.fid}/postsall`, 
            `/api/${appId}/forum/${body.fid}/postsnew`, 
            `/api/${appId}/forum/0/postsall`, 
            `/api/${appId}/forum/0/postsnew`, 
            `/api/${appId}/topicdtl${body.ti_id}NEW`,
            `/api/${appId}/topicdtl${body.ti_id}HOT`
        ]
        if(body.sortId) {
            storgeKeys.forEach(v => {
                v = v + body.sortId
            })
        }
        Promise.all(storgeKeys.map(v => {
            return removeItem(v)
        }))
        .catch(err => {
            console.log(err)
        })
    }
    const options = Object.assign({
        act: req.query.act
    }, JSON.parse(req.query.options), req.body)

    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topicadmin&${raw(options)}`, 
        }, (err, response, body) => {
            if (err) return next(sendError(err))
            const data = JSON.parse(body)
            if (!data.rs) return next(sendError({rs: 0, errcode: data.errcode, errmsg: '发表失败，请重试'}));
            res.json(data)
        })
    }, err => {
        return next(sendError(err))
    })
}
