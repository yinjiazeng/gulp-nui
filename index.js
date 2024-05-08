'use strict';

var through = require('through2');
var path = require('path');
var fs = require('fs');
var uglifyjs = require('uglify-js');
var rev = require('./libs/rev');
var mod = require('./libs/module');
var util = require('./libs/util');
var del = require('./libs/del');
var extend = require('extend');
var less = require('./cssmin/less');

var createHash = util.createHash;
var unique = util.unique;
var basePath = path.join(__dirname, '../../');
var isDelete = false;

module.exports = function(opts){
    
    if(!isDelete){
        //删除打包资源目录
        del(basePath);
        isDelete = true;
    }

    var options = extend(true, {
        //项目根目录，修改paths中base的值
        base:'',
        //配置文件路径
        url:'',
        //路径别名
        paths:{},
        //模块别名
        alias:{},
        //版本号长度
        verlen:7,
        //是否在配置文件中生成版本映射
        vermap:true,
        //仅压缩js或者css，为空2个都压缩
        mintype:'',
        //生成合并css压缩文件
        cssmin:true,
        //生成合并css sourcemap文件用于调试
        cssdebug:true,
        //同步资源
        //{paths:[], rename:15}
        syncAsset:false,
        //生成合并js sourcemap文件用于调试
        jsdebug:true,
        //生成合并js压缩文件
        jsmin:true,
        //过滤资源文件路径，去除或替换一些特殊符号，返回绝对路径
        filterPath:null,
        //gulp-watch返回的对象
        watcher:null,
        //只输出改变过的文件
        changed:true,
        //babel配置项
        babel:null
    }, opts || {})

    var configContent, configObject;

    if(options.url && fs.existsSync(options.url)){
        var buffer = fs.readFileSync(options.url);
        var content = buffer.toString();
        var match = content.match(/Nui.config(\(\{((.|\s)*?)\}\))/);
        if(match){
            if(typeof options.vermap === 'undefined' || options.vermap === true){
                configObject = eval(match[1]);
                configObject.maps = {};
                configContent = content;
            }
            match = eval(match[1]);
            options.paths = match.paths || {};
            options.alias = match.alias || {};
        }
    }

    var paths = options.paths;
    paths.base = path.join(path.normalize(options.base || basePath), '/').replace(/\\/g, '/')
    for(var i in options.paths){
        var _path = options.paths[i];
        if(i !== 'base' && !/^((https?|file):)?\/\//i.test(_path) && !/^[A-Z]:/i.test(_path)){
            options.paths[i] = path.normalize(paths.base + '/' + _path).replace(/\\/g, '/');
        }
    }

    var syncAsset = {};

    if(options.syncAsset){
        if(typeof options.syncAsset === 'string'){
            syncAsset = {
                paths:[options.syncAsset]
            }
        }
        else if(Array.isArray(options.syncAsset)){
            syncAsset = {
                paths:options.syncAsset
            }
        }
        else if(typeof options.syncAsset === 'object'){
            syncAsset = options.syncAsset;
        }

        if(!Array.isArray(syncAsset.paths)){
            syncAsset.paths = [syncAsset.paths]
        }

        var syncAssets = [];
        syncAsset.paths.forEach(function(name){
            if(options.paths[name]){
                syncAssets.push('(' + options.paths[name].replace(/\\/g, '/')  + ')')
            }
        })
        syncAsset.paths = syncAssets.join('|');

        if(syncAsset.rename !== false){
            if(syncAsset.rename === true || syncAsset.rename === undefined){
                syncAsset.rename = 10
            }
            syncAsset.rename = syncAsset.rename | 0;
        }
    }

    if(options.cssmin === true){
        options.cssmin = {}
    }

    if(typeof options.jsmin === 'object' && options.cssmin){
        options.cssmin = extend(true, {
            //取消合并重复属性与选择器，设置true的话sourcemap映射会出问题
            advanced:false, 
            //使用IE7模式，向下兼容
            compatibility:'ie7'
        }, options.cssmin);
    }

    if(options.jsmin === true){
        options.jsmin = {}
    }

    if(typeof options.jsmin === 'object' && options.jsmin){
        if(!options.jsmin.mangle){
            options.jsmin.mangle = {}
        }
        if(!options.jsmin.output){
            options.jsmin.output = {}
        }
        var except = options.jsmin.mangle.except;
        if(!Array.isArray(except)){
            except = []
        }
        options.jsmin.mangle.except = except;
        options.jsmin.output.keep_quoted_props = true;
        options.jsmin.output.quote_style = 1;
    }

    var babel, _babelOptions = {}, babelOptions = {
        compact:false,
        code:true,
        minified:false,
        babelrc:false,
        ast:false,
        comments:true,
        sourceMaps:false
    }

    if(!Array.isArray(options.babel)){
        if(options.babel && options.babel.transform){
            babel = options.babel
        }
    }
    else if(options.babel[0] && options.babel[0].transform){
        babel = options.babel[0];
        _babelOptions = options.babel[1] || {};
    }

    babelOptions.presets = _babelOptions.presets || ['es2015', 'stage-2'];
    babelOptions.plugins = _babelOptions.plugins;

    return through.obj(function(file, enc, cb){

        if(file.isNull()){
	        return cb();
        }

        var dirname = path.dirname(file.path)+'/';
        var content = file.contents.toString().replace(/^\s+|\s+$/g, '');

        if(!content){
            return cb();
        }

        var loads = content.match(/Nui.load\(['"][^'"]+['"]/g);
        var matchs = content.match(/Nui.(load|use)\(['"][^'"]+['"]/g);
        var Module = mod(dirname, options);
        var _jsmin = !options.mintype || options.mintype === 'js';
        var isMaps = matchs && configObject;

        if(loads){
            matchs.forEach(function(val, i){
                if(/^Nui.load/.test(val)){
                    var id = val.replace(/Nui.load\(/, '').replace(/['"]/g, '').replace(/-min/g, '');
                    Module.load(id, function(mod){
                        var names = unique(mod.getNames([]));
                        var url;
                        var filename;
                        for(var i in mod.depmodules){
                            var _module = mod.depmodules[i];
                            url = _module.url;
                            filename = path.basename(_module.id);
                            break;
                        }
                        var imagesPath = path.join(path.dirname(url), '../images/');
                        var contents = Module.getContents(names, mod.name, imagesPath, syncAsset);
                        
                        if(fs.existsSync(url)){
                            if(!options.mintype || options.mintype === 'css'){
                                var stylePath = path.join(path.dirname(url), '../style/');
                                var styles = Module.getStyles(unique(mod.loadstyles()), stylePath, syncAsset).join('\n').replace(/\/\*(\s|.)*?\*\//g, function(str){
                                    return str.replace(/[\r\n]+/g, '')
                                });
                                var cssmin = stylePath + filename + '-min.css';
                                var sourcemap = cssmin + '.map';
                                
                                if((!options.cssmin || options.cssdebug !== true) && fs.existsSync(sourcemap)){
                                    fs.unlinkSync(sourcemap);
                                }
    
                                if(styles){
                                    if(!fs.existsSync(stylePath)){
                                        fs.mkdirSync(stylePath)
                                    }
                                    
                                    if(typeof options.cssmin === 'object'){
                                        var sourceMapURL = path.basename(sourcemap) + '?v='+createHash(new Buffer(styles), options.verlen || 7);
                                        styles = less(options, styles, sourcemap, sourceMapURL);
                                        fs.writeFileSync(cssmin, styles);
                                    }
                                    else if(fs.existsSync(cssmin)){
                                        fs.unlinkSync(cssmin)
                                    }
                                }
                            }
                            if(_jsmin){
                                var jsmin = url.replace(/(\.js)$/, '-min$1');
                                var jsdebug = path.basename(url.replace(/(\.js)$/, '-debug$1'));
                                var sourcemap = jsmin+'.map';
                                if((!options.jsmin || options.jsdebug !== true) && fs.existsSync(sourcemap)){
                                    fs.unlinkSync(sourcemap);
                                }
                                if(typeof options.jsmin === 'object'){
                                    try{
                                        if(babel){
                                            contents = babel.transform(contents, babelOptions).code
                                        }
                                        if(options.jsmin){
                                            options.jsmin.fromString = contents;
                                            var files = {};
                                            files[jsdebug] = contents;
                                            if(options.jsdebug === true){
                                                options.jsmin.outSourceMap = path.basename(sourcemap) + '?v='+createHash(new Buffer(contents), options.verlen || 7);
                                                options.jsmin.sourceMapIncludeSources = true;
                                            }
                                            else{
                                                options.jsmin.outSourceMap = false;
                                                options.jsmin.sourceMapIncludeSources = false;
                                            }
                                            var result = uglifyjs.minify(files, options.jsmin);
                                            if(options.jsdebug === true && result.map){
                                                fs.writeFileSync(sourcemap, result.map);
                                            }
                                            if(result){
                                                contents = result.code;
                                            }
                                        }
                                        fs.writeFileSync(jsmin, contents);
                                    }
                                    catch(e){
                                        console.log(e)
                                    }
                                }
                                else if(fs.existsSync(jsmin)){
                                    fs.unlinkSync(jsmin)
                                }
                            }
                        }
                    }, i+1)
                }
            })
        }

        if(options.verlen > 0){
            if(isMaps){
                Module.maps = configObject.maps;
                Module.configContent = configContent;
            }
            var newcon = rev.call(Module, content, dirname, options);
            
            if(isMaps){
                configObject.maps = Module.maps;
                var _newcontent = configContent.replace(/Nui.config(\(\{((.|\s)*?)\}\))/, function(all, inner, str){
                    return 'Nui.config('+ JSON.stringify(configObject, null, 4) +')'
                })
                fs.writeFileSync(options.url, _newcontent);
            }
            if(options.changed === true && newcon === content){
                return cb()
            }
            file.contents = new Buffer(newcon);
        }

        this.push(file);
        cb();
    })
}