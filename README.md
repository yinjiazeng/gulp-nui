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
        <td>base</td>
        <td>string</td>
        <td>项目硬盘路径，默认为空，设置后将会覆盖paths中的base，一般写法都是 __dirname+'/路径'</td>
    </tr>
    <tr>
        <td>paths</td>
        <td>object {别名:路径,别名:路径,..}</td>
        <td>设置路径别名，和Nui.config中的paths对应，其中base默认值为gulpfile.js所在目录</td>
    </tr>
    <tr>
        <td>alias</td>
        <td>object {别名:路径,别名:路径,..}</td>
        <td>设置模块别名，和Nui.config中的alias对应</td>
    </tr>
    <tr>
        <td>url</td>
        <td>string</td>
        <td>Nui配置文件路径，设置后会读取文件中paths和alias属性作为参数选项，使用该参数可以省略paths和alias设置</td>
    </tr>
    <tr>
        <td>ignore</td>
        <td>array [模块名,模块名,..]</td>
        <td>默认值['util', 'template', 'component', 'events']，忽略模块不会被添加到合并文件中</td>
    </tr>
    <tr>
        <td>verlen</td>
        <td>number</td>
        <td>默认值为7，设置版本号长度，会对页面中所有的静态资源路径后面增加“?v=xxxx”，设置为0将不会更新版本号</td>
    </tr>
    <tr>
        <td>vermap</td>
        <td>boolean</td>
        <td>默认值为true，是否在配置文件中生成版本映射，此设置将不会添加静态资源版本号</td>
    </tr>
    <tr>
        <td>cssmin</td>
        <td>boolean, function</td>
        <td>默认true，是否合并依赖模块并压缩，会在入口模块所在文件夹的同级style文件夹中（没有则自动创建）生成“入口模块名-min.css”，当设置为函数时，接收一个参数为合并后的内容，若你的代码中使用less或者sass，可以在函数中将内容转为正常的css内容，然后返回这个内容即可。</td>
    </tr>
    <tr>
        <td>jsdebug</td>
        <td>boolean</td>
        <td>默认true，是否生成sourcemap调试文件，方便压缩文件调试</td>
    </tr>
    <tr>
        <td>jsmin</td>
        <td>boolean, object</td>
        <td>默认true，是否合并依赖模块并压缩，会在入口模块同目录生成“入口模块名-min.js”，当值为对象时，可配置压缩选项<a href="https://github.com/mishoo/UglifyJS2" target="_blank">查看参数配置</a></td>
    </tr>
    <tr>
        <td>changed</td>
        <td>boolean</td>
        <td>默认true，是否只输出修改过的文件流</td>
    </tr>
    <tr>
        <td>filterPath</td>
        <td>function(资源路径, 引入资源的文件路径)</td>
        <td>默认null，当资源路径为非http开头的绝对路径，例如“/a/b/c”或者包含特殊变量（例如jsp文件中后台开发会使用&lt;%=basepath%&gt;引入路径）时才启用，可以用于过滤特殊符号，返回资源在硬盘中的路径</td>
    </tr>
    <tr>
        <td>watcher</td>
        <td>object</td>
        <td>默认null，当该参数值为<a href="https://github.com/axnfex/gulp-nuiwatch" target="_blank">gulp-nuiwatch</a>模块的返回值时，将会修改css文件内资源文件的版本号，该模块<a href="https://github.com/paulmillr/chokidar#api" target="_blank">options</a>中的usePolling必须为true，否则如果做监听css文件任务的话可能会造成死循环！</td>
    </tr>
</table>

