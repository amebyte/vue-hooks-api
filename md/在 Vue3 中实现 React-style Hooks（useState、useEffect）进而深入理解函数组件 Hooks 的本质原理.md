# 在 Vue3 中实现 React-style Hooks（useState、useEffect）进而深入理解函数组件 Hooks 的本质原理

### 前言

首先本文不会过度深入讲解只属于 React 或者只属于 Vue 的原理，所以只懂 React 或者只懂 Vue 的同学都可以畅通无阻地阅读本文。

关于 Vue3 的 React 式 Hooks 的实现原理和 React Hooks 的实现原理在社区里已经有很多讨论的文章了，希望本文可以给你不一样的角度去理解 React Hooks 的本质原理，也只有理解了 React Hooks 实现的本质原理，才可以在 Vue3 的函数式组件上实现跟 React Hooks 一样的 Hooks 函数，例如： useState、useReducer、useEffect 、useLayoutEffect 等。

关于 Vue3 的 React 式 Hooks，Vue.js 核心团队成员 Anthony Fu 也出了一个 Vue Hooks 工具库 VueUse，但本文不是去探讨 VueUse 的实现原理，而是通过实现一个 Vue3 函数式组件的 Hooks 去了解 React Hooks 的本质原理。本文更多的想探讨 React Hooks 的本质原理，同时在实现 Vue3  函数式组件 Hooks 的过程也进一步理解 Vue3 的运行原理和调度原理等。

Vue3 的函数式组件或许很多人了解得不多，因为 Vue 官方也不推荐使用，所以通过本文你不但可以了解 React Hooks 的原理，也希望给 Vue 阵营的同学也可以提供一下关于 Vue3 函数式组件的知识。

### 在 Vue3 函数式组件中的 React-style Hooks

我们先来看一段代码

```javascript
import { useState, useReducer, useEffect, useLayoutEffect } from "vue-hooks-api";

const FunctionalComponent = (props, context) => {
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useReducer((x) => x + 1, 1);
  const [count3, setCount3] = useReducer((x) => x + 1, 2);

  useEffect(() => {
    console.log("useEffect", count2);
  }, [count2]);

  useLayoutEffect(() => {
    console.log("useLayoutEffect", count2);
  }, [count2]);

  return (
    <>
      <button onClick={() => setCount1(2)} {...props}>
        count1:{count1}
      </button>
      <button onClick={() => setCount2()} {...props}>
        count2:{count2}
      </button>
      <button onClick={() => setCount3()} {...props}>
        count3:{count3}
      </button>
    </>
  );
};

export default FunctionalComponent;
```

React 的同学可能以为这是一个 React 的函数组件，其实不是，这是一个 Vue3 的函数式组件，通过 `vue-hooks-api` 包提供的 `useState`, `useReducer`, `useEffect`, `useLayoutEffect` 的 Hooks 函数，就可以在 Vue3 的函数式组件中使用了，再通过 JSX 方式使用则看起来基本可以跟 React Hooks 一样了。

**关于 vue-hooks-api npm 包**

`vue-hooks-api` npm 包是本文作者发布的一个 React 风格的 Vue3 Hooks 包，目前只可使用于 Vue3 函数式组件，跟 React 的函数式组件的 Hooks 使用方式一致。

可以通过 yarn 方式安装体验。

```
yarn add vue-hooks-api
```

注意，此 npm 包目前只是一个实验性产品，旨在探讨如何在 Vue3 的函数组件中实现 React 式的函数组件 Hooks，请慎用于生产环境。

下文也将围绕这个 `vue-hooks-api` npm 包是如何实现的进行讲解。

### Hooks 是什么

首先 Hooks 不是 React 特有，比如我们使用的 Git 工具，也有 Git Hooks，在把代码 push 到远程仓库之前，可以设置 Git Hooks 插件进行代码检查、代码测试，通过了 Git Hooks 的处理之后才可以把代码 push 到远程仓库。

有 Hooks 的程序就像高速公路上的收费站，如果某个地方设置了收费站，那么你必须要经过收费站的处理，你才可以继续通行。没有 Hooks 的程序就像国道，你可以一路畅通无阻地通行。

  ![](./images/01.png)

