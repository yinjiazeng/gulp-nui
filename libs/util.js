var crypto = require('crypto');

module.exports = {
    createHash:function(file, len){
        return crypto.createHash('md5').update(file).digest('hex').substr(0, len);
    },
    unique:function(arr){
        var newarr = [];
        var temp = {};
        arr.forEach(function(val){
            if(!temp[val]){
                temp[val] = true
                newarr.push(val)
            }
        })
        return newarr
    }
}