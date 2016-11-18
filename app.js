const express = require('express')
const httpProxy = require('http-proxy')
const url = require('url')
const fs = require('fs')
const https = require('https')
const request = require('request')
const fetch = require('node-fetch')
const cms = require('xiaoyun-cmsapi')

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

const formatParams = (params) => {
    params = Object.assign({}, params, {
        accessToken: params.token,
        accessSecret: params.secret
    })
    delete params.token
    delete params.secret
    return params
}
app.all('/client/:uri', isAuthedMiddleware(req => req.query.appId), (req, res) => {
    const uri = req.params.uri
    proxy.web(req, res, {
        changeOrigin: true,
        target: uri,
        ignorePath: true
    })
})

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
                console.log("aaa")
            const data = {
                meta: {
                    page: body.page,
                    total: body.total_num
                },
                list: body.list.map(x => ({
                    id: x.source_id,
                    type: x.source_type == 'news' ? 'article' : 'post',
                    forumId: x.board_id || '',
                    forumName: x.board_name || '',
                    title: x.title,
                    topTopicList: x.topTopicList,
                    user: {
                        id: x.user_id,
                        nickname: x.user_nick_name,
                        avatar: x.userAvatar,
                        title: x.userTitle || '',
                        verify: x.verify || []
                    },
                    repliedAt: new Date(+x.last_reply_date) || '',
                    views: x.hits,
                    replies: x.replies,
                    subject: x.summary,
                    gender: x.gender,
                    reply: x.reply || [],
                    images: x.imageList.map(src => src.replace('xgsize_', 'mobcentSmallPreview_')),
                    zanList: x.zanList || new Array(x.recommendAdd),
                    recommendAdd: x.recommendAdd || 0,
                    zones: x.distance || '',
                    distance: x.location || '',
                    redirect: x.redirectUrl || ''
                }))
            }
            res.json(data)
        })
    })
})

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

    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/topiclist&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(err)
            const data = {
                meta: {
                    page: body.page,
                    total: body.total_num
                },
                list: body.list.map(x => ({
                    id: x.topic_id,
                    forumId: x.board_id,
                    forumName: x.board_name,
                    title: x.title,
                    user: {
                        id: x.user_id,
                        nickname: x.user_nick_name,
                        avatar: x.userAvatar,
                        title: x.userTitle
                    },
                    repliedAt: new Date(+x.last_reply_date),
                    views: x.hits,
                    replies: x.replies,
                    subject: x.subject,
                    gender: x.gender,
                    reply: x.reply || [],
                    recommendAdd: x.recommendAdd || 0,
                    images: x.imageList.map(src => src.replace('xgsize_', 'mobcentSmallPreview_')),
                    zanList: x.zanList
                })),
            }
            data.topTopicList = body.topTopicList
            const forumInfo = body.forumInfo
            if (forumInfo) {
                data.forum = {
                    id: forumInfo.id,
                    name: forumInfo.title,
                    description: forumInfo.description,
                    icon: forumInfo.icon,
                    todayPosts: forumInfo.td_posts_num,
                    totalPosts: forumInfo.posts_total_num,
                    totalTopics: forumInfo.topic_total_num,
                    isFocus: forumInfo.is_focus
                }
            }
            res.json(data)
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
                const data = {
                    type: 'article',
                    allowComment: result.allowComment,
                    redirectUrl: result.redirectUrl,
                    title: result.title,
                    createAt: result.dateline,
                    author: result.author,
                    views: result.viewNum,
                    replies: result.commentNum,
                    page: result.pageCount,
                    forumName: result.from,
                    content: result.content,
                    colleted: parseInt(result.is_favor),
                    like: 2,
                    authorAvatar: result.avatar,
                    userId: result.uid,
                    catName: result.catName,
                    sex: result.gender,
                    zanList: x.zanList,
                    list: body.list || [],
                    totalNum:body.count || 0
                }
                res.json(data)
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
    
    let result
    cmsAPI.appBBS(appId).then((data) => {
        request({
            url: `${data.forumUrl}/mobcent/app/web/index.php?r=forum/postlist&${raw(options)}`,
            json: true
        }, (err, response, body) => {
            if (err) return next(err)
            let data
            if (page == 1){
                const result = body.topic
                result.content && result.content.forEach((v) => {
                    v.content = v.infor
                    v.content = v.content.replace('xgsize_', 'mobcentSmallPreview_')
                })
                data = {
                    type: 'post',
                    allowComment: 1,
                    redirectUrl: '',
                    title: result.title,
                    createAt: result.create_date,
                    author: result.user_nick_name,
                    views: result.hits,
                    replies: result.replies,
                    page: body.page,
                    forumName: body.forumName,
                    content: result.content,
                    colleted: parseInt(result.is_favor),
                    like: 0,
                    boardId:body.boardId,
                    authorAvatar: result.icon,
                    userId: result.user_id,
                    isFollow: result.isFollow,
                    level:result.level,
                    userTitle:result.userTitle,
                    userColor:result.userColor,
                    catName: "",
                    sex: result.gender,
                    zanList:result.zanList,
                    list: body.list,
                    totalNum:body.total_num || 0,
                    id:result.topic_id
                }
            } else {
                data = {
                   page: body.page,
                   list: body.list,
                   totalNum:body.total_num || 0 
                }
            }
            res.json(data)
        })
    })
})
if(process.env.NODE_ENV === 'production'){
    app.listen(3000)
} else {
    https.createServer({
        key: fs.readFileSync('wildcard.apps.xiaoyun.com.key', 'utf8'),
        cert: fs.readFileSync('wildcard.apps.xiaoyun.com.crt', 'utf8')
    }, app).listen(443)
}


// 

