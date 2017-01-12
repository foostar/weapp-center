const express = require('express')
const httpProxy = require('http-proxy')
const Url = require('url')
const fs = require('fs')
const https = require('https')
const User = require('./controllers/user.js')
const Postlist = require('./controllers/postlist.js')
const Newslist = require('./controllers/newslist.js')
const Common = require('./controllers/common.js')
const promiseRetry = require('promise-retry')
const bodyParser = require('body-parser')
const config = require('./config/index.js')
const { isAuthedMiddleware } = require('./middleware/middleware.js')

const app = express()
app.all('*', (req, res, next) => {
    let key = req.path
    if (/client/.test(key)) {
        key = `${key}%23${req.query.appId}`
    }
    req.requestTime = [ key, Date.now() ]
    res.header('Access-Control-Allow-Origin', '*')
    // res.header("Access-Control-Allow-Headers", "X-Requested-With")
    // res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS")
    next()
})

const proxy = httpProxy.createProxyServer()
/* eslint-disable */
proxy.on('proxyRes', (proxyRes, req, res) => {
    const url = Url.parse(decodeURIComponent(req.requestTime[0].substr(8)))
    const query = url.query
    const key = query.substring(query.indexOf('=') + 1, query.indexOf('&'))
    if(config.showApiLog) {
        console.log(`转发服务：接口地址为：${key}, appId为：${url.hash.substr(1)}, 访问时长为:${Date.now() - req.requestTime[1]}毫秒`)
    }
})
/* eslint-enable */
/*
 * @url转发
 */
app.all('/client/:uri', isAuthedMiddleware(req => req.query.appId), (req, res) => {
    const uri = req.params.uri
    promiseRetry((retry) => {
        return proxy.web(req, res, {
            changeOrigin: true,
            target      : uri,
            ignorePath  : true
        })
        .catch((err) => {
            if (err.code == 'ECONNRESET') {
                retry(err)
            }
            throw err
        })
    })
})
// 搜索帖子
app.get('/api/:appId/forum/search', isAuthedMiddleware(req => req.params.appId), Common.searchPost)
// 搜索文章
app.get('/api/:appId/portal/search', isAuthedMiddleware(req => req.params.appId), Common.searchArticle)
// 搜索用户
app.get('/api/:appId/user/searchuser', isAuthedMiddleware(req => req.params.appId), Common.searchUser)
// 发表
app.post('/api/:appId/createTopic', isAuthedMiddleware(req => req.params.appId), bodyParser.json(), Common.createTopic)
// ui模块
app.get('/api/:appId/getappinfo', isAuthedMiddleware(req => req.params.appId), Common.getAppinfo)
// app模块
app.get('/api/:appId/initui', isAuthedMiddleware(req => req.params.appId), Common.initUI)
/*
 * @用户相关
 */
// 获取小程序信息
app.get('/api/:appId/weapp', isAuthedMiddleware(req => req.params.appId), User.weapp)
// 验证微信登录
app.get('/api/:appId/onLogin', isAuthedMiddleware(req => req.params.appId), User.onLogin)
// 验证session
app.get('/api/:appId/checkLogin', isAuthedMiddleware(req => req.params.appId), User.checkLogin)
// 验证用户信息
// app.get('/api/:appId/authUser', isAuthedMiddleware(req => req.params.appId), User.authUser)
// 老用户绑定微信
app.post('/api/:appId/bindPlatform', isAuthedMiddleware(req => req.params.appId), bodyParser.json(), User.bindPlatform)
// 微信登录
app.post('/api/:appId/platformLogin', isAuthedMiddleware(req => req.params.appId), bodyParser.json(), User.platformLogin)
// 检测微信登录
app.post('/api/:appId/platformInfo', isAuthedMiddleware(req => req.params.appId), bodyParser.json(), User.platformInfo)
// 微信快速登录
app.post('/api/:appId/wxLogin', isAuthedMiddleware(req => req.params.appId), bodyParser.json(), User.platformInfo)
/*
 * @门户相关
 */
// 门户、文章列表
app.get('/api/:appId/news/:id', isAuthedMiddleware(req => req.params.appId), Newslist.newsList)
// 文章详情接口
app.get('/api/:appId/article/:id', isAuthedMiddleware(req => req.params.appId), Newslist.newsDetail)
/*
 * @帖子相关
 */
// 帖子列表
app.get('/api/:appId/forum/:forumId/posts', isAuthedMiddleware(req => req.params.appId), Postlist.postlist)
// 帖子详情接口
app.get('/api/:appId/post/:id', isAuthedMiddleware(req => req.params.appId), Postlist.postDetail)
// 关注列表
app.get('/api/:appId/followlist', isAuthedMiddleware(req => req.params.appId), Postlist.followList)
// 话题帖子列表
app.get('/api/:appId/topicdtl', isAuthedMiddleware(req => req.params.appId), Postlist.topiclist)
/* eslint-disable */
app.use((err, req, res, next) => {
    res.status(400).json(err)
})
/* eslint-enable */
// 项目启动
if (!process.env.NODE_ENV) {
    https.createServer({
        key : fs.readFileSync('wildcard.apps.xiaoyun.com.key', 'utf8'),
        cert: fs.readFileSync('wildcard.apps.xiaoyun.com.crt', 'utf8')
    }, app).listen(443)
} else {
    app.listen(3000)
}