Hooks 的英文翻译是 “钩子”，Vue、React 的那些生命周期函数，也被称为钩子函数，所以 Vue、React 生命周期函数也是 Hooks 函数。

继续上面高速公路收费站的例子，那么收费站就相当于这条高速公路的一个个钩子，把这条高速公路的某个点勾住了，那么就可以在这个地点进行很多事情的处理了，比如说检查车辆，那么你可以设置只检查大货车或者小汽车，又或者节假日什么事情都不做，让所有车辆免费通行。

那么又回到 Vue、React 上面来，Vue、React 提供了很多生命周期的 Hooks，你可以在这些 Hooks 上进行各种设置，比如 Vue3 的 setup 方法就是 Vue2 的生命周期函数 beforeCreate 和 Created 两个钩子函数的代替。

了解一些前置知识之后，我们开始进入我们本文的核心 React Hooks 的理解。

### React Hooks 的本质

首先 React Hooks 只可以使用在 React 的函数组件上，在 React Hooks 出现之前 React 的函数组件是不可以存储属于自己的数据状态的，因故也不可以进行数据逻辑的复用。直到 React Hooks 的出现，在 React 的函数组件上就可以进行存储属于它自己的数据状态了，进而可以达到数据逻辑的复用。这也是 React Hooks 的作用，可以进行数据逻辑的复用。

那么为什么 React 可以做到在函数组件上进行存储数据状态的呢？首先 **React 函数组件的本质是一个函数**，React   函数的更新就是重新执行 React 函数组件得到新的虚拟 DOM 数据。那么要在 React 函数组件上存储属于这个函数组件自己的数据，本质就是在一个函数上存储属于这个函数的数据，在这个函数的后续执行的时候还可以获取到它自己内部的变量数据，并且不会和其他函数组件的内部的变量数据发生冲突，**这其中最好的实现方式就是实现一个闭包函数**。

**React Hooks 的最简模型**

```javascript
// Hooks
function useReducer(reducer, initalState) {
    let hook = initalState
    const dispatch = (action) => {
        hook = reducer(hook, action)
        // 关键，执行 setCount 函数的时候会重新执行 FunctionComponent 函数
        FunctionComponent()
    }
    return [hook, dispatch]
}
// 函数组件
function FunctionComponent() {
   const [count, setCount] = useReducer(x => x + 1, 0)
    
   return {count, setCount}
}

const result = FunctionComponent()
// 执行 setCount 会从新执行 FunctionComponent
result.setCount()
```

通过上面 React Hooks 的最简模型可以知道执行组件函数 FunctionComponent 可以看成从 Hooks 返回了两个变量 count 和 setCount，count 很明显是拿来展示使用的，setCount 则是拿来给用户交互使用的，当用户执行 setCount 的时候 FunctionComponent 会重新执行。其中关键的就是hi执行 setCount 函数的时候会重新执行 FunctionComponent 函数。

上述 React Hooks 的最简模型还存在一个问题，当用户执行 setCount 的时候 FunctionComponent 重新执行的时候，hook 会被一直初始化，值不能进行迭代。那么我们知道 React 当中一个函数组件就是一个 Fiber 节点，所以可以把 hook 存储在 Fiber 节点上。因为 Fiber 节点变量相对于这个 Hook 函数来说，就是一个全局变量。

```javascript
// Fiber 节点
const Fiber = {
    type: FunctionComponent, // Fiber 节点上的 type 属性是组件函数
    memorizedState: null // Fiber 节点上的 memorizedState 属性是 Hooks
}
// Hooks
function useReducer(reducer, initalState) {
    // 初始化的时候，如果 Fiber 节点的 Hooks 不存在则进行设置
    if(!Fiber.memorizedState) Fiber.memorizedState = initalState
    const dispatch = (action) => {
        Fiber.memorizedState = reducer(Fiber.memorizedState, action)
        // 关键，执行 setCount 函数的时候会重新执行 FunctionComponent 函数
        Fiber.type()
    }
    return [Fiber.memorizedState, dispatch]
}
// 函数组件
function FunctionComponent() {
    const [count, setCount] = useReducer(x => x + 1, 0)
    console.log("渲染的count:", count) 
    return {count, setCount}
}

const result = Fiber.type() // 打印 0
// 执行 setCount 会从新执行 FunctionComponent
result.setCount() // 打印 1
result.setCount() // 打印 2
result.setCount() // 打印 3
```

