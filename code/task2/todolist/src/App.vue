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
    allDone,
    count,
    filteredTodos,
    remainingCount,
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
