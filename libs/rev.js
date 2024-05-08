'use strict';

var fs = require('fs');
var path = require('path');
var createHash = require('./util').createHash;

var RESOURCE = {
    'LOAD':/(Nui.load\()['"]([^'"]+)['"]/g,
    'USE':/(Nui.use\()['"]([^'"]+)['"]/g,
    'JS': /(<script[^>]+src=)['"]([^'"]+)["']/ig,
    'CSS': /(<link[^>]+href=)['"]([^'"]+)["']/ig,
    'IMG': /(<img[^>]+src=)['"]([^'"]+)["']/ig,
    'URL': /(url\s*[\(=])(?!data:|about:)([^)]*)/ig
}

var rev = function(content, dirname, options, matchRegExp){
    var Module = this;
    var Regs = matchRegExp || RESOURCE;
    for(var type in Regs){
        content = content.replace(Regs[type], function(str, tag, src){
            var url = src = src.replace(/(^['"]|['"]$)/g, '').replace(/(\?|\#)[\s\S]*$/g, '');
            if(/^(https?:)?\/\//i.test(src)){
                return str;
            }
            if(type === 'LOAD' || type === 'USE'){
                src = Module.setId(src, dirname)[0].replace(/\.js$/, '');
                if(type === 'LOAD' && typeof options.jsmin === 'object' && !/-min$/.test(src)){
                    src += '-min'
                }
                src += '.js';
            }
            //没有文件类型
            else if(!/\.[^\.]+$/.test(src)){
                return str;
            }
            else{
                if(typeof options.filterPath === 'function'){
                    src = options.filterPath(src, dirname)
                }
                if(!(/^([A-Z]:)?\/|\\/i).test(src) && /^(\w|\.)/.test(src)){
                    //本地路径
                    if(/^file:/.test(src)){
                        src = src.replace(/^file:\/+/, '')
                    }
                    else{
                        src = path.join(dirname, src);
                    }
                }
            }

            if(!src){
                return str
            }
            src = path.normalize(src);
            if(fs.existsSync(src)){
                var buffer = fs.readFileSync(src);
                //修改样式表里的资源版本号
                if(options.watcher && options.watcher.unwatch && /\.css$/.test(src)){
                    var csscon = buffer.toString();
                    var csspath = path.dirname(src);
                    var newcon = rev(csscon, csspath, options, {
                        'URL':RESOURCE.URL
                    })
                    if(newcon !== csscon){
                        //因为修改css文件内的资源版本号，会导致该文件被修改，而由于watch监听了css文件改动，因此会造成死循环
                        //在该文件更新之前将该文件取消监听，更新后再添加到监听队列里就可以解决此问题
                        //不能使用gulp自带的watch，而是要用gulp-watch模块，并且将options中的usePollings设置为true
                        //如果不将usePollings设置为true，那么执行add方法后默认会执行一次watch，又会导致死循环！！！
                        options.watcher.unwatch(src);
                        fs.writeFileSync(src, newcon);
                        buffer = new Buffer(newcon);
                        options.watcher.add(src);
                    }
                }
                var md5 = createHash(buffer, options.verlen || 7);
                var hash = '';
                var ext = path.extname(src);
                var version = md5;
                if(ext === '.eot'){
                    version += '#iefix';
                }
                else if(ext === '.svg'){
                    version += '#iconfont';
                }
                if((type === 'LOAD' || type === 'USE') && Module.configContent){
                    Module.maps[url.replace(/\.js$/, '').replace(/-min$/, '')] = version;
                    src = url
                }
                else{
                    src = url + '?v=' + version
                }
            }
            else{
                return str
            }
            return tag + '"' + src + '"';
        });
    }
    return content
}

module.exports = function(){
    return rev.apply(this, arguments)
}
