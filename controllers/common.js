const request = require('request')
const url = require('url')
const { raw, cmsAPI } = require("../middleware/middleware.js")
const { removeItem } = require('../redis/redis.js')
const { sendError } = require('../utils/util.js')
const { formatList, formatArticleList, errorType } = require('../utils/util.js')
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
    cmsAPI.appBBS(appId)
    .then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/search&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(errorType.mobcentError(err))
            if (!body.rs) return next(errorType.mobcentError(body))
            res.json(formatList(body))
        })
    }, err => {
        return next(errorType.cmsError(err))
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
            if (err) return next(errorType.mobcentError(err))
            if (!body.total_num) return next(errorType.mobcentError(body))
            res.json(formatArticleList(body))
        })
    }, err => {
        return next(errorType.cmsError(err))
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
            if (err) return next(errorType.mobcentError(err))
            if (!body.rs) return next(errorType.mobcentError(body))
            res.json(body)
        })
    }, err => {
        return next(errorType.cmsError(err))
    })
}
/*
 * @发表
 */
exports.createTopic = (req, res, next) => {
    console.log(222)
    const {
        appId
    } = req.params

    const { act, json } = req.body
    console.log(111)
    console.log(decodeURIComponent(json))
    const body = JSON.parse(decodeURIComponent(json)).body.json
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
    cmsAPI.appBBS(appId)
    .then((data) => {
        request.post({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topicadmin&${raw(JSON.parse(req.query.options))}`, 
            form: req.body
        }, (err, response, body) => { 
            if (err) return next(errorType.mobcentError(err))
            const data = JSON.parse(body)
            if (!data.rs) return next(errorType.mobcentError(data))
            res.json(data)
        })
    }, err => {
        return next(errorType.cmsError(err))
    })
}
