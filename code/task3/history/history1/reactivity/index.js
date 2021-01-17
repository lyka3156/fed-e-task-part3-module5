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

