var request=require('request');
var async=require('async');
var cheerio = require('cheerio');
var log = require("../log").logger("normal");
var headers = {
    'accept-language':'zh-CN,zh;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
};
function youtube_crawler() {
    this.start=function(url,callback) {
        if (url===''||url===undefined) return callback(null,[]);
        var result=[];
        result.push(url);
        async.waterfall([
                function (cb) {
                    var params={
                        url:url,
                        method:'GET',
                        headers:headers
                    };
                    request(params,function (err,res,body) {
                        if (err) {
                            log.info(err);
                            log.info('get step1 error link=',url);
                            return callback(null,result)
                        }
                        try {
                            var $=cheerio.load(body);
                            var category=$("ul[class='content watch-info-tag-list']").find('li').find('a').text();
                            var owern_link=$("div[class='yt-user-info']").find('a').attr('href');
                            var ower=$("div[class='yt-user-info']").find('a').text();
                            var watch_count=$("div[id='watch7-views-info']").find("div[class='watch-view-count']").text();
                            owern_link='https://www.youtube.com'+owern_link;
                        } catch(e) {
                            log.info(e);
                            log.info('parse step1 error link=',url);
                            return callback(null,result)
                        }
                        result.push(watch_count);
                        result.push(category);
                        result.push(ower);
                        cb(null,owern_link);
                    });
                },
                function (link,cb) {
                    var params={
                        url:link,
                        method:'GET',
                        headers:headers
                    };
                    request(params,function (err,res,body) {
                        if (err) {
                            log.info(err);
                            log.info('get step1 error link=',link);
                            return callback(null,result)
                        }
                        try {
                            var $=cheerio.load(body);
                            // var user_link=$("div[id='watch-container']").children().first().attr('href');
                            var user_link_=$("link[rel='canonical']").attr('href');
                            var subscribe_count=$("span[class='yt-subscription-button-subscriber-count-branded-horizontal subscribed yt-uix-tooltip']").text();
                            // var video_link=$("div[id='appbar-nav']").find("ul").find("li")[1].find("a").attr("href");
                            var user_video_link=user_link_+'/videos';
                        } catch(e) {
                            log.info(e);
                            log.info('parse step2 error link=',link);
                            return callback(null,result)
                        }
                        result.push(user_link_+'/featured');
                        result.push(subscribe_count);
                        cb(null,user_video_link);
                    });
                },
                function (link,cb) {
                    var param={
                        url:link,
                        method:'GET',
                        headers:headers
                    };
                    request(param,function (err,res,body) {
                        if (err) {
                            log.info(err);
                            log.info('get step1 error link=',link);
                            return callback(null,result)
                        }
                        try {
                            var $=cheerio.load(body);
                            var last_upload_time=
                                $("ul[class='yt-lockup-meta-info']").first().find("li").eq(1).text();
                        } catch(e) {
                            log.info(e);
                            log.info('parse step3 error link=',link);
                            return callback(null,result)
                        }
                        result.push(last_upload_time);
                        cb(null,link)
                    });
                },
                function (link,cb) {
                    var about_link=link.replace('/videos','/about');
                    var param={
                        url:about_link,
                        method:'GET',
                        headers:headers
                    };
                    request(param,function (err,res,body) {
                        if (err) {
                            log.info(err);
                            log.info('get step1 error link=',link);
                            return callback(null,result)
                        }
                        try {
                            var $=cheerio.load(body);
                            var country=
                                $("div[class='country-container branded-page-box-padding']")
                                    .find("span[class='country-inline']").text().trim();
                        } catch(e) {
                            log.info(e);
                            log.info('parse step4 error link=',link);
                            return callback(null,result)
                        }
                        result.push(country);
                        cb(null,result)
                    });
                }
            ]
            ,function (err,result) {
                if (err) console.log(err);
                callback(err,result);
            });
    }
}

module.exports=new youtube_crawler();