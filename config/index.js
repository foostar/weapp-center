if(process.env.NODE_ENV=='production') {
    module.exports = require('./config.pro.js')
} else if(process.env.NODE_ENV=='test') {
    module.exports = require('./config.test.js')
} else if(process.env.NODE_ENV=='admin'){
    module.exports = require('./config.admin.js')
} else {
    module.exports = require('./config.dev.js')
}