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
            const data = {
                meta: {
                    page: body.page,
                    total: body.total_num
                },
                list: body.list.map(x => ({
                    id: x.source_type === 'topic' ? x.source_id : x.source_id,
                    forumId: x.board_id,
                    forumName: x.board_name,
                    title: x.title,
                    topTopicList: x.topTopicList,
                    user: {
                        id: x.user_id,
                        nickname: x.user_nick_name,
                        avatar: x.userAvatar,
                        title: x.userTitle
                    },
                    repliedAt: new Date(+x.last_reply_date),
                    views: x.hits,
                    replies: x.replies,
                    subject: x.summary,
                    gender: x.gender,
                    images: x.imageList.map(src => src.replace('xgsize_', 'mobcentSmallPreview_')),
                    zans: x.zanList
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
                    images: x.imageList.map(src => src.replace('xgsize_', 'mobcentSmallPreview_')),
                    zans: x.zanList
                }))
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


// https.createServer({
//     key: fs.readFileSync('wildcard.apps.xiaoyun.com.key', 'utf8'),
//     cert: fs.readFileSync('wildcard.apps.xiaoyun.com.crt', 'utf8')
// }, app).listen(443)

app.listen(3000)

