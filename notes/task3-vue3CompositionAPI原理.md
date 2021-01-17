# 1. vue3 Composition APi 原理剖析

## 1.1 响应式原理
- Proxy 对象实现属性监听                
- 多层属性嵌套，只有在访问属性过程中处理下一级属性(递归监听)      
- 默认监听动态添加的属性            
- 默认监听属性的删除操作        deleteProperty
- 默认监听数组索引和length属性
- 可以作为单独的模块使用


## 1.2 核心方法
- reactive/ref/toRefs/computed  (实现)
- watch和watchEffect是runtime-core中实现的，watch函数的内部使用了effect的底层函数
- effect     (实现)
- track         收集依赖     (实现)
- trigger       触发更新     (实现)

## 1.3 proxy的两个小问题

### 1.3.1 问题1： set 和 deleteProperty 中需要返回布尔类型的值
- 在严格模式下，如果返回 false 的话会出现 Type Error 的异常`
``` js
'use strict'
// 问题1： set 和 deleteProperty 中需要返回布尔类型的值
//        在严格模式下，如果返回 false 的话会出现 Type Error 的异常
const target = {
    foo: 'xxx',
    bar: 'yyy'
}
// Reflect.getPrototypeOf()
// Object.getPrototypeOf()
const proxy = new Proxy(target, {
    // receiver: 当前访问或者继承的proxy对象
    get(target, key, receiver) {
        // return target[key]
        // 严格模式下必须返回布尔类型的值
        return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
        // target[key] = value
        // 严格模式下必须返回布尔类型的值
        return Reflect.set(target, key, value, receiver)
    },
    deleteProperty(target, key) {
        // delete target[key]
        return Reflect.deleteProperty(target, key)
    }
})

proxy.foo = 'zzz'
// delete proxy.foo
```

### 1.3.2   Proxy 和 Reflect 中使用的 receiver
- Proxy 中 get和set的receiver：Proxy 或者继承 Proxy 的对象
- Reflect 中 receiver：如果 target 对象中设置了 getter，getter 中的 this 指向 receiver
``` js
const obj = {
    get foo() {
        // reflect中设置了receiver，那么此处就指向receiver代理对象，否则就是当前对象本身
        console.log(this)
        return this.bar
    }
}
const proxy = new Proxy(obj, {
    // 当前访问的 Proxy 或者继承 Proxy 的对象
    get(target, key, receiver) {
        if (key === 'bar') {
            return 'value - bar'
        }
        // 如果这里设置了receiver，将来访问target对象的get属性时，this指向receiver代理对象
        return Reflect.get(target, key, receiver)
    }
})
console.log(proxy.foo)
```

总结： vue3中获取或者设置值的时候都会传入receiver,防止类似的意外发生

## 1.4 实现reactive     (原理实现1)
- 接受一个参数，判断这参数是否是对象
    - 不是对象直接返回
- 创建拦截器对象 handler, 设置 get/set/deleteProperty
- 返回 Proxy 对象

实现步骤
- 步骤1： 接受一个参数，判断这参数是否是对象
    - 不是对象直接返回
- 步骤2： 创建拦截器对象 handler, 设置 get/set/deleteProperty
- 步骤3:  返回 Proxy 对象

`reactivity/index.js`
``` js
// 1) 辅助函数
// 1.1 判断一个值是否是object对象
const isObject = (val) => val !== null && typeof val === "object"
// 1.2 参数是对象调用reactive将这个对象转换成响应式对象，否则直接返回
const convert = target => isObject(target) ? reactive(target) : target
// 1.3 判断一个对象的原型上是否有这个属性
const hasOwnProperty = Object.prototype.hasOwnProperty
const hanOwn = (target, key) => hasOwnProperty.call(target, key)


