const httpProxy = require('http-proxy')

var proxy = httpProxy.createProxyServer()

/*
 * @默认转发
 */
exports.transmit = (req, res) => {
    const uri = req.params.uri
    proxy.web(req, res, {
        changeOrigin: true,
        target: uri,
        ignorePath: true
    })

}
/*
 * @ 门户、文章列表数据处理
 */
