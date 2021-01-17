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
- 无法对reactive包装的响应式对象进行解构，解构之后的属性不是响应式数据
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
- 简化模板中的代码，缓存计算的结果，当数据变化后才会计算。
- 可以像vue2.0一样在组件中创建computed
- 也可以在vue3.0的setup函数中创建computed

- 第一种用法
    - 传入获取值的函数，函数内部依赖响应式的数据，当依赖的数据发生变化之后，会重新执行该函数获取数据
    - computed函数返回不可变的响应式对象，类似于使用ref创建的对象只有一个value属性，获取计算属性的值要通过value来获取，模板中使用计算属性可以省略value
    ``` js
    watch(()=>{count.value+1})
    ```
- 第二种用法
    - 传入一个对象，这个对象具有get和set方法，返回一个不可变的响应式对象，当获取值的时候会触发这个get方法，当设置值的时候会触发这个对象的set方法
    ```js
    const count = ref(1)
    const plusOne = computed({
        get: ()=>count.value + 1,
        set: val => {count.value = val-1}
    })
    ```

- 总结：
    - 他可以创建一个响应式的数据，这个响应式的数据依赖于其他响应式的数据，当依赖的数据发生变化后，会重新计算属性传入的函数
``` html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>comnputed</title>
</head>

<body>
    <div id="app">
        <button @click="push">按钮</button>
        未完成：{{ activeCount }}
    </div>
    <script type="module">
        import { createApp, reactive, computed } from './node_modules/vue/dist/vue.esm-browser.js'
        const data = [
            { text: '看书', completed: false },
            { text: '敲代码', completed: false },
            { text: '约会', completed: true }
        ]

        createApp({
            // composition API 在这里面写
            setup() {
                // todos响应式对象 proxy对象
                const todos = reactive(data)

                // 未完成的代办事项个数
                const activeCount = computed(() => {
                    return todos.filter(item => !item.completed).length
                })

                return {
                    activeCount,
                    push: () => {
                        todos.push({
                            text: '吃饭了',
                            completed: false    // 未完成
                        })
                    }
                }
            }
        }).mount('#app')
    </script>
</body>

</html>
```

## 1.6 watch
- 和之前$watch和options API中的watch是一样的
- 监听响应式数据的变化，然后执行一个回调函数，最后只要监听数据的新值和旧值

- watch的三个参数
    - 第一个参数：要监听的数据
        - 可以是一个获取值的函数,监听这个函数返回值的变化
        - 或者可以是一个ref或者reactive返回的对象，还可以是数组
    - 第二个参数：监听到数据变化后执行的函数，这个函数有两个参数分别是新值和旧值
    - 第三个参数：选项对象，deep(深度监听)和immediate(立即执行)

- watch的返回值
    - 取消监听的函数
``` html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>watch</title>
</head>

<body>
    <div id="app">
        <p>
            请问一个 yes/no 的问题:
            <input v-model="question">
        </p>
        <p>{{ answer }}</p>
    </div>

    <script type="module">

        import { createApp, ref, watch } from './node_modules/vue/dist/vue.esm-browser.js'

        createApp({
            setup() {
                const question = ref('')        // 问题
                const answer = ref('')          // 答案
                // 当问题改变就请求接口拿到问题的结果
                watch(question, async (newValue, oldValue) => {
                    // https://www.yesno.wtf/api  随机返回yes or no
                    const response = await fetch('https://www.yesno.wtf/api')
                    const data = await response.json()
                    console.log(data);
                    answer.value = data.answer
                })
                return {
                    question,
                    answer
                }
            }
        }).mount('#app')
    </script>
</body>
</html>
```

## 1.7 watchEffect
- 是watch函数的简化版本，也用来监视数据的变化
- watchEffect和watch的区别是，没有第二个回调函数的参数
- 接受一个函数作为参数，监听函数内响应式数据的变化，他会立即执行这个函数(类似watch开启和immediate)，当数据变化会重新运行该函数
- 他返回一个取消监听的函数


## 1.8 案列(ToDoList)-实现代办事项增删改，切换，存储等功能
项目结构
- main.js 入口文件
- App.vue

启动项目
npm run serve

### 1.8.1 添加代办事项
``` js
// 1. 添加待办事项
const useAdd = (todos) => {
  // 使用ref将input转换成带有value属性的响应式对象
  const input = ref("");
  // 添加代办事项
  const addTodo = () => {
    // 去除空格，并且不能为空
    const text = input.value && input.value.trim();
    if (text.length === 0) return;
    // 在最前面添加代办事项
    todos.value.unshift({
      text,
      completed: false, // 默认未完成
    });
    input.value = ""; // 清空input的值
  };
  return {
    input, // 代办事项输入框
    addTodo, // 添加代办事项方法
  };
};
```