// 2) reactive实现
// 步骤1： 接受一个参数，判断这参数是否是对象
//         - 不是对象直接返回
// 步骤2： 创建拦截器对象 handler, 设置 get/set/deleteProperty
// 步骤3:  返回 Proxy 对象
export function reactive(target) {
    // 1. 不是对象直接返回
    if (!isObject(target)) return target

    // 2. 创建拦截器对象 handler, 设置 get/set/deleteProperty
    const handler = {
        // 2.1 访问属性时触发
        get(target, key, receiver) {
            // 收集依赖
            console.log('get', key)
            const result = Reflect.get(target, key, receiver)
            // 如果访问的属性是对象继续调用reactive递归处理
            return convert(result)
        },
        // 2.2 设置属性时触发
        set(target, key, value, receiver) {
            // 获取老值
            const oldValue = Reflect.get(target, key);
            // 当老值和用户传入的新值相等不做任何逻辑
            if (oldValue === value) return true
            // 设置新值
            const result = Reflect.set(target, key, value, receiver)
            // 触发更新
            console.log('set', key, value)
            return result
        },
        // 2.3 删除属性时触发
        deleteProperty(target, key) {
            // target原型上是否有key这个属性
            const isKey = hanOwn(target, key);
            // 判断属性是否删除成功
            const result = Reflect.deleteProperty(target, key);
            // 删除成功触发更新
            if (isKey && result) {
                // 触发更新
                console.log('delete', key)
                return result;
            }
        }
    }

    // 3. 返回proxy对象
    return new Proxy(target, handler)
}

```
`index.js`
``` js
import { reactive } from "./reactivity/index.js"
const obj = reactive({
    name: "lisi",
    age: 26
})

obj.age;
obj.age = 20;
delete obj.age
console.log(obj)
```

## 1.5 收集依赖和触发更新

effect
- 步骤1： 首次加载的时候会执行一次传入的函数(callback)
- 步骤2:  当内部引用的响应式对象被访问时会收集依赖  (target,key,effect的callback)
- 步骤3： 当内部引用的响应式对象被访问时会触发依赖  (target,key,effect的callback)

![收集依赖]("../images/task3/收集依赖.png")

通过上面图可知:
- targetMap存储的是响应式对象       
    - new WeekMap()   
    - key: target
    - value: depsMap
- depsMap存储的是响应式对象的属性   
    - new Map()
    - key: target的key
    - value: dep
- dep存储的是响应式对象的属性所关联触发的effect函数集合     
    - new Set()
    - value: effect的callback

### 1.5.1 实现 effect   (原理实现2)
``` js
// 3)  effect函数
// 步骤1：接受一个函数作为参数，首次执行一次
let activeEffect = null // 当前活动的effect函数
export function effect(callback) {
    // 存储活动的effect函数
    activeEffect = callback
    // 1. 首次执行，访问响应式对象属性，在这里收集依赖，后续还需要执行这个callback
    callback()
    // 清空的原因： 如果有嵌套属性会是一个递归的过程
    activeEffect = null
}
```

### 1.5.2 实现 track 收集依赖  (原理实现3)
track 收集依赖
``` js
// 4) track函数(收集依赖)
let targetMap = new WeakMap();       // 收集响应式对象的map
export function track(target, key) {
    // 1. 当前活动的effect函数不存在直接返回不做任何收集依赖
    if (!activeEffect) return
    // 2. 去查找target响应式对象的depsMap  (target依赖的属性)
    let depsMap = targetMap.get(target);
    // 3. 如果没有depsMap，就是首次收集依赖属性
    if (!depsMap) {
        // 创建一个depsMap和targetMap关联
        targetMap.set(target, (depsMap = new Map()));
    }
    // 4. 根据属性查找对应的dep对象 (属性所关联的effect函数集合)
    let dep = depsMap.get(key);
    // 5. 如果没有dep，属性就是首次管理effect函数
    if (!dep) {
        // 创建一个dep和depsMap关联
        depsMap.set(key, (dep = new Set()));
    }
    // 6. 把effect函数添加到dep集合中
    dep.add(activeEffect);
}
```

### 1.5.3 实现 trigger 触发更新 (原理实现4)
``` js
// 5) trigger函数(触发更新)
export function trigger(target, key) {
    // 1. 通过target在targetMap中查找对应的收集的属性(depsMap)和effect函数(dep)
    const depsMap = targetMap.get(target);
    // 2. 如果没有找到收集的依赖直接返回
    if (!depsMap) return
    // 3. 通过key属性找到key集合    
    // dep集合： 存储的就是key属性所存储的effct函数集合
    const dep = depsMap.get(key);
    // 4. 执行dep集合中存储的effect函数
    if (dep) {
        dep.forEach(effect => {
            effect();
        });
    }
}
```

### 1.5.4 测试 effct
``` html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>vue3 Composition API 原理实现测试: track-trigger</title>
</head>

