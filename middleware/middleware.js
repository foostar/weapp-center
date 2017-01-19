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
        .reduce((a, b) => `${a}&${up ? b.toLowerCase() : b}=${args[b]}`, '')
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

const isAuthedMiddleware = (req, res, next) => {
    let appId = req.query.appId
    if (/^\/api/.test(req.path)) {
        const urlArr = req.path.split('/')
        let result
        for (let i = 0; i < urlArr.length; i++) {
            result = urlArr[i]
            if (/^\d+$/.test(result)) {
                appId = result
                break
            }
        }
    }
    isAuthed(appId)
        .then((authed) => {
            if (authed) return next()
            res.status(404).end()
        }, () => {
            res.status(404).end()
        })
}
const getQuery = (query) => {
    let options = {}

    Object.keys(query).forEach(v => {
        if (v == 'options') {
            options = Object.assign(options, JSON.parse(query[v]))
        } else {
            options[v] = query[v]
        }
    })
    return options
}
const versionCompare = (currVer, promoteVer) => {
    currVer = currVer || '0.0.0.0'
    promoteVer = promoteVer || '0.0.0.0'
    if (currVer === promoteVer) return false
    const currVerArr = currVer.split('.')
    const promoteVerArr = promoteVer.split('.')
    const len = Math.max(currVerArr.length, promoteVerArr.length)
    for (let i = 0; i < len; i++) {
        let proVal = +promoteVerArr[i]
        let curVal = +currVerArr[i]
        if (proVal < curVal) {
            return false
        } else if (proVal > curVal) {
            return true
        }
    }
    return false
}

module.exports = {
    raw,
    isAuthed,
    isAuthedMiddleware,
    cmsAPI,
    getQuery,
    versionCompare
}
