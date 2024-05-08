/**
 * import 转换为 require
 * export 转换为 exports
 */

var path = require('path');

var moduleName = function(name){
    var basename = path.basename(name);
    var extname = path.extname(basename);
    return basename.replace(extname, '')
}

module.exports = function(content){
    return content.replace(/^\s*(import|export\s+)/, '\n$1')

    //import 转换为 require
    .replace(/(\n+\s*|;+\s*)import\s+([^'":()]*)['"]([^'"]*)['"]/g, function(all, pre, rule, url){
        var _rule = rule.replace(/from\s*$/, '').trim();
        var _vars = [];
        var _code = [];

        if(url){
            var _req = 'require';
            var ext = path.extname(url);
            var _module = '__module_' + moduleName(url);
    
            if(/^\./.test(ext) && !/^\.js/.test(ext)){
                rule = '';
                _req = 'imports'
            }
    
            //import url;
            //import * from url;
            if(!_rule || _rule === '*'){
                _code.push(_req+'(\''+ url +'\')')
            }
            //import * as var from url;
            else if(/^\*/.test(_rule)){
                _rule = _rule.replace(/^\*\s+as\s+/, '');
                _code.push('var '+ _rule +'='+ _req +'(\''+ url +'\')')
            }
            //import {var,var,...} from url;
            //import {var as var,var,...} from url;
            else if(/^\{+[^{}]*\}+$/.test(_rule)){
                _rule = _rule.replace(/[{}]/g, '').split(',');
                _rule.forEach(function(v, i){
                    var _var = v.trim().split(/\s+as\s+/);
                    if(_var.length){
                        _code.push('var ' + _var[_var.length-1] + '=' + _module + '.' + (_var[0] === 'default' ? 'defaults' : _var[0]))
                    }
                });
                if(_code.length){
                    _code.unshift('var ' + _module + '=' + _req + '(\''+ url +'\')');
                }
            }
            //import var from url;
            else{
                _code.push('var '+ _rule +'='+ '__requireDefaultModule(' + _req +'(\''+ url +'\'))');
            }
        }

        if(!_code.length){
            pre = ''
        }

        return pre + _code.join('\n')
    })

    //export 转换为 exports

    //export {var,var,...}
    //export {var,var,...} from url
    //export {var as var,var,...}
    //export {var as default,var,...}
    //export default {var,var,...}
    .replace(/(\n+\s*|;+\s*)export\s+(default\s+)?\{+([^{}:]+)\}+(\s+from\s+['"]([^'"]*)['"])?/g, function(all, pre, def, rule, from, url){
        var rules = rule.trim().split(',');
        var _code = [];
        var _module = '';
        var _name = '';
        if(url){
            _name = _module = '__module_' + moduleName(url);
            _code.push('var ' + _module + ' = require(\''+ url +'\')');
            _module += '.';
        }
        if(def){
            _code.push('exports.defaults = {}')
        }
        rules.forEach(function(v){
            var _var = v.trim().split(/\s+as+\s+/);
            var len = _var.length;
            if(len && _var[0]){
                if(_var[0] === 'default'){
                    _code.push(_name + ' = __requireDefaultModule('+ _name +')')
                    //export {default} from '';
                    if(len === 1){
                        _code.push('exports.defaults = ' + _name)
                    }
                    //export {default as var} from '';
                    else{
                        _code.push('exports.'+ _var[1] +' = ' + _name)
                    }
                }
                else{
                    if(len === 1){
                        _code.push('exports.' + (def ? 'defaults.' : '') + _var[0] + '=' + _module + _var[0])
                    }
                    else{
                        _code.push('exports.' + (_var[1] === 'default' ? 'defaults' : _var[1]) + ' = ' + _module + _var[0])
                    }
                }
            }
        })

        if(!_code.length){
            pre = ''
        }

        return pre + _code.join('\n')
    })

    //export function a(){};
    //export default function a(){};
    .replace(/(\n+\s*|;+\s*)export\s+(default\s+)?function\s+([\w$]+)/g, function(all, pre, def, rule){
        return pre + 'export ' + (def ? 'default ' : '') + 'var ' + rule + ' = function'
    })

    //export var a = b;
    //export let a = b;
    //export const a = b;
    //export default var a = b;
    //export default let a = b;
    //export default const a = b;
    .replace(/(\n+\s*|;+\s*)export\s+(default\s+)?(var|let|const)\s+([\w$]+)/g, function(all, pre, def, state, rule){
        if(def){
            state = 'exports.defaults = {};\n' + state
        }
        return pre + state + ' ' + rule + ' = exports.' + (def ? 'defaults.' : '') + rule
    })

    //export default var = function(){}
    //export default var
    .replace(/(\n+\s*|;+\s*)export\s+default\s+/g, '$1exports.defaults = ')

    //export * from url
    .replace(/(\n+\s*|;+\s*)export\s+\*\s+from\s+['"]([^'"]*)['"]/g, function(all, pre, url){
        var _code = '';
        if(url){
            _code = 
`;(function(){
    var __module = require('${url}');
    var __object = {};
    var __type = __object.toString.call(__module);
    if(__type === '[object Object]' || __type === '[object Function]'){
        for(var i in __module){
            exports[i] = __module[i]
        }
    }
})();

`
        }
        else{
            pre = ''
        }

        return pre + _code
    })

    .replace(/^\s+/, '')
}