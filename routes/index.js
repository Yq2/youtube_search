var express = require('express');
var router = express.Router();
var formidable = require('formidable');
var fs = require('fs');
var path = require("path");
var log = require("../log").logger("normal");
var xlsx = require('node-xlsx');
var async=require('async');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var youtube_crawler=require('../model/youtube_crawler');
var download_link='';
var port=require('../setting').port;
router.get('/', function(req, res, next) {
  res.render('index', { title: '上传视频链接文件' });
});

router.get('/excel_parse', function(req, res) {
    res.render('excel_parse', { title: '输出结果',query: req.query });
});

router.post('/', function (req, res) {

    var form = new formidable.IncomingForm();
    form.encoding = 'utf-8';
    form.uploadDir = 'public/excel/';
    form.keepExtensions = true;
    form.maxFieldsSize = 5 * 1024 * 1024;
    log.info(" import tracking file ... ");
    form.parse(req, function (err, fields, files) {
        if (err) {
            res.locals.error = err;
            log.info(" parse excel file error "+err);
            res.render('index', {
                title: '上传视频链接文件',
                user: req.session.user,
                query: req.query
            });
            return;
        }
        var extName = '';
        switch (files.fulAvatar.type) {
            case 'file/xls':
                extName = 'xls';
                break;
            case 'file/xlsx':
                extName = 'xlsx';
                break;
            case 'file/csv':
                extName = 'csv';
                break;
        }

        if (extName === '') {
            extName = 'xlsx';
        }
        parse_tracking_file_xls(req,res, files.fulAvatar.path);
    });

});

function parse_tracking_file_xls(req,res, filename) {
    log.info('上传的Excel文件 路径',filename);
    var obj = xlsx.parse(filename);
    fs.unlink(filename,function (err) {
        if (err) log.info(filename+' delete err');
    });
    var excelArray = obj[0].data;
    if (excelArray.length===1) {
        res.render('index', {
            title: '上传视频链接文件',
            query: req.query
        });
        return;
    }
    // res.location('localhost:'+port+'/excel_parse');
    res.render('excel_parse', { title: '输出结果',query: req.query });
    var link_array=[];
    for (var i=1;i<excelArray.length;i++){
        link_array.push(excelArray[i][0]);
    }
    var parse_results=[];
    var count=0;
    var excel_head=
        ['url(视频链接)','watch_count(观看次数)','category(分类)'
            ,'ower(视频作者)','user_link(作者首页)','subscribe_count(频道订阅数)'
            ,'last_upload_time(最近上传视频时间)','country(作者归属地)'];
    parse_results.push(excel_head);
    async.eachSeries(link_array, function (link, cb) {
        log.info('count=',count,'link_array length=',link_array.length);
        youtube_crawler.start(link,function (err,results) {
            parse_results.push(results);
            count++;
            if (count>=link_array.length){
                eventEmitter.emit("crawler_end");
                return;
            }
            cb(null,link);
        });
    }, function (err,link) {
        // log.info('a link eachSeries callback error link=',link);
        // log.info('link_array eachSeries callback error',err);
        // eventEmitter.emit("crawler_end");
    });

    eventEmitter.once("crawler_end",function () {
        var buffer = xlsx.build([{name:'Sheet1', data: parse_results}]);
        var date_str = new Date().getTime();
        var path_a='output/youtube_search_results_'+date_str+'.xlsx';
        var path_b='../public/'+path_a;
        var path_c=path.join(__dirname,path_b);
        fs.writeFileSync(path_c, buffer, 'binary');
        download_link=path_a;
        log.info('下载链接为:',download_link);
    });
}
router.post('/check_link_parse', function (req, res) {
    log.info('client check link parse result send_count=',req.body.send_count);
    if (download_link==='') {
        var json={
            "status":"waiting",
            "download_link":null
        };
        log.info('excel parse not complete waiting....');
        res.json(json);
    } else {
        var data={
            "status":"ok",
            "download_link":download_link
        };
        log.info('send download_link to client ok');
        download_link='';
        res.json(data);
    }
});

module.exports = router;