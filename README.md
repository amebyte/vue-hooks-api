# vue-hooks-api
Experimental React hooks implementation in Vue3

### install

```
yarn add vue-hooks-api
```

### React-style Hooks

```javascript
import { useReducer, useEffect, useLayoutEffect } from "vue-hooks-api";

const FunctionalComponent = (props, context) => {
  const [count1, setCount1] = useReducer((x) => x + 1, 0);
  const [count2, setCount2] = useReducer((x) => x + 1, 1);

  useEffect(() => {
    console.log("useEffect", count2);
  }, [count2]);

  useLayoutEffect(() => {
    console.log("useLayoutEffect", count2);
  }, [count2]);

  return (
    <>
      <button onClick={() => setCount1()} {...props}>
        count1:{count1}
      </button>
      <button onClick={() => setCount2()} {...props}>
        count2:{count2}
      </button>
    </>
  );
};

export default FunctionalComponent;
```

