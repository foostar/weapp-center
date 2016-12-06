const request = require('request')
const url = require('url')
const { raw, cmsAPI } = require("../middleware/middleware.js")
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
            if (err) return next(err)
            if (!body.rs) return next(body);
            res.json(formatList(body))
        })
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
            if (err) return next(err)
            if (!body.total_num) return next({rs:0, errcode: '对不起，没有找到匹配结果'});
            res.json(formatArticleList(body))
        })
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
            if (err) return next(err)
            if (!body.total_num) return next({rs:0, errcode: '对不起，没有找到匹配结果'});
            res.json(body)
        })
    })
}