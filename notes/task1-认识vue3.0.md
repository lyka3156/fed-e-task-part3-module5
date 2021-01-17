
# 认识vue3.0

## 1. vue3.0和vue2.0的区别

### 1.1 源码组织方式的变化
- 源码采用 TypeScript 重写
    - 检查类型问题
- 使用 Monorepo 管理项目结构
    - 把独立的模块都提取到不同的包中
    - 把不同功能的代码放到不同的package中管理
        - 这样的话每个功能划分都很明确
        - 模块之间的依赖关系也很明确
        - 每个功能模块都能单独测试，发布和使用
- packages 目录结构
    - packages
        - compiler-core     和平台无关的编译器
        - compiler-dom      浏览器平台下的编译器，依赖于compiler-core
        - compiler-sfc      单文件组件的编译器，依赖于compiler-core,compiler-dom
        - compiler-ssr      服务端渲染的编译器，依赖于compiler-dom
        - reactivity        数据响应式系统，可以独立使用
        - runtime-core      和平台无关的运行时
        - runtime-dom       浏览器的运行时，处理原生dom的api和event
        - runtime-test      测试编写的轻量级运行时，渲染的dom tree是js对象，可以运行在所以js环境里
            - 用来测试渲染是否正确
            - 虚拟化dom
            - 触发dom事件
            - 记录莫次dom的操作
        - server-renderer   服务端渲染
        - shared            内部使用的公共api
        - size-check        私有的包，不会发布npm
            - 在tree shaking之后检查包的大小
        - template-explorer 浏览器中运行的实时编译组件，会输出render函数
        - vue               构建完整版的vue,依赖与compiler和runtime
        - global.d.ts
    


### 1.2 不同构建版本
- vue3.0 不在构建umd的方式
    - umd的模块化方式，代码有更多的冗余，支持多模块化的方式
- vue3.0 把cjs和esm和自执行函数的方式分别打包到不同的文件中
- 构建版本  (4类构建版本)
    - packages/vue
        - _tests_
        - dist  
            - cjs  (commonjs模块化方式) 以下都是完整版vue包含运行时和编译器
                - vue.cjs.js
                    - (开发环境，没有压缩)
                - vue.cjs.prod.js
                    - (生产环境，压缩)
            - global    以下方式都可以在浏览器中直接通过script标签来导入，导入之后会在全局加一个vue对象
                - vue.global.js
                    - (开发环境，没有压缩)
                - vue.global.prod.js
                    - (生产环境，压缩)
                - vue.runtime.global.js
                    - 只包含运行时的构建版本(开发环境，没有压缩)
                - vue.runtime.global.prod.js
                    - 只包含运行时的构建版本(生产环境，压缩)
            - browser   浏览器原生模式，在浏览器中直接通过script标签来导入这些模块
                - vue.esm-browser.js
                    - esm的完整版(开发环境，没有压缩)
                - vue.esm-browser.prod.js
                    - esm的完整版(生产环境，压缩)
                - vue.runtime.esm-browser.js
                    - esm的运行时版(开发环境，没有压缩)
                - vue.runtime.esm-browser.prod.js
                    - esm的运行时版(生产环境，压缩)
            - bundler   没有打包所有的代码，需要配合打包工具来使用，都使用esm模块化方式，内部通过import导入了runtime-core,runtime-compiler，这是体积最少的vue
                - vue.esm-bundler.js
                - vue.runtime.esm.bundler.js
            

### 1.3 Commposition API
vue3.0的Commposition API的API文档
- RFC(Request For Comments)   官方的
    - https://github.com/vuejs/rfcs
- Composition API RFC
    - https://composition-api.vuejs.org

vue3.0的Commposition API的设计动机
- 解决vue2.0在开发大型项目时遇到超大组件使用Options API不好拆分和重用的问题
- vue3.0新增的一组 API
- 一组基于函数的 API
- 可以更灵活的组织组件的逻辑

