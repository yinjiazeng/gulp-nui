# gulp-nui
Nui框架自动化工具，集成模块合并压缩版本修改

## Installation

Install package with NPM and add it to your development dependencies:

`npm install --save-dev gulp-nui`

## Usage

```js
var nui = require('gulp-nui');

gulp.task('nui', function(){
  gulp.src('./pages/*.html')
    .pipe(nui({
        paths:{
            base:__dirname+'/'
        },
        alias:{
			'common':'{base}libs/common.js'
		},
        ignore:[
            'placeholder'
        ],
        cssdebug:true,
        jsmin:{
            mangle:false
        }
    }))
    .pipe(gulp.dest('./pages/'))
});
```

## Options
<table>
    <tr>
        <th>参数</th>
        <th>类型</th>
        <th>说明</th>
    </tr>
    <tr>
        <td>paths</td>
        <td>Object {别名:路径,别名:路径,..}</td>
        <td>路径别名，和Nui.config中的paths对应，若别名中存在base，则其它别名路径都会被重新设置为base路径+别名路径</td>
    </tr>
    <tr>
        <td>alias</td>
        <td>Object {别名:路径,别名:路径,..}</td>
        <td>模块别名，和Nui.config中的alias对应，值中可以通过{别名}访问paths中的别名路径</td>
    </tr>
    <tr>
        <td>ignore</td>
        <td>Array [模块名,模块名,..]</td>
        <td>忽略模块不会被添加到合并文件中，默认值['util', 'template', 'component']，这三个模块已经在nui.js中添加了</td>
    </tr>
    <tr>
        <td>hashlen</td>
        <td>Number</td>
        <td>版本号长度，默认7</td>
    </tr>
    <tr>
        <td>cssdebug</td>
        <td>Boolean</td>
        <td>是否合并依赖，默认false，会在入口模块上级目录的同级style文件夹中（没有则自动创建）生成“入口模块名-debug.css”</td>
    </tr>
    <tr>
        <td>cssmin</td>
        <td>Boolean</td>
        <td>是否合并依赖模块并压缩，默认true，会在入口模块上级目录的同级style文件夹中（没有则自动创建）生成“入口模块名-min.css”</td>
    </tr>
    <tr>
        <td>jsdebug</td>
        <td>Boolean</td>
        <td>是否合并依赖，默认false，会在入口模块同级目录生成“入口模块名-debug.js”</td>
    </tr>
    <tr>
        <td>jsmin</td>
        <td>Boolean, Object</td>
        <td>是否合并依赖模块并压缩，默认true，会在入口模块同级目录生成“入口模块名-min.js”，当值为对象时：<a href="https://github.com/mishoo/UglifyJS2" target="_blank">查看参数配置</a></td>
    </tr>
</table>