<body>
    <script type="module">
        import { reactive, effect } from "./reactivity/index.js"

        // 创建响应式对象product
        const product = reactive({
            name: 'iPhone',
            price: 5000,
            count: 3
        })
        let total = 0
        // effect和watchEffect一样，watchEffect内部是调用effect实现的
        // effect初始化会执行一次，当这个函数引用响应式数据的时候，
        // 如果引用的响应式发送变化会再次执行
        effect(() => {
            console.log("1111");            // 会执行3次
            total = product.price * product.count
        })

        console.log(total)          // 15000

        product.price = 4000
        console.log(total)          // 12000

        product.count = 1
        console.log(total)          // 4000
    </script>
</body>

</html>
```

## 1.6 实现ref   (原理实现5)
- 传递的参数是对象
    - 并且是ref创建的响应式对象直接返回
    - 并且是普通的对象，内部调用reactive创建响应式对象
- 传递的参数不是对象
    - 会创建一个只有value的响应式对象返回
``` js
// 6) ref函数 (响应式对象)
// 步骤1： 传递的参数是对象,并且是ref创建的响应式对象直接返回
// 步骤2： 传递的参数是对象,并且是普通的对象，内部调用reactive创建响应式对象
// 步骤3： 传递的参数不是对象,会创建一个只有value的响应式对象返回
//     - 
export function ref(raw) {
    // 1. 判断 raw 是不是 ref创建的对象，如果是的话直接返回
    if (isObject(raw) && raw.__v_isRef) return

    // 2. 如果是普通对象，调用reactive对象创建响应式对象
    let value = convert(raw);

    // 3. 如果不是对象，创建一个带有value的对象返回
    const refObj = {
        __v_isRef: true,
        get value() {
            // 收集依赖     (收集value属性)
            track(refObj, "value");
            return value;
        },
        set value(newValue) {
            // 判断新值和旧值是否相等
            if (newValue !== value) {
                // 新值存到 raw 中 
                raw = newValue;
                // 通过convert将响应式对象存到value中
                value = convert(raw);
                // 触发更新  (触发value属性的依赖dep集合)
                trigger(refObj, "value");
            }
        }
    }
    return refObj;
}
```

`测试ref`
``` html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>vue3 Composition API 原理实现测试: effect</title>
</head>

<body>
    <script type="module">
        // import { reactive, effect } from "./node_modules/@vue/reactivity/dist/reactivity.esm-browser.js"
        import { reactive, effect, ref } from "./reactivity/index.js"
        // 创建响应式对象
        const price = ref(5000);
        const count = ref(3);

        let total = 0
        // effect和watchEffect一样，watchEffect内部是调用effect实现的
        // effect初始化会执行一次，当这个函数引用响应式数据的时候，
        // 如果引用的响应式发送变化会再次执行
        effect(() => {
            total = price.value * count.value
        })

        console.log(total)          // 15000

        price.value = 4000
        console.log(total)          // 12000

        count.value = 1
        console.log(total)          // 4000
    </script>
</body>