vue2.0的Options API
- 包含一个描述组件选项(data,methods,props等)的对象
- Options API 开发复杂组件，同一个功能逻辑的代码被拆分到不同选项

使用vue2.0和vue3.0分别实现获取鼠标的位置并展示到页面

`vue2.0 的 Options API Demo`
- 如果需要添加新的功能，那么就需要在data,和methods中添加代码，这样就需要滚动滚动条来改代码
``` js
export default {
    data(){
        return {
            position: {
                x: 0,
                y: 0
            }
        }
    },
    created(){
        window.addEventListener('mousemove',this.handle)
    },
    destroyed(){
        window.removeEventListener('mousemove',this.handle)
    },
    methods: {
        handle(e){
            this.position.x = e.pageX;
            this.position.y = e.pageY;
        }
    }
}
```

`vue3.0 的 Commposition API Demo`
- 如果需要添加新的功能，那么只需要添加一个新的useFn函数把功能封装起来，哪个组件需要使用直接调用这个useFn函数即可，这样做的好处是在查看莫个逻辑的时候只需要关注函数即可
``` js
import {reactive,onMounted,onUnmounted} from "vue"
// 把获取鼠标位置的功能封装到一个函数，其他组件也可以使用这个函数的功能
function useMousePosition(){
    const position = reactive({
        x: 0,
        y: 0
    })
    const update = (e)=>{
        position.x = e.pageX
        position.y = e.pageY
    }
    onMounted(()=>{
        window.addEventListener('mousemove',update)
    })
    onUnmounted(()=>{
        window.removeEventListener('mousemove',update)
    })
    return position
}
export default {
   setup(){
       const position = useMousePosition();
       return {
           position
       }
   }
}
```
[options和composition对比]("../images/task1/vue-options-composition.png")
- 总结：
    - composition API 提供了一种基于函数的 API,让我们可以更灵活的组织组件的逻辑
    - 使用composition API 可以更合理的组织组件内部代码的结构
    - 还可以把一些逻辑功能从组件中提取出来，方便其他组件重用

### 1.4 性能提升
响应式系统升级
- vue2.0中响应式系统的核心 defineProperty
    - 通过defineProperty把对象的属性转化给 getter 和 setter
    - 如果 data 中的属性又是对象的话又要递归处理每一个子对象的属性
    - 这些都是初始化执行的，你没使用的属性也做了响应式处理
- vue3.0 中使用 proxy 对象重写响应式系统
    - 可以监听动态新增的属性
        - vue2.0中需要使用vue.$set
    - 可以监听删除的属性
    - 可以监听数组的索引和 length 属性

