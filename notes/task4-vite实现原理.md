# 1. vite 实现原理

## 1.1 vite 介绍
### 1.1.1 vite 概念
- vite 是一个面向现代浏览器的一个更轻，更快的 Web 应用开发工具
- 它基于 ECMAScript 标签原生模块系统 (ES Modules) 实现
- 它的出现是为了解决webpack在开发阶段使用webpack-dev-server启动时间过长，另外webpack-hmr热更新反应慢的问题。

### 1.1.2 vite 项目依赖
- vite
- @vue/compiler-sfc

### 1.1.3 基础使用
- vite serve        启动服务器，不需要打包
    - vue cli serve 需要打包
- vite build        打包

![vite serve]("../images/task4/vite-serve.png")     

![vue cli serve]("../images/task4/vue-cli-service.png")

### 1.1.4 vite HMR
- vite HMR
    - 立即编译当前所修改的文件
- webpack HMR
    - 会自动以这个文件为入口重写build一次，所有的涉及到的依赖也都会被加载一遍

### 1.1.5 Build
- vite build
    - rollup
    - dynamic import
        - polyfill

### 1.1.6 打包 or 不打包
- 使用webpack 打包的两个原因
    - 浏览器环境并不支持模块化
    - 零散的模块文件会产生大量的 http 请求

### 1.1.7 vite 开箱即用
- TypeScript - 内置支持
- less/sass/stylus/postcss - 内置支持 （需要单独安装）
- JSX
- Web Assembly

### 1.1.8 vite 特性
- 快速冷启动
- 模块热更新
- 按需编译
- 开箱即用

## 1.2 vite 核心功能
- 静态 Web 服务器
- 编译单文件组件
- HMR

### 1.2.1 静态 Web 服务器
koa 开启静态服务器

`packjson.json`
``` js
{
  "name": "vite-cli",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "bin": "index.js",            // 设置入口
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@vue/compiler-sfc": "^3.0.0-rc.10",
    "koa": "^2.13.0",
    "koa-send": "^5.0.1"
  }
}
```

``` js
#!/usr/bin/env node
const Koa = require('koa')
const send = require('koa-send')

const app = new Koa()

// 1. 开启静态文件服务器
app.use(async (ctx, next) => {
  await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' })
  // 执行下一个中间件
  await next()
})

app.listen(3000, () => {
  console.log('Server running @ http://localhost:3000')
})
```
### 1.2.2 修改第三方文件的模块

``` js
#!/usr/bin/env node
const Koa = require('koa')
const send = require('koa-send')

const app = new Koa()

// 将流转成字符串
const streamToString = stream => new Promise((resolve, reject) => {
  const chunks = []
  stream.on('data', chunk => chunks.push(chunk))
  stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
  stream.on('error', reject)
})

// 1. 开启静态文件服务器
app.use(async (ctx, next) => {
  await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' })
  // 执行下一个中间件
  await next()
})

// 2. 修改第三方模块的路径
app.use(async (ctx, next) => {
  // 如果是js模块
  if (ctx.type === 'application/javascript') {
    // 将流转化成字符串
    const contents = await streamToString(ctx.body)
    // import vue from 'vue'    =>    import vue from '/@modules/vue'
    // import App from './App.vue'  不需要处理
    ctx.body = contents
      .replace(/(from\s+['"])(?![\.\/])/g, '$1/@modules/')
      .replace(/process\.env\.NODE_ENV/g, '"development"')
  }
})

app.listen(3000, () => {
  console.log('Server running @ http://localhost:3000')
})
```

