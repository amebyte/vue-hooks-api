import { getCurrentInstance, watchEffect } from "vue";

// useLayoutEffect 的标记
const HookLayout = /*    */ 0b010;
// useEffect 的标记
const HookPassive = /*   */ 0b100;

// 当前的渲染的 Fiber 节点，对应 Vue 中则是当前渲染的组件函数的实例
let currentlyRenderingFiber: any = null;
// 当前正在工作的 Hook 节点
let workInProgressHook: any = null;
// 前一个 Hook
let currentHook: any = null;

function scheduleUpdateOnFiber(wip: any) {
  currentlyRenderingFiber.alternate = { ...currentlyRenderingFiber };
  renderHooks(wip);
  currentlyRenderingFiber.update();
}

function renderHooks(wip: any) {
  currentlyRenderingFiber = wip;
  currentlyRenderingFiber.memorizedState = null;
  workInProgressHook = null;
}

function updateWorkInProgressHook() {
  const instance = getCurrentInstance() as any;
  if (
    !currentlyRenderingFiber ||
    currentlyRenderingFiber.uid !== instance.uid
  ) {
    renderHooks(instance);
  }

  const current = currentlyRenderingFiber.alternate;
  let hook;
  if (current) {
    currentlyRenderingFiber.memorizedState = current.memorizedState;
    if (workInProgressHook) {
      // not head
      hook = workInProgressHook = workInProgressHook.next;
      currentHook = currentHook.next;
    } else {
      // head hook
      hook = workInProgressHook = current.memorizedState;
      currentHook = current.memorizedState;
    }
  } else {
    currentHook = null;
    hook = {
      memorizedState: null,
      next: null,
    };

    if (workInProgressHook) {
      // not head
      workInProgressHook = workInProgressHook.next = hook;
    } else {
      // head hook
      workInProgressHook = currentlyRenderingFiber.memorizedState = hook;
    }
  }

  return hook;
}

export function useState(initalState: any) {
  return useReducer(null, initalState);
}

export function useReducer(reducer: any, initalState: any) {
  const hook = updateWorkInProgressHook();

  if (!currentlyRenderingFiber.alternate) {
    hook.memorizedState = initalState;
  }

  const dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    hook,
    reducer
  );

  return [hook.memorizedState, dispatch];
}

function dispatchReducerAction(
  fiber: any,
  hook: any,
  reducer: any,
  action: any
) {
  hook.memorizedState = reducer ? reducer(hook.memorizedState) : action;
  scheduleUpdateOnFiber(fiber);
}

function updateEffectImp(hookFlags: any, create: any, deps: any) {
  const hook = updateWorkInProgressHook();
  if (currentHook) {
    const prevEffect = currentHook.memorizedState;
    if (deps) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(deps, prevDeps)) {
        return;
      }
    }
  }
  const effect = { hookFlags, create, deps };
  hook.memorizedState = effect;

  invokeHooks(hookFlags, hook);
}

export function useEffect(create: any, deps: any) {
  return updateEffectImp(HookPassive, create, deps);
}

export function useLayoutEffect(create: any, deps: any) {
  return updateEffectImp(HookLayout, create, deps);
}

function areHookInputsEqual(nextDeps: any, prevDeps: any) {
  if (prevDeps === null) {
    return false;
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function invokeHooks(hookFlags: any, hook: any) {
  if (hookFlags & HookPassive) {
    postMessage(hook.memorizedState.create);
  } else if (hookFlags & HookLayout) {
    watchEffect(hook.memorizedState.create, { flush: "post" });
  }
}

const postMessage = (create: any) => {
  const { port1, port2 } = new MessageChannel();
  port1.onmessage = () => {
    create();
  };
  port2.postMessage(null);
};
