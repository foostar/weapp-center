const request = require('request')
const url = require('url')
const { setItem, getItem, setExpire } = require("../redis/redis.js")
const { sendError } = require('../utils/util.js')
const { raw, cmsAPI } = require("../middleware/middleware.js")
const { formatParams, formatList, formatNewsList, formatArticle, formatPost, formatArticleList } = require('../utils/util.js')
/*
 * @门户、文章列表
 */
exports.newsList = (req, res, next) => {
    const {
        sort,
        page,
        pageSize
    } = req.query

    const {
        id,
        appId
    } = req.params

    let options = req.query.options

    try {
        options = Object.assign({
            circle: 1,
            isImageList: 1,
            sortby: sort || 'all',
            page,
            pageSize,
            moduleId: id
        }, JSON.parse(options))
    } catch (err) {
        options = {}
    }

    const storgeKey = req.path + JSON.stringify(options)

    getListData(storgeKey, page)
    .then((data) => {
        return res.json(formatList(JSON.parse(data.data)))
    })
    .catch(err => {
        if(err.errcode && err.errcode == 106) {
            return cmsAPI.appBBS(appId).then((data) => {
                request({
                    url: `${data.forumUrl}/mobcent/app/web/index.php?r=portal/newslist&${raw(options)}`,
                    json: true
                }, (err, response, body) => {
                    if (err) return next(sendError(err))
                    setItem(storgeKey, JSON.stringify(body))
                    res.json(formatList(body))
                })
            }, err => {
                return next(sendError(err))
            })  
        }
    })
}
/*
 * @文章详情
 */
exports.newsDetail = (req, res, next) => {
    const {
        page,
        json
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
    let params = Object.assign({}, options,{
            json: JSON.stringify({
                id,
                idType:'aid',
                pageSize:20,
                page:parseInt(page)
            })
        })
    try {
        options = Object.assign({
            page,
            aid:id,
            appId,
            json
        }, options)
    } catch (err) {
        options = {}
    }
    
    let result
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=portal/newsview&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(err)
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
            request({
                url: `${data.forumUrl}/mobcent/app/web/index.php?r=portal/commentlist&${raw(params)}`,
                json: true
            }, (err, response, body) => {
                if (err) return next(err)
                res.json(formatArticle(result, body))
            })
            
        })
    }, err => {
        return next(err)
    })
}