</html>
```



## 1.7 实现 toRefs  (原理实现6)
- 传递的参数如果不是reactive创建的响应式对象直接返回
- 然后把传入对象的所有属性转化成类似于ref返回的对象，转换后的属性挂载到新的对象上返回

``` js
// 步骤1： 传递的参数如果不是reactive创建的响应式对象直接返回
// 步骤2:  然后把传入对象的所有属性转化成类似于ref返回的对象，转换后的属性挂载到新的对象上返回
export function toRefs(proxy) {
    //  处理界限是数组还是对象
    const ret = proxy instanceof Array ? new Array(proxy.length) : {};
    // 2. 遍历所有属性，并且将所有属性都转换成类似ref返回的对象，转换后的属性挂载到新的对象上返回
    for (const key in proxy) {
        ret[key] = toProxyRef(proxy, key);
    }
    return ret;
}
// 类似toRef的函数
function toProxyRef(proxy, key) {
    const refObj = {
        __v_isRef: true,
        get value() {
            // 这里访问的是响应式对象，内部会自动去收集依赖
            return proxy[key];
        },
        set value(newValue) {
            // 这里访问的是响应式对象，内部会自动去触发更新
            proxy[key] = newValue;
        }
    }
    return refObj;
}
```

`测试`
``` html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>vue3 Composition API 原理实现测试: toRefs</title>
</head>

<body>
    <script type="module">
        // import { reactive, effect } from "./node_modules/@vue/reactivity/dist/reactivity.esm-browser.js"
        import { reactive, effect, toRefs } from "./reactivity/index.js"

        function useProduct() {
            // 创建响应式对象product
            const product = reactive({
                name: 'iPhone',
                price: 5000,
                count: 3
            });
            // 将reactive返回的响应式对象通过toRefs包装之后可以解构
            return toRefs(product);
        }

        const { price, count } = useProduct();

        let total = 0
        // effect和watchEffect一样，watchEffect内部是调用effect实现的
        // effect初始化会执行一次，当这个函数引用响应式数据的时候，
        // 如果引用的响应式发送变化会再次执行
        effect(() => {
            total = price.value * count.value
        })

        console.log(total)          // 15000

        price.value = 4000
        console.log(total)          // 12000

        count.value = 1
        console.log(total)          // 4000
    </script>
</body>

</html>
```

## 1.8  实现 computed (原理实现7)
- 接受一个有返回值的函数作为参数，这个返回值就是计算属性的值，并且我们要监听这个函数内部使用的响应式数据的变化，最后把这个函数执行的结果返回  

``` js
// 8. computed函数  (计算属性)
// 步骤1: 接受一个有返回值的函数作为参数，这个返回值就是计算属性的值，
//  -  并且我们要监听这个函数内部使用的响应式数据的变化，
// 步骤2：最后把这个函数执行的结果返回  
export function computed(getter) {
    // 返回值就是计算属性的值，
    const result = ref();           // value值是undefined的响应式对象

    // 1. 监听这个函数内部使用的响应式数据的变化，
    effect(() => result.value = getter());

    // 2. 把这个函数执行的结果返回  
    return result;
}
```

`测试`
``` html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>vue3 Composition API 原理实现测试: computed</title>
</head>

<body>
    <script type="module">
        import { reactive, toRefs, computed } from "./reactivity/index.js"

        function useProduct() {
            // 创建响应式对象product
            const product = reactive({
                name: 'iPhone',
                price: 5000,
                count: 3
            });
            // 将reactive返回的响应式对象通过toRefs包装之后可以解构
            return toRefs(product);
        }

        const { price, count } = useProduct();

        let total = computed(() => price.value * count.value);


        console.log(total.value)          // 15000

        price.value = 4000
        console.log(total.value)           // 12000

        count.value = 1
        console.log(total.value)           // 4000
    </script>
</body>

</html>
```


## 1.9  总结
### 1.9.1 reactive和ref的区别
- ref 可以把基本数据类型数据，转成响应式对象
    - 获取数据时，需要访问value属性，模板中使用可以省略value
- reactive 不可以把基本数据类型数据，转成响应式对象

- ref 返回的对象，重新赋值成对象也是响应式的
- reactive 返回的对象，重新赋值丢失响应式

- reactive 返回的对象不可以解构
    - 如果需要解构的话需要通过toRefs处理reactive返回的对象
