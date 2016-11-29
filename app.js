const express = require('express')
const httpProxy = require('http-proxy')
const url = require('url')
const fs = require('fs')
const https = require('https')
const request = require('request')
const fetch = require('node-fetch')
const cms = require('xiaoyun-cmsapi')
const { formatParams, formatList, formatNewsList, formatArticle, formatPost, formatArticleList } = require('./utils/util.js')

const app = express()

var proxy = httpProxy.createProxyServer()

const cmsAPI = new cms.API('http://cmsapi.app.xiaoyun.com/GpCmsApi', '100002', '8F97093B9DE32CBA569EAD6456C32A', {
    cache: false,
    fetch
})
const raw = (args, up) =>
    Object.keys(args)
        .sort()
        .reduce((a, b) => `${a}&${up ? b.toLowerCase() : b}=${args[ b ]}`, '')
        .slice(1)

const isAuthed = (appId) => {
    return cmsAPI
        .auth(appId)
        .then(data => {
            return data && data.length && data.indexOf('WPP') !== -1
        }, (err) => {
            console.log(err)
        })
}

const isAuthedMiddleware = fn => (req, res, next) => {
    const appId = fn(req)
    isAuthed(appId)
        .then((authed) => {
            if (authed) return next()
            res.status(404).end()
        }, () => {
            res.status(404).end()
        })
}

app.all('/client/:uri', isAuthedMiddleware(req => req.query.appId), (req, res) => {
    const uri = req.params.uri
    proxy.web(req, res, {
        changeOrigin: true,
        target: uri,
        ignorePath: true
    })
})
// 门户、文章列表
app.get('/api/:appId/news/:id', isAuthedMiddleware(req => req.params.appId), (req, res, next) => {
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

    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=portal/newslist&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(err)
            res.json(formatNewsList(body))
        })
    })
})
// 帖子列表
app.get('/api/:appId/forum/:forumId/posts', isAuthedMiddleware(req => req.params.appId), (req, res, next) => {
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
    console.log(options)
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topiclist&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(err)
            res.json(formatList(body))
        })
    })

})

//文章详情接口
app.get('/api/:appId/article/:id', isAuthedMiddleware(req => req.params.appId), (req, res, next) => {
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
    })
})
//帖子详情接口
app.get('/api/:appId/post/:id', isAuthedMiddleware(req => req.params.appId), (req, res, next) => {
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
    console.log("options", options)
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
})
// 搜索帖子
app.get('/api/:appId/forum/search', isAuthedMiddleware(req => req.params.appId), (req, res, next) => {
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
            res.json(formatList(body))
        })
    })
    
})
// 搜索文章
app.get('/api/:appId/portal/search', isAuthedMiddleware(req => req.params.appId), (req, res, next) => {
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
                console.log("body", body)
            res.json(formatArticleList(body))
        })
    })
    
})
// 项目启动
if(process.env.NODE_ENV === 'production'){
    app.listen(3000)
} else {
    https.createServer({
        key: fs.readFileSync('wildcard.apps.xiaoyun.com.key', 'utf8'),
        cert: fs.readFileSync('wildcard.apps.xiaoyun.com.crt', 'utf8')
    }, app).listen(443)
}


// 

