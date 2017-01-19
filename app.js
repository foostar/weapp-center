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
const createError = require('http-errors')
const morgan = require('morgan')
const requestIp = require('request-ip')

const { isAuthedMiddleware } = require('./middleware/middleware.js')

morgan.token('ip', req => requestIp.getClientIp(req))

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
    // if(process.env.showApiLog) {
    //     console.log(`转发服务：接口地址为：${key}, appId为：${url.hash.substr(1)}, 访问时长为:${Date.now() - req.requestTime[1]}毫秒`)
    // }
})

if(process.env.showApiLog) {
    app.use(morgan('--- :method :url - :status\\n    TIME: :date[iso] - :response-time ms\\n    IP  : :ip\\n    UA  : :user-agent', {
      skip(req) { return false }
    }))
}

/* eslint-enable */
/*
 * @url转发
 */
app.all('/client/:uri', isAuthedMiddleware, (req, res) => {
    console.log(111)
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

app.all('/*', isAuthedMiddleware)
app.use(bodyParser.json())

// 搜索帖子
app.get('/api/:appId/forum/search', Common.searchPost)
// 搜索文章
app.get('/api/:appId/portal/search', Common.searchArticle)
// 搜索用户
app.get('/api/:appId/user/searchuser', Common.searchUser)
// 发表
app.post('/api/:appId/createTopic', Common.createTopic)
// ui模块
app.get('/api/:appId/getappinfo', Common.getAppinfo)
// app模块
app.get('/api/:appId/initui', Common.initUI)
/*
 * @用户相关
 */
// 获取小程序信息
app.get('/api/:appId/weapp', User.weapp)
// 验证微信登录
app.get('/api/:appId/onLogin', User.onLogin)
// 验证session
app.get('/api/:appId/checkLogin', User.checkLogin)
// 验证用户信息
// app.get('/api/:appId/authUser', User.authUser)
// 老用户绑定微信
app.post('/api/:appId/bindPlatform', User.bindPlatform)
// 微信登录
app.post('/api/:appId/platformLogin', User.platformLogin)
// 检测微信登录
app.post('/api/:appId/platformInfo', User.platformInfo)
// 微信快速登录
app.post('/api/:appId/wxLogin', User.platformInfo)
/*
 * @门户相关
 */
// 门户、文章列表
app.get('/api/:appId/news/:id', Newslist.newsList)
// 文章详情接口
app.get('/api/:appId/article/:id', Newslist.newsDetail)
/*
 * @帖子相关
 */
// 帖子列表
app.get('/api/:appId/forum/:forumId/posts', Postlist.postlist)
// 帖子详情接口
app.get('/api/:appId/post/:id', Postlist.postDetail)
// 关注列表
app.get('/api/:appId/followlist', Postlist.followList)
// 话题帖子列表
app.get('/api/:appId/topicdtl', Postlist.topiclist)
/* eslint-disable */
app.use((req, res, next) => {
    console.log(222)
    next(createError(404))
})
app.use((err, req, res, next) => {
    console.log("err", err)
    res.status(err.status || 400).json(err)
})
/* eslint-enable */
// 项目启动
if (!process.env.NODE_ENV || process.env.NODE_ENV == 'admin') {
    https.createServer({
        key : fs.readFileSync('wildcard.apps.xiaoyun.com.key', 'utf8'),
        cert: fs.readFileSync('wildcard.apps.xiaoyun.com.crt', 'utf8')
    }, app).listen(443)
} else {
    app.listen(3000)
}
