## Installation

Install package with NPM and add it to your development dependencies:

`npm install --save-dev gulp-nui`

## Usage

```js
var nui = require('gulp-nui');
var babel = require('babel-core');

gulp.task('nui', function(){
  gulp.src('./pages/*.html')
    .pipe(nui({
        paths:{
            base:__dirname+'/',
            node:'/node_modules/'
        },
        alias:{
	    'common':'{base}libs/common.js'
	},
        cssdebug:true,
        jsmin:{
            mangle:false
        },
        syncAsset:{
            paths:['node'],
            rename:15
        },
        babel:[babel, {
            presets:['es2015', 'stage-2'],
            plugins:['transform-runtime']
        }]
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
        <td>String</td>
        <td>项目根目录，必须为硬盘绝对路径，默认值为gulpfile.js所在目录，设置后将会覆盖paths中的base</td>
    </tr>
    <tr>
        <td>paths</td>
        <td>Object {别名:路径,别名:路径,..}</td>
        <td>设置路径别名，和Nui.config中的paths对应录</td>
    </tr>
    <tr>
        <td>alias</td>
        <td>Object {别名:路径,别名:路径,..}</td>
        <td>设置模块别名，和Nui.config中的alias对应</td>
    </tr>
    <tr>
        <td>url</td>
        <td>String</td>
        <td>Nui配置文件路径，设置后会读取文件中paths和alias属性作为参数选项，使用该参数可以省略paths和alias设置</td>
    </tr>
    <tr>
        <td>verlen</td>
        <td>Number</td>
        <td>默认值为7，设置版本号长度，会对页面中所有的静态资源路径后面增加“?v=xxxx”，设置为0将不会更新版本号</td>
    </tr>
    <tr>
        <td>vermap</td>
        <td>Boolean</td>
        <td>默认值为true，是否在配置文件中生成版本映射，此设置将不会添加静态资源版本号</td>
    </tr>
    <tr>
        <td>mintype</td>
        <td>String</td>
        <td>默认为空，值为空压缩css和js，为css时仅合并压缩css模块，为js时仅合并压缩js模块，在watch监听任务时设置该参数可以有效解决合并压缩任务过慢的问题</td>
    </tr>
    <tr>
        <td>cssmin</td>
        <td>Boolean, Function</td>
        <td>默认true，是否合并依赖模块并压缩，会在入口模块所在文件夹的同级style文件夹中（没有则自动创建）生成“入口模块名-min.css”，当设置为对象时，为css压缩选项，当值为null时仅合并模块不压缩，也不会生成sourcemap文件
        <a href="https://github.com/jakubpawlowicz/clean-css/tree/v3.0.1#how-to-use-clean-css-programmatically" target="_blank">参考clean-css</a>，默认advanced为false，compatibility为ie7。</td>
    </tr>
    <tr>
        <td>cssdebug</td>
        <td>Boolean</td>
        <td>默认true，是否生成sourcemap调试文件，方便压缩文件调试</td>
    </tr>
    <tr>
        <td>syncAsset</td>
        <td>Boolean, Array, String, Object</td>
        <td>默认false，是否在合并css时将资源文件（图片、字体等）同步到项目中，需在paths中配置目录别名，当值为字符串只能配置一个别名，当为数组时可配置多个别名，当值为对象时有2个属性{paths:配置别名（传递数组或者字符串）, rename:是否对同步的文件进行重命名，若为false则不重新命名，若为数值型则可以设置文件名的长度，默认值为10}</td>
    </tr>
    <tr>
        <td>jsmin</td>
        <td>Boolean, Object</td>
        <td>默认true，是否合并依赖模块并压缩，会在入口模块同目录生成“入口模块名-min.js”，当值为对象时，可配置压缩选项，当值为null时仅合并模块不压缩，也不会生成sourcemap文件<a href="https://github.com/mishoo/UglifyJS2" target="_blank">查看参数配置</a></td>
    </tr>
    <tr>
        <td>jsdebug</td>
        <td>Boolean</td>
        <td>默认true，是否生成sourcemap调试文件，方便压缩文件调试</td>
    </tr>
    <tr>
        <td>changed</td>
        <td>Boolean</td>
        <td>默认true，是否只输出修改过的文件流</td>
    </tr>
    <tr>
        <td>filterPath</td>
        <td>Function(资源路径, 引入资源的文件路径)</td>
        <td>默认null，当资源路径为非http开头的绝对路径，例如“/a/b/c”或者包含特殊变量（例如jsp文件中后台开发会使用&lt;%=basepath%&gt;引入路径）时才启用，可以用于过滤特殊符号，返回资源在硬盘中的路径</td>
    </tr>
    <tr>
        <td>watcher</td>
        <td>Object</td>
        <td>默认null，当该参数值为<a href="https://github.com/axnfex/gulp-nuiwatch" target="_blank">gulp-nuiwatch</a>模块的返回值时，将会修改css文件内资源文件的版本号，该模块<a href="https://github.com/paulmillr/chokidar#api" target="_blank">options</a>中的usePolling必须为true，否则如果做监听css文件任务的话可能会造成死循环！</td>
    </tr>
    <tr>
        <td>babel</td>
        <td>Array, Object</td>
        <td>默认null，当babel值为数组时，第0个值为<a href="https://babeljs.io/docs/core-packages/" target="_blank">babel-core</a>模块返回值，第1个值为参数选项，参数是<a href="https://babeljs.io/docs/plugins/#presets" target="_blank">presets</a>和<a href="https://babeljs.io/docs/plugins/#transform-plugins" target="_blank">plugins</a>；当babel值为对象时，为<a href="https://babeljs.io/docs/core-packages/" target="_blank">babel-core</a>模块返回值，默认参数presets值为es2015、stage-2。</td>
    </tr>
</table>

## Versions
#### v2.2.8
1.修复模块打包不全的bug

#### v2.2.7
1.修复require模块名中包含“./extend”,模块不打包问题

#### v2.2.6
1.修复css模块依赖加载顺序错误bug，依赖的文件应该被先加载
```js
//a.js
import './a.css'; //a { color:#000}
import './b.js';

//b.js
import './a.css'; //a { color:#fff}

//打包文件结果
//修复前：
a {color:#000}
a {color:#fff}

//修复后：
a {color:#fff}
a {color:#000}
```
#### v2.2.5
1.优化代码
#### v2.2.4
1.图片打包优化
#### v2.2.3
1.初始化删除打包目录改为第一次任务执行时
#### v2.2.2
1.初始化gulp-nui时默认会删除打包目录
#### v2.2.1
1.修复css不能打包的bug
#### v2.1.4
1.imports加入对资源文件导入的支持，返回文件绝对路径
```js
import url from '../images/test.jpg'; 
console.log(url) //http://domain/pages/images/test.jpg
```
2.如果导入的资源文件属于syncAsset配置项的目录中，会自动将该资源文件同步到项目中
```js
import url from '{node_modules}/demo/images/test.jpg'; 
console.log(url) //http://domain/pages/images/packs/test-f81365499b.jpg
```
#### v2.1.3
1.imports引入样式文件时，如果没有加扩展名，默认加载css文件变更为less文件
#### v2.1.2
1.修复css打包后内部引入的资源文件没有版本号的问题
#### v2.1.1
1.增加css文件中的资源打包功能