### 1.8.2 删除代办事项
``` js
// 2. 删除待办事项
const useRemove = (todos) => {
  // 根据todo的下标删除
  const remove = (todo) => {
    const index = todos.value.indexOf(todo);
    todos.value.splice(index, 1);
  };
  // 删除已完成的代办事项
  const removeCompleted = () => {
    todos.value = todos.value.filter((todo) => !todo.completed);
  };
  return {
    remove, // 删除代办事项方法
    removeCompleted, // 删除已完成的代办事项方法
  };
};
```

### 1.8.3 编辑代办事项
``` js
// 3. 编辑待办项
const useEdit = (remove) => {
  // 存储编译之前的值
  let beforeEditingText = "";

  // 编辑的代办事项
  const editingTodo = ref(null);

  // 编辑代办事项方法
  const editTodo = (todo) => {
    beforeEditingText = todo.text;
    editingTodo.value = todo;
  };
  // 完成编辑
  const doneEdit = (todo) => {
    if (!editingTodo.value) return;
    todo.text = todo.text.trim();
    todo.text || remove(todo);
    editingTodo.value = null;
  };
  // 取消编辑
  const cancelEdit = (todo) => {
    editingTodo.value = null;
    // 回到编辑之前的值
    todo.text = beforeEditingText;
  };
  return {
    editingTodo, // 编译的单个代办事项对象
    editTodo, // 编辑代办事项方法
    doneEdit, // 完成编辑
    cancelEdit, // 取消编辑
  };
};
```
### 1.8.4 切换代办事项
``` js

// 4. 切换待办项完成状态
const useFilter = (todos) => {
  // 代办事项是否全部完成     （全选，全不选）
  const allDone = computed({
    get() {
      return !todos.value.filter((todo) => !todo.completed).length;
    },
    set(value) {
      todos.value.forEach((todo) => {
        todo.completed = value;
      });
    },
  });

  // 根据类型路劲过滤代办事项
  const filter = {
    all: (list) => list, // 所有代办事项
    active: (list) => list.filter((todo) => !todo.completed), // 未完成的代办事项列表
    completed: (list) => list.filter((todo) => todo.completed), // 已完成的代办事项列表
  };
  const type = ref("all"); // 显示的代办事项类型
  // 根据类型查找代办事项列表
  const filteredTodos = computed(() => filter[type.value](todos.value));
  // 未完成的代办事项个数
  const remainingCount = computed(() => filter.active(todos.value).length);
  // 代办事项总个数
  const count = computed(() => todos.value.length);

  // 监听hashchage事件，过滤代办事项
  const onHashChange = () => {
    const hash = window.location.hash.replace("#/", "");
    if (filter[hash]) {
      type.value = hash;
    } else {
      type.value = "all";
      window.location.hash = "";
    }
  };
  // 组件挂载完成添加监听事件
  onMounted(() => {
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
  });
  // 组件卸载之前移除监听事件
  onUnmounted(() => {
    window.removeEventListener("hashchange", onHashChange);
  });

  return {
    allDone, // 代办事项是否全部完成
    count, // 代办事项总数量
    filteredTodos, // 根据类型过滤代办事项
    remainingCount, // 未完成代办事项个数
  };
};
```

### 1.8.5 存储代办事项(localStorage)
``` js
// 5. 存储待办事项
const useStorage = () => {
  const KEY = "TODOKEYS";
  const todos = ref(storage.getItem(KEY) || []);
  // 使用watchEffect监听，只要代办事项改变就把代办事项保存到storage中
  watchEffect(() => {
    storage.setItem(KEY, todos.value);
  });
  return todos;
};
```

### 1.8.6 完整代码