经过上述代码修改之后，一个最简单的 React Hooks 的模型就实现完成了，这也是 React Hooks 的本质。值得注意的是其中 reducer 的实现跟 Redux 的 reducer 的实现是很相似的，这是因为它们是同一个作者开发的功能的缘故。

### 闭包函数在 React Hooks 中的实践

上面的代码实现还存在一个问题，就是 useReducer 函数里的 dispatch 方法里面的 Fiber 变量目前是全局的，如果有其他函数组件也使用了 useReducer Hook 的时候，dispatch 方法里的 Fiber 变量就变成其他函数的 Fiber 节点了，之前的函数组件里再调用 dispatch 方法的时候，将不再是原来的 Fiber 节点了。所以我们需要在初始化的时候把 dispatch 方法里面的每一个 Fiber 缓存起来，将来调用的时候，还是原来的 Fiber 节点。

上述的功能要求，其实就是闭包的参数复用的功能。

```javascript
function Fn(p1) {
    return function (p2) {
        console.log(p1, p2)
    }
}

const f1 = Fn('coboy')
f1() // 打印 coboy undefined
f1('掘金') // 打印 coboy 掘金
const f2 = Fn('cobyte')
f2() // 打印 cobyte undefined
f2('稀土掘金') // 打印 cobyte 稀土掘金
```

React 中的实现则非常巧妙了

```javascript
function Fn(p1, p2) {
    console.log(p1, p2)
}

const f = Fn.bind(null, 'coboy')
f() // 打印 coboy undefined
f('掘金') // 打印 coboy 掘金
```

这其中是什么原理呢？首先 bind 方法是一个可以改变一个函数 this 指向的方法，在绑定的时候可以传递一些参数，然后返回一个函数，然后在这个返回的函数再次执行的时候，还可以传递参数，这行为动作不就是一个典型的闭包行为嘛。

