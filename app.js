const express = require('express')
const httpProxy = require('http-proxy')
const fs = require('fs')
const https = require('https')
const User = require("./controllers/user.js")
const Postlist = require("./controllers/postlist.js")
const Newslist = require("./controllers/newslist.js")
const Common = require("./controllers/common.js")
const promiseRetry = require('promise-retry')
const bodyParser = require("body-parser")

const { raw, isAuthed, isAuthedMiddleware, cmsAPI } = require("./middleware/middleware.js")

const app = express()
app.all("*", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "X-Requested-With")
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS")
    next()
})

var proxy = httpProxy.createProxyServer()
/*
 * @url转发
 */
app.all('/client/:uri', isAuthedMiddleware(req => req.query.appId), (req, res, next) => {
    const uri = req.params.uri
    console.log("uri", uri)
    promiseRetry((retry, number) => {
        return proxy.web(req, res, {
            changeOrigin: true,
            target: uri,
            ignorePath: true
        })
        .catch(function (err) {
            console.log(111)
            if (err.code == 'ECONNRESET') {
                retry(err);
            }
            throw err;
        });
    })
    
})
// 搜索帖子
app.get('/api/:appId/forum/search', isAuthedMiddleware(req => req.params.appId), Common.searchPost)
// 搜索文章
app.get('/api/:appId/portal/search', isAuthedMiddleware(req => req.params.appId), Common.searchArticle)
// 搜索用户
app.get('/api/:appId/user/searchuser', isAuthedMiddleware(req => req.params.appId), Common.searchUser)
/*
 * @用户相关
 */
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
app.post('/api/:appId/wxLogin', isAuthedMiddleware(req => req.params.appId), bodyParser.json(), User.wxLogin)
/*
 * @门户相关
 */
// 门户、文章列表
app.get('/api/:appId/news/:id', isAuthedMiddleware(req => req.params.appId), Newslist.newsList)
//文章详情接口
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
// 分类信息列表
app.get('/api/:appId/forum/topiclist', isAuthedMiddleware(req => req.params.appId), Postlist.topiclist)


app.use((err, req, res, next) => {
    console.log("err", err, req.path)
    res.status(400).json(err)
})
// 项目启动
if(!process.env.NODE_ENV){
    https.createServer({
        key: fs.readFileSync('wildcard.apps.xiaoyun.com.key', 'utf8'),
        cert: fs.readFileSync('wildcard.apps.xiaoyun.com.crt', 'utf8')
    }, app).listen(443)
} else {
    app.listen(3000)
}