编译优化
- 重写了虚拟DOM，从而让渲染和update的性能有大幅度提升
- vue2.0中通过标记静态根节点，优化 diff的过程
- vue3.0中标记和提升所有的静态根节点，diff的时候只需要对比动态节点内容
    - [可以查看Patch flag的优化网站](https://vue-next-template-explorer.netlify.app/#%7B%22src%22%3A%22%3Cdiv%20id%3D%5C%22app%5C%22%3E%5Cn%20%20%3Cselect%3E%5Cn%20%20%20%20%3Coption%3E%5Cn%20%20%20%20%20%20%7B%7B%20msg%20%20%7D%7D%5Cn%20%20%20%20%3C%2Foption%3E%5Cn%20%20%3C%2Fselect%3E%5Cn%20%20%3Cdiv%3E%5Cn%20%20%20%20hello%5Cn%20%20%3C%2Fdiv%3E%5Cn%3C%2Fdiv%3E%22%2C%22options%22%3A%7B%22mode%22%3A%22module%22%2C%22prefixIdentifiers%22%3Afalse%2C%22optimizeImports%22%3Afalse%2C%22hoistStatic%22%3Afalse%2C%22cacheHandlers%22%3Afalse%2C%22scopeId%22%3Anull%2C%22inline%22%3Afalse%2C%22ssrCssVars%22%3A%22%7B%20color%20%7D%22%2C%22bindingMetadata%22%3A%7B%22TestComponent%22%3A%22setup%22%2C%22foo%22%3A%22setup%22%2C%22bar%22%3A%22props%22%7D%2C%22optimizeBindings%22%3Afalse%7D%7D)
    - Fragments （升级 vetur 插件，不然vscode提示错误）
        - 模板中不需要再创建一个唯一的根节点
    - 静态提升
        - 静态节点（标签里面的内容都是纯文本内容）都会提升到render函数的外面
        - 静态节点在初始化会被创建一次，当我们再调用render的时候不需要再次创建静态节点

        [静态提升]("../images/task1/vue-options-composition.png")
    - Patch flag 标记
        - 静态节点flag为-1,静态节点都会被跳过，
        - 动态节点flag为1，代表动态文本绑定,diff只会比较text文本是否发生变化
        - 动态节点flag为9，代表动态文本和属性绑定，diff只会比较text和props
        - 这样大大提升了虚拟dom diff的性能  
            - vue2.0中重新渲染的时候，需要重新去创建新旧vnode,diff的时候会跳过静态根节点，对比剩下的每一个新旧vnode,哪怕这个节点什么都没做
            - vue3.0中通过标记和提升静态节点记忆Patch flag标记动态节点来大大提升了 diff的性能

        [PatchFlag]("../images/task1/PatchFlag.png")
    - 缓存事件处理函数
        - 不缓存，当数据更新的时候，会重新渲染视图
        - 开启缓存，首次渲染的时候会生成一个新的函数，并且会把这个新的函数缓存到cache对象里面来，将来再次调用render的时候直接从缓存中获取我们上一次生成的函数，这个函数绑定不会发生变化，你运行的时候他会获取最新的函数，避免了不必要的更新
    - 总结：
        - vue3.0中在编译的过程中会通过标记和提升静态节点，然后通过patch flag，将来在diff的时候跳过动态根节点，只需要去更新动态节点中的内容，大大提升了diff的性能
        - 另外还通过对事件处理函数的缓存，减少了不必要的更新操作
        
源码体积的优化
- 服务端的渲染的性能也提升了2到3倍
- vue3.0中移除了一些不常用的API
    - 例如：inline-template,filter等
        - 可以通过methdos和computed来实现
- Tree-shaking
    - api可以通过按需引入 import {API...} from 'vue'

### 1.5 Vite (快)
优点
- 使用Vite开发项目的时候我们不需要打包可以直接运行项目
- 提升了开发效率

Vite的组成
- 比之前基于webpack的cli更快
- vite基于esm

ES Module
- 现代浏览器都支持 ES Module (IE不支持)
- 通过下面的方式加载模块
    - `<script type='module' src=''></script>`
- 支持模块的 script 默认延迟加载
    - 类似于 script 标签设置 defer
    - 在文档解析完成后，触发 DOMContentLoaded 事件前执行

Vite as Vue-CLI的区别 （开发环境）
- vite 在开发模式下不需要打包可以直接运行
- vue-cli 开发模式下必须对项目打包才可以运行

vite 特点
- 快速冷启动
    - 不需要打包
- 按需编译
    - 代码加载时才需要编译，不需要在开启开发服务器的时候等待整个项目的打包,项目比较大更明显
- 模块热更新
    - 模块更新的性能和模块的总数无关，无论你有多少模块，html的速度始终比较快

Vite as Vue-CLI的区别 (生产环境)
- vite 在生产模式下不使用 Rollup 打包
    - 基于 ES Module 的方式打包，打包体积更少
- vue-cli 使用 webpack打包

Vite 创建项目
- vite 创建项目
``` js
npm init vite-app project-name
cd project-name
npm i 
npm run dev
```
- 基于模板创建项目
``` js
npm init vite-app --template reacct
npm init vite-app --template preact
```