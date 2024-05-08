'use strict';

var path = require('path');
var fs = require('fs');
var convert = require('./convert');
var util = require('./util');
var unique = util.unique;
var createHash = util.createHash;

var isHttp = function(url, local){
    if(local && /^((https?|file):)?\/\//i.test(url)){
        return true
    }
    else if(/^(https?:)?\/\//i.test(url)){
        return true
    }
    return false
}

var replacepath = function(url){
    if(isHttp(url, true)){
        return url
    }
    return path.normalize(url).replace(/\\/g, '/').replace(/\/+/g, '/')
}

var isEmptyObject = function(obj){
    var name;
    for(name in obj){
        return false;
    }
    return true;
}

var inArray = function(str, arr){
    var len = arr.length;
    var i=0;
    for(i; i<len; i++){
        if(arr[i] == str){
            return true
        }
    }
    return false
}

module.exports = function(dirname, options){

    var cacheModules = {};

    var cacheContents = {};

    var cacheStyles = {};

    var cacheFullNames = {};

    function Module(attrs, deps){
        var mod = this;
        mod.id = attrs[0];
        mod.name = attrs[1];
        mod.deps = deps;
        mod.depmodules = {};
        mod.uri = path.dirname(mod.id) + '/';
        mod.dir = attrs[2];
    }

    Module.prototype.load = function(entry){
        var mod = this;
        if(!mod.loaded && !/_module_\d+/.test(mod.name) && !isHttp(mod.name)){
            mod.url = mod.id + '.js';
            mod.fullname = Module.getFullUrl(mod.dir, mod.name);
            if(!fs.existsSync(mod.url) && fs.existsSync(mod.id+'/index.js')){
                cacheFullNames[mod.fullname] = mod.fullname = mod.fullname.replace(/\/+$/, '') + '/index';
                mod.uri = mod.id + '/';
                mod.id += '/index';
                mod.url = mod.id + '.js';
            }
            if(fs.existsSync(mod.url)){
                var buffer = fs.readFileSync(mod.url);
                var content = convert(buffer.toString().replace(/Nui.define\s*\(/g, '__define('));
                var arrs = mod.getdeps(content.replace(/\/\/.*/g, ''));
                var name = mod.name;
                var deps = mod.deps = arrs[0];
                var styles = mod.styles = arrs[1];
                var resources = arrs[2];
                mod.loaded = true;
                mod.resolve();
                /*
                * 比如a.js这个模块在b.js中引入方式是require('./a')，在c.js中引入方式是require('../module/a')，
                * 在d.js引入方式是require('{module}/a')，多种情况的出现导致在合并时会出现问题，
                * 为了统一模块名，将所有模块名替换为完整路径
                */
                arrs[3].forEach(function(val, i){
                    var rep = val;
                    var rs = /^imports/.test(val);
                    (rs ? resources : deps).forEach(function(v, k){
                        var url = Module.getFullUrl(mod.uri, v, rs);
                        rep = rep.replace(new RegExp('[\'\"]'+Module.replace(v)+'[\'\"]', 'g'), "'"+ url +"'");
                    })
                    if(rs){
                        rep = rep.replace(/^(imports)/, '__$1__')
                    }
                    content = content.replace(new RegExp(Module.replace(val), 'g'), rep)
                })

                if(!entry){
                    name = mod.name = mod.fullname
                }

                if(!/__define/.test(content)){
                    var vars = '\n\tvar module=this;';
                    content = '__define(function(require,imports,renders,extend,exports){'+ vars +'\n\t'+ content.replace(/\n/g, '\n\t') +'\n});'
                }
                
                cacheContents[name] = content.replace(/__define\((['"][^'"]+['"]\s*,)?/, "__define('"+ name +"',")
                                     .replace(/renders\(\{((.|\s)*?)\}\)/g, function(str, code){
                	                     return 'renders(\''+code.replace(/'/g, "\\'").replace(/\\\\'/g, "'").replace(/([\r\n]+)(\s+)?/g, "'+''$1$2+'")+'\')'
                                     })
            }
        }
        else{
            return mod.resolve();
        }
        return mod
    }

    Module.prototype.resolve = function(){
        var mod = this;
        if(isEmptyObject(mod.depmodules)){
            mod.deps.forEach(function(val, i){
                var module = Module.getModule(val, [], mod.uri);
                mod.depmodules[val] = module.load(mod.entry)
            })
        }
        return mod
    }

    Module.prototype.getdeps = function(content){
        var mod = this;
        var deps = [];
        var alldeps = [];
        var styles = [];
        var resources = [];
        var depsMatchs = content.match(/__define\((['"][^'"]+['"]\s*,)?\s*\[([^\[\]]+)\]/);
        var requireMatchs = content.match(/(require|extend|imports)\(['"][^'"]+['"]/g);
        var name;
        if(depsMatchs){
            var match = depsMatchs[2].split(',');
            match.forEach(function(val, i){
                name = val.replace(/^\s+|\s+/g, '').replace(/['"]/g, '');
                if(!isHttp(name)){
                    deps.push(name)
                }
            })
            alldeps.push(depsMatchs[0])
        }
        if(requireMatchs){
            requireMatchs.forEach(function(val, i){
                if(/^(require|extend)/.test(val)){
                    name = val.replace(/^(require|extend)\(['"]/, '').replace(/['"]$/, '');
                    if(!isHttp(name)){
                        alldeps.push(val);
                        deps.push(name)
                    }
                }
                else{
                    name = val.replace(/(imports)|[\('"]/g, '')
                    if(!isHttp(name)){
                        var ext = path.extname(name);
                        if(!/^\./.test(ext) || /^\.(css|less)/.test(ext)){
                            styles.push(name)
                        }
                        else{
                            alldeps.push(val);
                            resources.push(name)
                        }
                    }
                }
            })
        }

        return [unique(deps), unique(styles), unique(resources), unique(alldeps)]
    }

    Module.prototype.getNames = function(names){
        var mod = this;
        names.unshift(mod.name);
        if(mod.deps.length){
            for(var i in mod.depmodules){
                names = mod.depmodules[i].getNames(names)
            }
        }
        return names
    }

    Module.prototype.loadstyles = function(styles){
        var mod = this;
        if(!styles){
            styles = [];
        }
        var arrs = [];
        if(mod.styles && mod.styles.length){
            mod.styles.forEach(function(val){
                arrs = arrs.concat(Module.loadstyles(val, mod.uri))
            })
        }
        styles = arrs.concat(styles);
        if(mod.deps.length){
            for(var i in mod.depmodules){
                styles = mod.depmodules[i].loadstyles(styles)
            }
        }

        return styles
    }

    Module.loadstyles = function(name, uri){
        var baseurl = Module.setId(name, uri)[0], url = baseurl, arr = [];

        //优先读取less文件，不存在就读css文件
        if(!/\.(less|css)$/i.test(baseurl)){
            url = baseurl + '.less';
            if(!fs.existsSync(url)){
                url = baseurl + '.css'
            }
        }

        if(!fs.existsSync(url)){
            url = ''
        }
        
        if(url){
            var buffer = fs.readFileSync(url);
            var content = buffer.toString();
            content = content.replace(/@import\s+(url\s*\()?['"]([^'"]*)['"]\)?[\s;]*/g, function(str, pre, name){
                name = Module.replaceExt(name);
                if(name){
                    arr = arr.concat(Module.loadstyles(name, path.dirname(url)+'/'))
                }
                return ''
            }).trim();
            
            if(content){
                cacheStyles[url] = content;
                arr.push(url)
            }
        }
        return arr
    }

    //正则转义
    Module.replace = function(val){
        ['{', '}', '[', ']', '(', ')', '.'].forEach(function(v){
            val = val.replace(new RegExp('\\'+v, 'g'), '\\'+v)
        })
        return val
    }

    Module.setPath = function(id){
        var pathMatch = id.match(/\{([^\{\}]+)\}/);
        if(pathMatch){
            var _path = options.paths[pathMatch[1]];
            if(_path){
                id = Module.replaceExt(id.replace(pathMatch[0], _path));
            }
        }
        return id
    }

    Module.replaceExt = function(str){
        return str.replace(/(\.js)?(\?.*)?$/i, '')
    }

    Module.setId = function(id, uri){
        var name = Module.replaceExt(id);
        id = Module.setPath(options.alias[name] || name).replace(/\/+$/, '');
        if(/^file:/.test(id)){
            id = id.replace(/^file:\/*/, '')
        }
        if(!(/^([A-Z]:)?\/|\\/i).test(id) && !isHttp(id)){
            id = uri + name;
        }
        return [replacepath(id), name, uri]
    }

    Module.getModule = function(id, deps, uri){
        var arr = Module.setId(id, uri);
        id = arr[0];
        var mod = cacheModules[id];
        if(mod){
            return mod
        }
        return (cacheModules[id] = new Module(arr, deps))
    }

    Module.load = function(id, callback, mid){
        var mod = Module.getModule('_module_'+mid, [id], dirname);
        mod.entry = true;
        callback(mod.load())
    }

    Module.getFullUrl = function(_url, _name, full){
        var base = options.paths.base;
        var alias = options.alias;
        var paths = options.paths;
        var url = alias[_name] || _name;
        if(isHttp(_name, true)){
            return _name
        }
        if(!/\{[^\{\}]+\}/.test(url)){
            url = replacepath(_url.replace(base, '')+_name);
        }
        else{
            for(var i in paths){
                if(url.indexOf('{'+ i +'}') !== -1){
                    url = replacepath(url.replace('{'+ i +'}', paths[i].replace(base, '')))
                    break;
                }
            }
        }
        url = url.replace(/\/+$/, '');

        var node_modules_index = url.indexOf('/node_modules/');

        if(node_modules_index !== -1){
            url = url.substr(node_modules_index + 1)
        }

        if(full){
            return url
        }
        else{
            if(typeof options.filterPath === 'function'){
                url = options.filterPath(url, '') || url
            }
            return cacheFullNames[url]||url
        }
    }

    Module.convertPath = function(src, url, original_url, syncAsset, isCss){
        var match;
        original_url = original_url.replace(/\?.*$/, '');
        if(syncAsset.paths){
            match = original_url.replace(/\\/g, '/').match(new RegExp('^' + syncAsset.paths));
        }
        if(match){
            var extname = path.extname(original_url);
            var basename = path.basename(original_url);
            var ext_index = basename.lastIndexOf(extname);
            if(ext_index !== -1){
                basename = basename.substr(0, ext_index);
            }
            var filename = basename, fileContent;
            if(fs.existsSync(original_url)){
                fileContent = fs.readFileSync(original_url)
            }
            if(fileContent && syncAsset.rename){
                filename = filename + '.' + createHash(fileContent, syncAsset.rename)
            }
            filename += extname;
            var assets_dir = 'images/packs';
            var root_url = path.join(url, '../');
            var target_dir = path.join(root_url, assets_dir);
            var target_url = path.join(target_dir, filename);
            if(fileContent){
                if(!fs.existsSync(target_dir)){
                    assets_dir.split('/').forEach(function(name){
                        root_url = path.join(root_url, name);
                        if(!fs.existsSync(root_url)){
                            fs.mkdirSync(root_url)
                        }
                    })
                }
                fs.writeFileSync(target_url, fileContent);
            }
            
            if(isCss){
                src = path.relative(url, target_url);
                src = path.join(path.dirname(src), filename)
            }
            else{
                src = target_url.replace(/\\/g, '/').replace(options.paths.base, '')
            }
        }
        else if(isCss){
            src = path.relative(url, original_url);
        }
        return src.replace(/\\/g, '/')
    }

    Module.getContents = function(names, _module_, url, syncAsset){
        var cons = [];
        var _cons = '';
        var _define = 'Nui[\''+ _module_ +'_define\']';
        names.forEach(function(name, k){
            cons.push(cacheContents[name])
        });
        _cons = cons.join('\n').replace(/__imports__\(['"]([^'"]+)['"]\)/g, function(str, src){
            var original_url = src, version = '';
            if(fs.existsSync(original_url)){
                var buffer = fs.readFileSync(original_url);
                var md5 = createHash(buffer, options.verlen || 7);
                version = '?=' + md5
            }
            src = Module.convertPath(src, url, original_url, syncAsset) + version;
            return 'imports(\''+ src +'\')'
        });
        return (
`;(function(__define){
    function __requireDefaultModule(module){
        if(module && module.defaults !== undefined){
            return module.defaults
        }
        return module
    }
${_cons}
})(${_define});`
            )
    }

    //合并css时将子文件中的资源路径转为正确的相对路径
    Module.getStyles = function(arr, url, syncAsset){
        var arrs = [];

        arr.forEach(function(val){
            var content = cacheStyles[val];
            if(content){
                content = content.replace(/(url\s*[\(=])(?!data:|about:)([^)]*)/ig, function(str, tag, src){
                    src = src.replace(/(^['"]|['"]$)/g, '').trim();
                    if(isHttp(str)){
                        return str;
                    }
                    //资源原始路径
                    var original_url = path.join(path.dirname(val), src);
                    var match = original_url.match(/\?.*$/);
                    var ext = '';
                    if(match){
                        ext = match[0]
                    }
                    src = Module.convertPath(src, url, original_url, syncAsset, true) + ext;
                    if(src){
                        return tag + '"' + src + '"'
                    }

                    return str
                });
                arrs.push(content);
            }
        })
        return arrs
    }

    return Module
}
