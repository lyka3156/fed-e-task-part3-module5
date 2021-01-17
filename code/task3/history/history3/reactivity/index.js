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
            track(target, key);
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
            trigger(target, key);
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
                trigger(target, key);
                return result;
            }
        }
    }

    // 3. 返回proxy对象
    return new Proxy(target, handler)
}

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