``` vue
<template>
  <section id="app" class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <input
        class="new-todo"
        placeholder="What needs to be done?"
        autocomplete="off"
        autofocus
        v-model="input"
        @keyup.enter="addTodo"
      />
    </header>
    <section class="main" v-show="count">
      <input
        id="toggle-all"
        class="toggle-all"
        v-model="allDone"
        type="checkbox"
      />
      <label for="toggle-all">Mark all as complete</label>
      <ul class="todo-list">
        <li
          v-for="todo in filteredTodos"
          :key="todo"
          :class="{ editing: todo === editingTodo, completed: todo.completed }"
        >
          <div class="view">
            <input class="toggle" type="checkbox" v-model="todo.completed" />
            <label @dblclick="editTodo(todo)">{{ todo.text }}</label>
            <button class="destroy" @click="remove(todo)"></button>
          </div>
          <input
            class="edit"
            type="text"
            v-editing-focus="todo === editingTodo"
            v-model="todo.text"
            @keyup.enter="doneEdit(todo)"
            @blur="doneEdit(todo)"
            @keyup.esc="cancelEdit(todo)"
          />
        </li>
      </ul>
    </section>
    <footer class="footer" v-show="count">
      <span class="todo-count">
        <strong>{{ remainingCount }}</strong>
        {{ remainingCount > 1 ? "items" : "item" }} left
      </span>
      <ul class="filters">
        <li><a href="#/all">All</a></li>
        <li><a href="#/active">Active</a></li>
        <li><a href="#/completed">Completed</a></li>
      </ul>
      <button
        class="clear-completed"
        @click="removeCompleted"
        v-show="count > remainingCount"
      >
        Clear completed
      </button>
    </footer>
  </section>
</template>

<script>
import "./assets/index.css";
import useLocalStorage from "./utils/useLocalStorage";
import { ref, computed, onMounted, onUnmounted, watchEffect } from "vue";

const storage = useLocalStorage();

// 1. 添加待办事项
const useAdd = (todos) => {
  // 使用ref将input转换成带有value属性的响应式对象
  const input = ref("");
  // 添加代办事项
  const addTodo = () => {
    // 去除空格，并且不能为空
    const text = input.value && input.value.trim();
    if (text.length === 0) return;
    // 在最前面添加代办事项
    todos.value.unshift({
      text,
      completed: false, // 默认未完成
    });
    input.value = ""; // 清空input的值
  };
  return {
    input, // 代办事项输入框
    addTodo, // 添加代办事项方法
  };
};
// 2. 删除待办事项
const useRemove = (todos) => {
  // 根据todo的下标删除
  const remove = (todo) => {
    const index = todos.value.indexOf(todo);
    todos.value.splice(index, 1);
  };
  // 删除已完成的代办事项
  const removeCompleted = () => {
    todos.value = todos.value.filter((todo) => !todo.completed);
  };
  return {
    remove, // 删除代办事项方法
    removeCompleted, // 删除已完成的代办事项方法
  };
};

// 3. 编辑待办项
const useEdit = (remove) => {
  // 存储编译之前的值
  let beforeEditingText = "";

  // 编辑的代办事项
  const editingTodo = ref(null);

  // 编辑代办事项方法
  const editTodo = (todo) => {
    beforeEditingText = todo.text;
    editingTodo.value = todo;
  };
  // 完成编辑
  const doneEdit = (todo) => {
    if (!editingTodo.value) return;
    todo.text = todo.text.trim();
    todo.text || remove(todo);
    editingTodo.value = null;
  };
  // 取消编辑
  const cancelEdit = (todo) => {
    editingTodo.value = null;
    // 回到编辑之前的值
    todo.text = beforeEditingText;
  };
  return {
    editingTodo, // 编译的单个代办事项对象
    editTodo, // 编辑代办事项方法
    doneEdit, // 完成编辑
    cancelEdit, // 取消编辑
  };
};

// 4. 切换待办项完成状态
const useFilter = (todos) => {
  // 代办事项是否全部完成     （全选，全不选）
  const allDone = computed({
    get() {
      return !todos.value.filter((todo) => !todo.completed).length;
    },
    set(value) {
      todos.value.forEach((todo) => {
        todo.completed = value;
      });
    },
  });

  // 根据类型路劲过滤代办事项
  const filter = {
    all: (list) => list, // 所有代办事项
    active: (list) => list.filter((todo) => !todo.completed), // 未完成的代办事项列表
    completed: (list) => list.filter((todo) => todo.completed), // 已完成的代办事项列表
  };
  const type = ref("all"); // 显示的代办事项类型
  // 根据类型查找代办事项列表
  const filteredTodos = computed(() => filter[type.value](todos.value));
  // 未完成的代办事项个数
  const remainingCount = computed(() => filter.active(todos.value).length);
  // 代办事项总个数
  const count = computed(() => todos.value.length);

  // 监听hashchage事件，过滤代办事项
  const onHashChange = () => {
    const hash = window.location.hash.replace("#/", "");
    if (filter[hash]) {
      type.value = hash;
    } else {
      type.value = "all";
      window.location.hash = "";
    }
  };
  // 组件挂载完成添加监听事件
  onMounted(() => {
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
  });
  // 组件卸载之前移除监听事件
  onUnmounted(() => {
    window.removeEventListener("hashchange", onHashChange);
  });

  return {
    allDone, // 代办事项是否全部完成
    count, // 代办事项总数量
    filteredTodos, // 根据类型过滤代办事项
    remainingCount, // 未完成代办事项个数
  };
};

// 5. 存储待办事项
const useStorage = () => {
  const KEY = "TODOKEYS";
  const todos = ref(storage.getItem(KEY) || []);
  // 使用watchEffect监听，只要代办事项改变就把代办事项保存到storage中
  watchEffect(() => {
    storage.setItem(KEY, todos.value);
  });
  return todos;
};

export default {
  name: "App",
  setup() {
    const todos = useStorage();

    const { remove, removeCompleted } = useRemove(todos);

    return {
      todos,
      remove,
      removeCompleted,
      ...useAdd(todos),
      ...useEdit(remove),
      ...useFilter(todos),
    };
  },
  // 自定义指令
  directives: {
    // 只要有值就自动获取焦点
    editingFocus: (el, binding) => {
      binding.value && el.focus();
    },
  },
};
</script>

<style>
</style>

```