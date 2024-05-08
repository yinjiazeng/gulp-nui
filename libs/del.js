var fs = require('fs');
var path = require('path');
var del = require('del');

module.exports = function(basePath){
    var readDir = fs.readdirSync(basePath);
    var delDirs = [];
    readDir.forEach(function(dir){
        if(dir !== 'node_modules' && dir.indexOf('.') !== 0){
            var stat = fs.statSync(path.join(basePath, dir));
            if(stat.isDirectory()){
                delDirs.push(basePath + dir + '/**/images/{packs,pack_assets}')
            }
        }
    })
    if(delDirs.length){
        del.sync(delDirs)
    }
}