关于 bind 方法的实现原理可以看我掘金上的这篇文章《[JavaScript 中的 this 实战例题总结分析](https://juejin.cn/post/7105756630519644168)》，我在里面有详细讲解 bind 方法的实现原理。

接下来我们对 useReducer 里面的 dispatch 函数的实现进行改动。

```javascript
// Fiber 节点
const Fiber = {
    type: FunctionComponent, // Fiber 节点上的 type 属性是组件函数
    memorizedState: null // Fiber 节点上的 memorizedState 属性是 Hooks
}
// 改动部分开始 ===============================================================
function useReducer(reducer, initalState) {
    // 初始化的时候，如果 Fiber 节点的 Hooks 不存在则进行设置
    if(!Fiber.memorizedState) Fiber.memorizedState = initalState
    const dispatch = dispatchReducerAction.bind(null, Fiber, reducer)
    return [Fiber.memorizedState, dispatch]
}
// 参数 action 就是 dispatch 函数执行的时候传递进来的参数
function dispatchReducerAction(fiber, reducer, action) {
    fiber.memorizedState = reducer ? reducer(fiber.memorizedState) : action;
    fiber.type()
}
// 改动部分结束 ===============================================================
// 函数组件
function FunctionComponent() {
    const [count, setCount] = useReducer(x => x + 1, 0)
    console.log("渲染的count:", count) 
    return {count, setCount}
}

const result = Fiber.type() // 打印 0
// 执行 setCount 会从新执行 FunctionComponent
result.setCount() // 打印 1
result.setCount() // 打印 2
result.setCount() // 打印 3
```

我们可以看到 dispatchReducerAction 方法有一个 action 参数是在进行 bind 方法绑定的时候没有进行设置的，那么这个 action 参数是在什么时候设置的呢？我们上面的注释已经进行解析了，是在 dispatch 函数执行的时候设置的。也就是上述代码中的 `result.setCount()` 方法执行的时候，还可以传递参数，例如这样：`result.setCount('cobyte')`，这个其实就是 Hook 函数 `useState()` 方法做的事情。

### useState 的实现

useState 的实现其实很简单，就是在 useReducer 的基础上实现的。

```javascript
function useState(initalState) {
  return useReducer(null, initalState);
}

function FunctionComponent() {
    const [count, setCount] = useState(0)
    console.log("渲染的count:", count) 
    return {count, setCount}
}

const result = Fiber.type() // 打印 0
// 执行 setCount 会从新执行 FunctionComponent
result.setCount(2) // 打印 2
result.setCount(3) // 打印 3
result.setCount('cobyte') // 打印 cobyte
```

useState 就是一个没有 reducer 参数的 useReducer。

### 承上启下的小节

到目前为止，我们已经基本搞清楚 React Hooks 的实现最基本的原理了，但经常出现在各大面经中的 React Hooks 链接，我们还没涉及到。在上面的代码中，我们只在函数组件里使用了一个 Hooks，但实际开发中，我们是会同时使用多个 Hooks 的，使用到多个 Hooks 的时候，怎么存储这些 Hooks 就是一个值得思考的问题了，而 React 中就使用了 链表来存储这些 Hooks，那么下面让我们进入 React Hooks 的链表环节吧。

### React Hooks 的链表

在实际开发中，我们是会同时使用多个 Hooks 的。例如：

```javascript
// 函数组件
function FunctionComponent() {
    const [count1, setCount1] = useReducer(x => x + 1, 0)
    const [count2, setCount2] = useReducer(x => x + 1, 0)
    console.log("渲染的count1:", count1) 
    console.log("渲染的count2:", count2)
    return {count1, setCount1, count2, setCount2}
}
```

那么在使用多个 Hooks 的时候，我们又怎么去存储这些 Hooks 呢？我们知道在 React Hooks 中是把所有的 Hooks 设置成了一个链表结构的数据，那么其中的原理又是怎么样的呢？

链表的基本思维是，利用结构体的设置，额外开辟出一份内存空间去作指针，该指针总是指向下一个节点，一个个节点通过 Next 指针相互串联，就形成了链表。

 ![](./images/02.png)

其中 Data 为自定义的数据，Next 为指向下一个链表节点的指针，通过访问 Next，就可以访问链表的下一个节点了。 

链表的结构有很多种，React 中的链接结构属于：**不带头单向非循环结构** 。我们可以把这种链表理解成为一个火车，每个链表，其实就是一节车厢，数据存储在车厢中中，而每个火车节都有一个指针，连接着下一个火车节 。

 ![](./images/03.png)

那么在 React 使用代码怎么来实现这个链表数据结构呢？

我们通过上文知道 Hook 存储在 Fiber 节点的 memorizedState 属性上的，Hook 的数据结构也可以通过上文得知可以这样设置：

```javascript
const hook = {
      memorizedState: null, // 存储 hook 
      next: null,  // next 指针，指向下一个 hook
}
```

我们可以设置一个中间变量 workInProgressHook 来存储当前的尾 hook 是哪一个，当有新的 hook 进来的时候，可以通过当前的尾 hook 的 next 指针指向它，那么这个新的 hook 成了新的尾 hook，所以 workInProgressHook 中间变量需要更新成新的 hook。当再有新的 hook 进来的时候，则可以通过 workInProgressHook 是否有值进行判断是不是头节点的 hook，如果 workInProgressHook 有值则把新的 hook 存储在 workInProgressHook 的 next 指针上。

那么代码的实现：

```javascript
// hook 的中间变量，可以理解为正在工作的 hook 或尾 hook
let workInProgressHook = null
// 获取或创建 hook 的函数
function updateWorkInProgressHook() {
    hook = {
      memorizedState: null,
      next: null,
    };
    
    if (workInProgressHook) {
      // 如果有尾 hook 则说明不是头节点 hook
      workInProgressHook = workInProgressHook.next = hook;
    } else {
      // 如果没有尾 hook 则说明是头节点 hook
      workInProgressHook = Fiber.memorizedState = hook;
    }
    
    return hook
}
```
那么更新的时候，也就是再次进行执行函数组件 FunctionComponent 的时候怎么去获取对应的 hook 呢？
在 React 当中当渲染组件之后会把当前的 Fiber 节点信息设置到 Fiber 的 alternate 属性上，所以我们可以通过判断当前 Fiber 节点是否存在 alternate 来判断当前是属于更新阶段还是初始化阶段，如果是初始化阶段，那么我们就去 Fiber 的 alternate 属性上获取相应的 hook。


```javascript
// hook 的中间变量，可以理解为正在工作的 hook 或尾 hook
let workInProgressHook = null
// 获取或创建 hook 的函数
function updateWorkInProgressHook() {
  // 获取旧 Fiber
  const current = Fiber.alternate;
  let hook;
  // 如果存在旧 Fiber 则是更新阶段
  if (current) {
    Fiber.memorizedState = current.memorizedState;
    if (workInProgressHook) {
      // 如果有尾 hook 则说明不是头节点 hook
      hook = workInProgressHook = workInProgressHook.next;
    } else {
      // 如果没有尾 hook 则说明是头节点 hook
      hook = workInProgressHook = current.memorizedState;
    }
  } else {
    // 没有旧 Fiber 则是初始化阶段
    hook = {
      memorizedState: null,
      next: null,
    };

    if (workInProgressHook) {
      // 如果有尾 hook 则说明不是头节点 hook
      workInProgressHook = workInProgressHook.next = hook;
    } else {
      // 如果没有尾 hook 则说明是头节点 hook
      workInProgressHook = Fiber.memorizedState = hook;
    }
  }

  return hook;
}
```
### 如何理解 React Hooks 的使用限制

React 的同学都知道 React 官方是有对 Hooks 的使用是有规则限制的，其中一条就是**只在最顶层使用 Hook，不要在循环，条件或嵌套函数中调用 Hook**。为什么要有这条限制呢？其实主要是想确保 Hook 在每一次渲染中都按照同样的顺序被调用。如果不按顺序执行会怎么样呢？下面我们使用伪代码来模拟一下。

例如下面的 Hook 调用：

```javascript
let flag = true
// 函数组件
function FunctionComponent() {
    const [count1, setCount1] = useReducer(x => x + 1, 0)
    if(flag) const [count2, setCount2] = useReducer(x => x + 1, 1)
    const [count3, setCount3] = useReducer(x => x + 1, 2)
    flag = false
    return {...}
}
```

上面代码在初始化的时候会产生三个 Hooks，依次保存在 Fiber 的 memorizedState 属性上，我们使用伪代码模拟一下：

```javascript
Fiber.memorizedState = {
    memorizedState: count1,
    next: {
        memorizedState: count2,
        next: {
            memorizedState: count3,
            next: null,
        },
    },
}
```
在更新的时候，第二个位置的 hook 不执行了，原来属于是第三个位置的 hook 排到第二的位置上了，所以它获取到的是原来第二个位置的 hook, 而不是第三个位置的 hook，如果后面有更多的 hook，顺序都会乱掉，所以 hook 要保证按顺序执行。

### 为什么 React Hooks 要使用链表结构来实现

其实 React Hooks 并不一定要使用链表结构来实现，也可以使用其他数据结构来实现，链表只是其中一种。React 团队似乎很偏爱底层的实现，比如链表、循环链表，连数组都用的都不多。对底层来说，链表的性能比较高，比如，数组相当于你需要的是连续空间，而链表不需要，那么对于系统来说，肯定是非连续空间更容易获得，而且节约空间。当然对于现在的电脑来说，我们都不是特别在乎空间，所以经常使用空间换时间。

React 官方成员 dan 则曾经说过，主要是因为自定义 Hooks，容易命名冲突。具体中文翻译的文章链接地址在[这里](https://overreacted.io/zh-hans/why-do-hooks-rely-on-call-order/)

### useEffect 、useLayoutEffect 的实现原理
useEffect 、useLayoutEffect 的使用方式是一样的，都是接收两个参数，第一个参数是回调函数，第二个参数是一个数组，里面放一些依赖变量，在更新的时候会去判断这些依赖变量是否发生变化来决定是否需要执行回调函数。最大的区别就是执行的时机不同，useLayoutEffect 组件函数渲染完成后立即执行，而 useEffect 则是异步执行的，需要等到下一轮的宏任务执行的时候再去执行。

**useEffect 、useLayoutEffect 的最简实现模型**

```javascript
// Fiber 节点
const Fiber = {
    type: FunctionComponent, // Fiber 节点上的 type 属性是组件函数
    effect: [],
    layoutEffect: []
}
// 函数组件
function FunctionComponent() {
    useEffect(() => {
        console.log("effect")
    })
    useLayoutEffect(() => {
        console.log("useLayoutEffect")
    })
}
// useEffect Hook
function useEffect(create) {
    Fiber.effect.push(create)
}
// useLayoutEffect Hook
function useLayoutEffect(create) {
    Fiber.layoutEffect.push(create)
}
// 执行函数组件的渲染
Fiber.type()

// 渲染完成后的处理
for(let i = 0; i < Fiber.layoutEffect.length; i++) {
    const create = Fiber.layoutEffect[i]
    // useLayoutEffect 的回调函数立即执行
    create()
}
for(let i = 0; i < Fiber.effect.length; i++) {
    const create = Fiber.effect[i]
    // useEffect 的回调函数进行异步调用执行
    setTimeout(() => {
        create()
    })
}

// 最后的打印顺序是 useLayoutEffect effect 
```

那么到这里，我们就要了解一下 React 的运行流程才可以继续进行下去了。

**简述 React 运行流程**

首先一开始跟 Vue 一样把根组件生成一棵虚拟 DOM 树，然后再去把这棵虚拟 DOM 树进行协调成一棵 Fiber 树，其中函数组件也被协调成一个 Fiber 节点，等到执行到函数组件这个 Fiber 节点时候，则判断到这是一个函数组件的 Fiber 节点，那么就会去执行函数组件的相关逻辑。

那么在执行函数组件相关逻辑之前的时候，就要对 Hooks 进行相关的初始化了。

```javascript
// currentlyRenderingFiber 表示当前的执行任务的 Fiber
const currentlyRenderingFiber = null
// 正在工作的 Hook，也就是尾 Hook
const workInProgressHook = null
// 初始化 Hooks 的函数
export function renderHooks(wip) {
    currentlyRenderingFiber = wip
    currentlyRenderingFiber.memorizedState = null
    // 初始化 Effect hooks 的属性值
    currentlyRenderingFiber.updateQueueOfEffect = []
    // 初始化 layoutEffect hooks 的属性值
    currentlyRenderingFiber.updateQueueOfLayoutEffect = []
    workInProgressHook = null
}
```

这里的 currentlyRenderingFiber 有点像 Vue 当中的组件实例对象，相当于一个管家的角色。在进行 Hook 的初始化之后，则执行函数组件，因为函数组件本质是一个函数，所以它是可以执行的。组件函数就存储在 Fiber 的 type 属性上，实质就是执行 `Fiber.type()` 。如果组件函数里面使用了 useEffect 和 useLayoutEffect Hook 的话，就再去执行 useEffect 和 useLayoutEffect 的相关函数。

那么下面我们就来看看 useEffect 和 useLayoutEffect 的相关函数的实现。

```javascript
// 定义两个二进制变量标识不同的 effect hook
const HookLayout = 0b010;
const HookPassive = 0b100;

// useEffect hook
function useEffect(create, deps) {
  return updateEffectImp(HookPassive, create, deps);
}
// useLayoutEffect hook
function useLayoutEffect(create, deps) {
  return updateEffectImp(HookLayout, create, deps);
}
// effect 具体实现函数
function updateEffectImp(hookFlags, create, deps) {
    // 先获取 hook
    const hook = updateWorkInProgressHook()
    // 创建 effect 对象
    const effect = {hookFlags, create, deps}
    // 把 effect 对象赋值给 hook 的 memorizedState 属性，等到将来更新的时候需要获取使用
    hook.memorizedState = effect
	// 往 Fiber 上存储 effect 对象
    if(hookFlags & HookPassive) {
        // 在初始化的时候已经把 updateQueueOfEffect 设置成了一个空数组了，所以在这里可直接使用数组方法 push 进行添加元素
        Fiber.updateQueueOfEffect.push(effect)
    } else if(hookFlags & HookLayout){
        // 在初始化的时候已经把 updateQueueOfLayoutEffect 设置成了一个空数组了，所以在这里可直接使用数组方法 push 进行添加元素
        Fiber.updateQueueOfLayoutEffect.push(effect)
    }
}
```

这里最主要的是 updateEffectImp 函数的实现，updateEffectImp 函数主要把 useEffect、useLayoutEffect 的参数存储到 Fiber 对象上。其实这里的实现和 React 源码的实现是有差别的，但我们主要是为了表达原理，就不跟源码一样了，不然太复杂。但即使再复杂，它的基本原理是一样的，就是把 useEffect、useLayoutEffect 的参数存储到 Fiber 对象上。

那么把 useEffect、useLayoutEffect 的参数存储到 Fiber 对象上之后，在什么时候调用它们呢？这里又要说一下 React 的运行原理了，React 在使用 Fiber 架构之后，协调节点和渲染更新节点是异步的，而 Vue 则是同步的。所以在执行函数组件，并处理函数组件内的所有使用的 Hooks 的这一系列操作是在 React 的协调阶段。等到渲染更新阶段再进行处理在协调阶段设置的一系列动作，比如我们上面 useEffect、useLayoutEffect 设置在函数组件 Fiber 节点上的回调函数，便这渲染更新这一阶段进行一定规则的调用处理。具体的规则就是我们前面说到的，useLayoutEffect 组件函数渲染完成后立即执行，而 useEffect 则是异步执行的，需要等到下一轮的宏任务执行的时候再去执行。

伪代码模拟实现一下：

```javascript
// 在更新之后调用设置在 Fiber 节点上的 Hooks
function invokeHooks(wip) {
    const {updateQueueOfEffect, updateQueueOfLayoutEffect} = wip
    for(let i = 0; i < updateQueueOfLayoutEffect.length; i++) {
        const effect = updateQueueOfLayoutEffect[i]
        // useEffect 会立即执行
        effect.create();
    }

    for(let i = 0; i < updateQueueOfEffect.length; i++) {
        const effect = updateQueueOfEffect[i]
        // useEffect 是通过 React 的调度器进行处理的，而这个调度器最终是通过一个宏任务进行调用的
        scheduleCallback(() => {
            effect.create();
        })
    }
}
```

关于 React 调度器相关的内容这里就不进行展开讨论了，以后有机会再进行讨论。



### 小结：简述 React Hooks 的实现原理

React Hooks 的实现原理就是把相应的函数组件里面使用的 Hooks 产生的状态逻辑数据**通过链表形式**挂载到对应的函数组件的 Fiber 节点上。其中 **useState 是在 useReducer 的基础上实现的**，useReducer 里面返回的 dispatch 函数是**通过闭包的形式**把相应的 Fiber 节点进行了缓存，在将来用户进行调用相应的 dispatch 函数时，依然可以触发对应的函数组件的 Fiber 节点进行更新。

useEffect、useLayoutEffect 的实现方式是基本一致的，它们的主要区别是它们的回调函数的执行时机的不同。useLayoutEffect 是在函数组件渲染完成后立即调用的，而 useEffect 的回调函数则是进行一个异步的宏任务的调度，也就是在下一轮的任务执行的时候才进行调用。



接下来我们进行如何在 Vue3 的函数组件中实现 React 式的函数组件 Hooks 部分的内容。在开始之前，我们先了解一下 Vue3 函数组件的一些相关知识。

### Vue3 的函数组件

函数式组件是自身没有任何状态的组件的另一种形式。此话怎么理解呢？

我们普通的组件形式是这样的：

```javascript
const App = {
    setup() {
        // ...
    },
    render() {
        // ...
    }
}
```

而函数组件就是一个函数：

```javascript
const FunctionalComponent = (props, context) => {
	// ...
}
```

无论是普通的对象形式的组件还是函数形式的组件都是存储在虚拟 DOM 的 type 属性上的，然后在创建虚拟 DOM 之后，会对虚拟 DOM 的 type 属性进行判断，如果是对象则给虚拟 DOM 的 shapeFlag 属性挂上一个 `ShapeFlags.STATEFUL_COMPONENT`  的标记，表示这是一个状态组件，如果虚拟 DOM 的 type 属性是函数的话则给虚拟 DOM 的 shapeFlag 属性挂上一个 `ShapeFlags.FUNCTIONAL_COMPONENT` 的标记，表示这是一个函数组件。在将来执行的时候如果是状态组件就执行状态组件的 render 函数获取组件的虚拟 DOM，如果是组件函数则直接执行它自己获取组件的虚拟 DOM。

### 如何在 Vue3 的函数组件中实现 React 式的函数组件 Hooks

通过上文我们了解了 React 的 Hooks 的实现基本原理，就是把 Hooks 的相关信息存储到相应的函数组件的 Fiber 节点上，那么对应过来 Vue3 这样边呢？这就需要我们了解一下 Vue3 的组件运行原理了。其中详细可以通过我这篇掘金文章《[大话Vue3的源码的主流程解析](https://juejin.cn/post/7051947597434470408)》进行了解。

不管我们写的是 SFC 组件还是 JSX 组件，最终会被编译成一个对象，这个对象上就有我们设置的 setup 方法，还有 render 方法，其中 SFC 组件的 render 是通过 template 模板编译出来的。然后再创建这个组件的虚拟DOM，再去渲染这个渲染 DOM，然后在渲染这个虚拟 DOM 的时候，如果是组件类型的虚拟 DOM 则需要创建组件实例，然后再执行组件实例上 render 方法获取组件的虚拟 DOM，然后再去渲染这个虚拟DOM，直到把所有的虚拟 DOM 渲染完毕，最后浏览器展示渲染的内容。

在这其中有一个关键的点就是渲染组件的时候会创建一个组件实例，这个跟 React 的函数组件的 Fiber 对象其实是相同的角色的，都是一个管家，管理着这个组件的相关状态和动作。那么 React Hooks 是把相关 Hooks 信息保存在 Fiber 节点上的，那么 Vue3 则可以把 Hooks 相关信息保存到组件的实例对象上。



### React 的调度任务为什么选择使用 MessageChannel 实现

首先是为了产生宏任务，因为只要宏任务才可以做到让出当前的主线程，交还给浏览器执行更新页面的任务，在浏览器执行完更新页面之后，可以继续执行未完成的任务。而微任务是在当前任务执行的最后执行的，而且需要执行完当前执行栈产生的所有微任务才会把主线程让给浏览器，这样就做不到 React 需要实现的效果了，每执行一个更新任务，需要把这个更新任务更新的页面内容呈现给用户之后，再进行下一个更新任务。

为什么不使用 setTimeout 呢？因为 setTimeout(fn, 0) 默认就会存在 4ms 的延迟，在追求极致性能的 React 团队来说，这是不可接受的。

为什么不使用 requestAnimationFrame 呢？因为 requestAnimationFrame 是一帧只执行一次。这是什么概念呢？主流浏览器刷新频率为60Hz，即每（1000ms / 60Hz）16.6ms 浏览器刷新一次。也就是说使用 requestAnimationFrame 的话，就可能会产生 16.6ms 的延迟，这比 setTimeout 的默认 4ms 的延迟造成的性能浪费更大了。有 4ms 延迟的 setTimeout，React 团队都不能接受，那么高达 16.6ms 延迟的 requestAnimationFrame，React 团队更不可能接受了。另外 requestAnimationFrame 也存在兼容性问题，所以更不可能使用 requestAnimationFrame 了。

在 Vue3 中是没有宏任务的，Vue3 的异步任务，例如：nextTick 是一个微任务，所以使用 nextTick 是没办法达到我们想要的效果的，同时为了还原跟 React 一样，我们同样使用 MessageChannel 来进行 useEffect 的异步回调。

```javascript
const postMessage = (create) => {
  const { port1, port2 } = new MessageChannel();
  port1.onmessage = () => {
    create();
  };
  port2.postMessage(null);
};
```

### 总结


