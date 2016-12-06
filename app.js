const express = require('express')
const httpProxy = require('http-proxy')
const fs = require('fs')
const https = require('https')
const User = require("./controllers/user.js")
const Postlist = require("./controllers/postlist.js")
const Newslist = require("./controllers/newslist.js")
const Common = require("./controllers/common.js")

const { raw, isAuthed, isAuthedMiddleware, cmsAPI } = require("./middleware/middleware.js")

const app = express()

var proxy = httpProxy.createProxyServer()
/*
 * @url转发
 */
app.all('/client/:uri', isAuthedMiddleware(req => req.query.appId), (req, res) => {
    const uri = req.params.uri
    proxy.web(req, res, {
        changeOrigin: true,
        target: uri,
        ignorePath: true
    })
})
/*
 * @common相关
 */
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
app.get('/api/:appId/authUser', isAuthedMiddleware(req => req.params.appId), User.authUser)
// 老用户绑定微信
app.get('/api/:appId/bindPlatform', isAuthedMiddleware(req => req.params.appId), User.bindPlatform)
// 微信登录
app.get('/api/:appId/platformLogin', isAuthedMiddleware(req => req.params.appId), User.platformLogin)
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


app.use((err, req, res, next) => {
    res.status(400).json(err)
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
