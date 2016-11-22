/* 格式化参数 */
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
    console.log("body", body)
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
    return data
}
/* 格式化门户列表 */
const formatNewsList = (body) => {
    const data = {
        meta: {
            page: body.page,
            total: body.total_num
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
            id:result.topic_id
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
module.exports = {
    formatParams,
    formatList,
    formatNewsList,
    formatArticle,
    formatPost
}