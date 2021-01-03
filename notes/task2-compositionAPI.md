# 1 Composition API

## 1.1 createAPP使用
createApp用来创建vue对象

- 通过createAPP创建的app对象成员比之前vue2的new Vue少很多，并且没有$开头，说明未来我们不要给这个对象新增成员
- 通过vscode 的 live Serve插件启动一个服务器，不然使用script type="module"报跨域问题
- [ES6实现模块化时遇到的跨域问题(module)](https://blog.csdn.net/weixin_45565864/article/details/108967925)
``` html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <div id="app">
        x:{{position.x}}
        y:{{position.y}}
    </div>
    <script type="module">
        import { createApp } from "./node_modules/vue/dist/vue.esm-browser.js"
        const app = createApp({
             data() {
                return {
                    position: {
                        x: 0,
                        y: 0
                    }
                }
            }
        });
        console.log(app);
        app.mount("#app");
    </script>
</body>
</html>
```

## 1.2 setup 函数
setup是composition的入口

setup有两个参数
- 第一个参数 props 接受外部传过来的参数，props是一个响应式对象，不能被解构
- 第二个参数 context: attrs,emit,slots
setup返回值
- 返回一个对象：可以使用在模板，methods，computed，以及生命周期的钩子函数中
- 返回的对象不是响应式的对象，需要通过reactive，ref或者toRefs来包装成响应式属性
setup执行时机
- 在props被解析完毕，但是在组件实例被创建之前执行的，所以在setup中无法通过this获取组件的实例，
- 因为组件实例还未被创建，所以在setup中也无法访问组件的data,computed,methods，
- setup的this指向的是undefined

``` html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <div id="app">
        x:{{position.x}}
        y:{{position.y}}
    </div>
    <script type="module">
        import { createApp } from "./node_modules/vue/dist/vue.esm-browser.js"
        const app = createApp({
            setup(){

            }
           
        });
        console.log(app);
        app.mount("#app");
    </script>
</body>

</html>
```

## 1.3 声明周期钩子
composition API中的生命周期钩子在之前的钩子函数签名加了on，并且首字母大写，例如：beforeMount => onBeforeMount

注意: beforeCreate和created钩子函数不需要在setup中有对应的实现，因为setup函数在这两个钩子函数中间执行。其他钩子函数在setup中前面都加了on,并且首字母大写。

onRenderTracked和onRederTriggered这两个钩子非常相似，都是在render函数被重新调用的时候触发，onRenderTracked首次调用render的时候也会触发，onRenderTracked首次调用render的时候不会触发

[声明周期钩子]("../images/task2/声明周期钩子.png")

`利用上面的知识实现一个记录鼠标移动的功能`
``` html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <div id="app">
        x:{{position.x}}
        y:{{position.y}}
    </div>
    <script type="module">
        import { createApp, reactive, onMounted, onUnmounted } from "./node_modules/vue/dist/vue.esm-browser.js"
        // 将功能抽离到一个函数中,在任何组件中都能使用
        function useMousePostion() {
            // reactive返回的就是一个响应式对象
            const position = reactive({
                x: 0,
                y: 0
            })
            const update = e => {
                position.x = e.pageX
                position.y = e.pageY
            }
            onMounted(() => {
                window.addEventListener('mousemove', update)
            })
            onUnmounted(() => {
                window.removeEventListener('mousemove', update)
            })
            return position;
        }
        const app = createApp({
            setup() {
                const position = useMousePostion();
                return {
                    position
                }
            },
        });
        app.mount("#app");
    </script>
</body>
</html>
```

## 1.4 reactive-toRefs-ref
### 1.4.1 reactive
- 无法对reactive包装的响应式对象无法进行解构，解构之后的属性不是响应式数据
- 如果需要解构就使用toRefs来设置响应式数据
``` js
import { createApp, reactive} from "./node_modules/vue/dist/vue.esm-browser.js"
function useMousePostion(){
    // reactive返回的就是一个响应式对象
    const position = reactive({
        x: 0,
        y: 0
    })
    return position;
}
const app = createApp({
    setup() {
        // useMousePostion返回的是一个通过reactive返回的响应式对象
        // const position = useMousePostion();

        // 如果通过解构的方式解构上面这个对象，那么他的属性x,y就不是响应式的数据了
        // 因为reactive把obj对象包装成一个proxy对象，他对proxy代理的obj对象的属性添加了getter拦截收集依赖和setter拦截触发更新
        // 如果你解构了proxy，那就是解构了两个基本类型的变量，在内存中赋值一份，跟代理对象无关，重新调用x,y的赋值不会触发代理对象的setter
        const { x, y } = useMousePostion();
        return {
            x,
            y
        }
    },
});
```

### 1.4.2 toRefs
- toRefs要求我们传入的必须是一个代理对象，也就是reactive包装生成的proxy对象，如果传入的不是一个代理对象，他会报警告提示
- toRefs内部会创建一个新的对象，然后遍历传递代理对象的所有属性，把所有属性上的值全部转换为响应式对象。然后挂载到新创建的对象上，最后返回这个新对象
- toRefs内部会为代理对象的每一个属性创建一个具有value属性的对象，该对象是响应式的，value属性具有getter和setter,这一点和ref有些类似，getter里面返回代理对象中对应属性的值，setter中给代理对象的属性赋值，所以我们返回的每一个属性都是响应式的
- toRefs返回的每一个属性都是一个响应式对象
- 我们在模板中使用的时候，属性对象的value可以省略，但是我们在代码中去写的时候这个value是不可以去省略的。
``` js
+ import { createApp, reactive,toRefs} from "./node_modules/vue/dist/vue.esm-browser.js"
function useMousePostion(){
    // reactive返回的就是一个响应式对象
    const position = reactive({
        x: 0,
        y: 0
    })
+    // toRefs把响应式的所有属性也变成响应式的
+    return toRefs(position);
}
const app = createApp({
    setup() {
        // useMousePostion返回的是一个通过reactive返回的响应式对象
        // const position = useMousePostion();

        // 如果通过解构的方式解构上面这个对象，那么他的属性x,y就不是响应式的数据了
        // 因为reactive把obj对象包装成一个proxy对象，他对proxy代理的obj对象的属性添加了getter拦截收集依赖和setter拦截触发更新
        // 如果你解构了proxy，那就是解构了两个基本类型的变量，在内存中赋值一份，跟代理对象无关，重新调用x,y的赋值不会触发代理对象的setter
        const { x, y } = useMousePostion();
        return {
            x,
            y
        }
    },
});
```

### 1.4.3 ref
- 把普通数据转换成响应式数据
- 跟reactive不同的是，reactive是把一个对象转换成响应式数据，ref可以把基本数据包装成响应式对象

ref参数类型
- 如果参数是一个对象的话，会调用reactive返回一个proxy对象
- 如果参数是基本类型的值，内部会创建一个有value属性的对象，该对象的value属性具有getter和setter,在getter中收集依赖，在setter中触发更新

### 1.4.4 总结
- reactive的作用是把对象转换成响应式对象，是一个代理对象
- ref函数的作用是把基本类型数据转换成响应式对象
- toRefs可以把代理对象的所有属性都转换成响应式对象，toRefs在处理对象的属性类似于ref，通过toRefs处理reactive返回的代理对象可以进行解构的操作

## 1.5 computed

## 1.6 watch

## 1.7 watchEffect

## 1.8 案列-实现代办事项增删改，切换，存储等功能