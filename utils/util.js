/* 格式化参数 */
const { getItem } = require("../redis/redis")

const formatParams = (params) => {
    params = Object.assign({}, params, {
        accessToken: params.token,
        accessSecret: params.secret
    })
    delete params.token
    delete params.secret
    return params
}
/* 格式化帖子列表 */
const formatList = (body) => {
    const data = {
        meta: {
            page: body.page,
            total: body.total_num
        },
        list: body.list && body.list.map(x => ({
            id: x.topic_id,
            forumId: x.board_id,
            type:'post',
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
            from: x.from || '',
            replies: x.replies,
            subject: x.subject || x.summary,
            gender: x.gender,
            reply: x.reply || [],
            recommendAdd: x.recommendAdd || 0,
            images: x.imageList && x.imageList.map(src => src.replace('xgsize_', 'mobcentSmallPreview_')) || new Array(x.pic_path) || [],
            zanList: x.zanList || [],
            topic:{
                sort: x.sort_id || '',
                type: x.typeId || '',
                hot: x.hot || 0,
                top: x.top || 0,
                essense: x.essense || 0
            }
        })) || [],
        panel: body.newTopicPanel || [],
    }
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
    if (body.topTopicList) {
        data.topTopicList = body.topTopicList
    }
    if (body.anno_list) {
        data.anno_list = body.anno_list
    }
    if (body.sortInfo) {
        data.sort = body.sortInfo
    }
    if (body.typeInfo) {
        data.typeInfo = body.typeInfo
    }
    if (body.tpcinfo) {
        data.tpcinfo = body.tpcinfo
    }
    if (body.topUser) {
        data.topUser = body.topUser
    }
    if (body.partinNum) {
        data.partinNum = body.partinNum
    }

    return data
}
/* 格式化门户列表 */
const formatNewsList = (body) => {
    const data = {
        meta: {
            page: body.page || 1,
            total: body.total_num || 0
        },
        list: body.list && body.list.map(x => ({
            id: x.source_id || x.topic_id || '',
            type: x.source_type == 'news' ? 'article' : 'post',
            forumId: x.board_id || '',
            forumName: x.board_name || '',
            title: x.title, 
            topTopicList: x.topTopicList || [],
            user: {
                id: x.user_id,
                nickname: x.user_nick_name,
                avatar: x.userAvatar || '',
                title: x.userTitle || '',
                verify: x.verify || []
            },
            repliedAt: new Date(+x.last_reply_date) || '',
            views: x.hits,
            replies: x.replies,
            subject: x.summary,
            gender: x.gender,
            reply: x.reply || [],
            images: x.imageList && x.imageList.map(src => src.replace('xgsize_', 'mobcentSmallPreview_')) || new Array(x.pic_path) || [],
            zanList: x.zanList || new Array(x.recommendAdd),
            recommendAdd: x.recommendAdd || 0,
            zones: x.distance || '',
            distance: x.location || '',
            redirect: x.redirectUrl || '',
            topic:{
                sort: x.sort_id || '',
                type: x.typeId || '',
                hot: x.hot || 0,
                top: x.top || 0,
                essense: x.essense || 0
            }
        })) || []
    }
    return data
}
/* 格式化文章详情 */
const formatArticle = (result, body) => {
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
        zanList: body.zanList || [],
        list: body.list || [],
        totalNum:body.count || 0
    }
    return data
}
/* 格式化帖子详情 */
const formatPost = (page, body) => {
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
            sort: result.sortContent,
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
            list: body.list || [],
            totalNum:body.total_num || 0,
            id:result.topic_id,
            poll: result.poll_info || {}
        }
    } else {
        data = {
           page: body.page,
           list: body.list || [],
           totalNum:body.total_num || 0 
        }
    }
    return data
}
/* 格式化文章列表 */
const formatArticleList = (body) => {
    const data = {
        type: 'article',
        meta: {
            page: body.page,
            total: body.total_num
        },
        list: body.list && body.list.map(x => ({
            id: x.aid || 0,
            title: x.title || "",
            user:{
                id: x.user_id || 0,
                nickname: x.user_nick_name,
                avatar: x.userAvatar || '',
            },
            views: x.hits,
            subject: x.summary,
            gender: x.gender,
            repliedAt: new Date(+x.dateline) || "",
            images: x.imageList && x.imageList.map(src => src.replace('xgsize_', 'mobcentSmallPreview_')) || new Array(x.pic_path) || [],
        })) || []
    }
    return data
}

// 发送错误信息 
const sendError = (err) => {
    if (err.errcode || Object.prototype.toString.call(this) == "[object Object]") {
        return err
    }
    return { errcode: 106, msg: err }
}

// 错误信息提示
const errorType = {
    101: { status: 400, errcode: 101, msg: "请检查用户是否合法，或者appId、secret配置错误！" },
    102: { status: 400, errcode: 102, msg: "token过期！" },
    103: { status: 400, errcode: 103, msg: "用户信息不正确！" },
    106: { status: 400, errcode: 106, msg: "操作失败，请重试！" },
    400: { status: 400, errcode: 400, msg: "缺少必要参数或传入参数不合法！" },
    401: { status: 400, errcode: 401, msg: "缓存失效，请重试！" },
    403: { status: 400, errcode: 403, msg: "不能微信登录!" },
    405: { status: 400, errcode: 405, msg: "对不起，没有找到匹配结果!" },
    406: { status: 400, errcode: 406, msg: "发表失败，请重试!" },
    cmsError: (err) => {
        return { status: 400, errcode: 500, err, msg: "cms服务错误!" }
    },
    mobcentError: (err) => {
        return { status: 400, errcode: 500, err, msg: "mobcent服务错误!" }
    }
}

const getListData = (storgeKey, page) => {
    return new Promise((reslove, reject) => {
        if (page != 1) reject(errorType[401])
        getItem(storgeKey)
        .then((result) => {
            reslove({ cache: true, data: result })
        })
        .catch(err => {
            reject(err)
        })
    })
}
module.exports = {
    formatParams,
    formatList,
    formatNewsList,
    formatArticle,
    formatPost,
    formatArticleList,
    sendError,
    errorType,
    getListData
}