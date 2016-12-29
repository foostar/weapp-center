const request = require('request')
const url = require('url')
const { raw, cmsAPI } = require("../middleware/middleware.js")
const { setItem, getItem, setExpire } = require("../redis/redis.js")
const { sendError } = require('../utils/util.js')
const { formatParams, formatList, formatNewsList, formatArticle, formatPost, formatArticleList } = require('../utils/util.js')
/*
 * @帖子列表
 */
const getListData = (storgeKey, page) => {
    return new Promise((reslove, reject) => {
        if (page != 1) reslove()
        getItem(storgeKey)
        .then((result) => {
            reslove({ cache: true, data: result })
        })
        .catch(err => {
            reject(err)
        })
    })
}
exports.postlist = (req, res, next) => {
    const {
        orderby,
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
            orderby: orderby || 'all',
            page,
            pageSize,
            boardId: forumId
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
                    url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topiclistex&${raw(options)}`,
                    json: true
                }, (err, response, body) => {
                    if (err) return next(sendError(err))
                    setItem(storgeKey, JSON.stringify(body))
                    return res.json(formatList(body))
                })
            }, err => {
                return next(sendError(err))
            })  
        }
        next(sendError(err))
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
        topicId,
        sort
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
            topicId,
            sort
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
    }, err => {
        return next(err)
    })
}
/*
 * @关注列表
 */
exports.followList = (req, res, next) => {
    const {
        orderBy,
        page,
        pageSize,
    } = req.query

    const {
        appId
    } = req.params

    let options = req.query.options
    try {
        options = Object.assign({
            page,
            pageSize,
            orderBy
        }, JSON.parse(options))
    } catch (err) {
        return next(err)
    }

    const storgeKey = req.path + JSON.stringify(options)

    getListData(storgeKey, page)
    .then((data) => {
        return res.json(formatList(JSON.parse(data.data)))
    })
    .catch(err => {
        if(err.errcode && err.errcode == 106) {
            cmsAPI.appBBS(appId).then((data) => {
                request({
                    url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/followlist&${raw(options)}`,
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
        next(sendError(err))
    })
    
}
/*
 * @分类信息列表
 */
const versionCompare = (currVer, promoteVer) => {
    currVer = currVer || '0.0.0.0'
    promoteVer = promoteVer || '0.0.0.0'
    if (currVer === promoteVer) return false
    const currVerArr = currVer.split('.')
    const promoteVerArr = promoteVer.split('.')
    const len = Math.max(currVerArr.length, promoteVerArr.length)
    for (let i = 0; i < len; i++) {
        let proVal = +promoteVerArr[ i ]
        let curVal = +currVerArr[ i ]
        if (proVal < curVal) {
            return false
        } else if (proVal > curVal) {
            return true
        }
    }
    return false
}
const getTopicList = (data, options) => {
    return new Promise((reslove,reject) => {
        let listUrl = `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topiclistex&${raw(options)}`
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=test/plugininfo`,
            json: true
        }, (err, response, body) => {
            if (err) return reject(err)
            if(versionCompare(body.mobcent_version, '2.6.1.7')){
                listUrl = `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topiclist&${raw(options)}`
            }
            reslove(listUrl)
        })
    })
    
}
exports.topiclist = (req, res, next) => {
    const {
        sorts,
        page,
        pageSize,
        orderby,
        boardId,
        topOrder,
        circle,
        sortid
    } = req.query

    const {
        appId
    } = req.params

    let options = req.query.options
    try {
        options = Object.assign({
            sorts,
            page,
            pageSize,
            orderby,
            boardId,
            topOrder,
            circle,
            sortid
        }, JSON.parse(options))
    } catch (err) {
        return next(err)
    }

    const storgeKey = req.path + JSON.stringify(options)

    getListData(storgeKey, page)
    .then((data) => {
        return res.json(formatList(JSON.parse(data.data)))
    })
    .catch(err => {
        if(err.errcode && err.errcode == 106) {
            return cmsAPI.appBBS(appId).then((data) => {
                return getTopicList(data, options)
            })
            .then((listUrl) => {
                request({
                    url: listUrl,
                    json: true
                }, (err, response, body) => {
                    if (err) return next(sendError(err))
                    setItem(storgeKey, JSON.stringify(body))
                    return res.json(body)
                })
            }, err => {
                return next(sendError(err))
            })
        }
        next(sendError(err))
    })
}