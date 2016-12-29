const fetch = require('node-fetch')
const cms = require('xiaoyun-cmsapi')
const config = require('../config/index')
const cmsAPI = new cms.API(config.cms_url, '100002', '8F97093B9DE32CBA569EAD6456C32A', {
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



module.exports = {
    raw,
    isAuthed,
    isAuthedMiddleware,
    cmsAPI
}