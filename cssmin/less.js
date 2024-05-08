var less = require('less');
var LessPluginCleanCSS = require('less-plugin-clean-css');
var fs = require('fs');

module.exports = function(options, styles, sourcemap, sourceMapURL){
    var _opts = {};

    if(options.cssmin){
        _opts.plugins = [new LessPluginCleanCSS(options.cssmin)]
    }

    if(options.cssmin && options.cssdebug === true){
        _opts.sourceMap = {
            sourceMapURL:sourceMapURL,
            outputSourceFiles:true
        }
    }

    less.render(styles, _opts, function(e, out){
        if(e){
            console.log(e)
        }
        else{
            //此处css压缩后 {background:transparent\;}会把末尾的分号移除掉，这会导致整个css文件不能解析
            styles = out.css.replace(/\\\}/g, '\\;}'); 
            if(options.cssdebug === true && out.map){
                fs.writeFileSync(sourcemap, out.map)
            }
        }
    });

    return styles
}