### 1.2.3 加载第三方模块
``` js
#!/usr/bin/env node
const Koa = require('koa')
const send = require('koa-send')

const app = new Koa()

// 将字符串装成字符串
const stringToStream = text => {
  const stream = new Readable()
  stream.push(text)
  stream.push(null)
  return stream
}

// 3. 加载第三方模块   
app.use(async (ctx, next) => {
  // ctx.path --> /@modules/vue
  if (ctx.path.startsWith('/@modules/')) {
    const moduleName = ctx.path.substr(10)
    const pkgPath = path.join(process.cwd(), 'node_modules', moduleName, 'package.json')
    const pkg = require(pkgPath)
    ctx.path = path.join('/node_modules', moduleName, pkg.module)
  }
  await next()
})

// 1. 开启静态文件服务器
app.use(async (ctx, next) => {
  await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' })
  // 执行下一个中间件
  await next()
})

// 2. 修改第三方模块的路径
app.use(async (ctx, next) => {
  // 如果是js模块
  if (ctx.type === 'application/javascript') {
    // 将流转化成字符串
    const contents = await streamToString(ctx.body)
    // import vue from 'vue'    =>    import vue from '/@modules/vue'
    // import App from './App.vue'  不需要处理
    ctx.body = contents
      .replace(/(from\s+['"])(?![\.\/])/g, '$1/@modules/')
      .replace(/process\.env\.NODE_ENV/g, '"development"')
  }
})

app.listen(3000, () => {
  console.log('Server running @ http://localhost:3000')
})
```

### 1.2.4 编译单文件组件
- 会发两次请求
    - 第一次请求会把单文件组件编译成一个对象
    - 第二次请求会编译单文件组件的模板，返回一个render函数，并且把这个render函数挂载到上面那个对象的render方法上
``` js
#!/usr/bin/env node
const path = require('path')
const { Readable } = require('stream')
const Koa = require('koa')
const send = require('koa-send')
const compilerSFC = require('@vue/compiler-sfc')

const app = new Koa()

// 将流转成字符串
const streamToString = stream => new Promise((resolve, reject) => {
  const chunks = []
  stream.on('data', chunk => chunks.push(chunk))
  stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
  stream.on('error', reject)
})
// 将字符串装成字符串
const stringToStream = text => {
  const stream = new Readable()
  stream.push(text)
  stream.push(null)
  return stream
}

// 3. 加载第三方模块   
app.use(async (ctx, next) => {
  // ctx.path --> /@modules/vue
  if (ctx.path.startsWith('/@modules/')) {
    const moduleName = ctx.path.substr(10)
    const pkgPath = path.join(process.cwd(), 'node_modules', moduleName, 'package.json')
    const pkg = require(pkgPath)
    ctx.path = path.join('/node_modules', moduleName, pkg.module)
  }
  await next()
})

// 1. 开启静态文件服务器
app.use(async (ctx, next) => {
  await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' })
  // 执行下一个中间件
  await next()
})

// 4. 处理单文件组件
app.use(async (ctx, next) => {
  if (ctx.path.endsWith('.vue')) {
    const contents = await streamToString(ctx.body)
    const { descriptor } = compilerSFC.parse(contents)
    let code
    if (!ctx.query.type) {
      code = descriptor.script.content
      // console.log(code)
      code = code.replace(/export\s+default\s+/g, 'const __script = ')
      code += `
      import { render as __render } from "${ctx.path}?type=template"
      __script.render = __render
      export default __script
      `
    } else if (ctx.query.type === 'template') {
      const templateRender = compilerSFC.compileTemplate({ source: descriptor.template.content })
      code = templateRender.code
    }
    ctx.type = 'application/javascript'
    ctx.body = stringToStream(code)
  }
  await next()
})

// 2. 修改第三方模块的路径
app.use(async (ctx, next) => {
  // 如果是js模块
  if (ctx.type === 'application/javascript') {
    // 将流转化成字符串
    const contents = await streamToString(ctx.body)
    // import vue from 'vue'    =>    import vue from '/@modules/vue'
    // import App from './App.vue'  不需要处理
    ctx.body = contents
      .replace(/(from\s+['"])(?![\.\/])/g, '$1/@modules/')
      .replace(/process\.env\.NODE_ENV/g, '"development"')
  }
})

app.listen(3000, () => {
  console.log('Server running @ http://localhost:3000')
})

```
