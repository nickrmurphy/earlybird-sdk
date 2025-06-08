import { createFileRoute } from "@tanstack/react-router";
import {
  createCapacitorAdapter,
  createClient,
  createStore,
} from "@earlybird-sdk/store";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { useCallback, useEffect, useState } from "react";
import { scheduleTask } from "@/utils/createTaskOrchestrator";

export const Route = createFileRoute("/")({
  component: App,
});

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  meta: {
    author: string;
    createdAt: string;
  };
  tags: string[];
};

const storageAdapter = createCapacitorAdapter({
  directory: Directory.Data,
  encoding: Encoding.UTF8,
  fs: Filesystem,
});

type Events = "push";
const store = createStore<Todo, Events>(storageAdapter, "todos");

const client = createClient(store, {
  baseUrl: "http://localhost:3000",
});

store.addOnMutate("push", async () => {
  await Promise.all([client.pull(), client.push()]);
});

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);

  const fetchTodos = useCallback(async () => {
    const todos = await store.all();
    setTodos(todos);
  }, []);

  const fetchCompletedTodos = useCallback(async () => {
    const completedTodos = await store.where((item) => item.completed);
    setCompletedTodos(completedTodos);
  }, []);

  useEffect(() => {
    store.addOnMutate("todos-mutate", async () => {
      await Promise.all([fetchTodos(), fetchCompletedTodos()]);
    });

    return () => {
      store.removeOnMutate("todos-mutate");
    };
  }, []);

  useEffect(() => {
    const syncTask = scheduleTask(
      async () => {
        await Promise.all([client.pull(), client.push()]);
        await Promise.all([fetchTodos(), fetchCompletedTodos()]);
      },
      {
        interval: 5_000,
        onlyWhenVisible: true,
      },
    );

    return () => {
      syncTask.cancel();
    };
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchCompletedTodos();
  }, [fetchTodos, fetchCompletedTodos]);

  const addTodo = async () => {
    const id = crypto.randomUUID();
    await store.insert(id, {
      title: `Todo ${id}`,
      completed: false,
      meta: { author: "Anonymous", createdAt: new Date().toISOString() },
      tags: ["demo"],
    });
  };

  const toggleTodo = async (todo: Todo) => {
    await store.update(todo.id, { completed: !todo.completed });
  };

  return (
    <div className="text-center p-4 max-w-screen-md mx-auto flex-col gap-5">
      <h1 className="text-xl font-bold">Demo by Early Bird</h1>
      <p className="text-gray-600 my-3">Todos sync every 5 seconds</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="w-full bg-neutral-200 rounded font-medium px-2 py-1.5"
          onClick={addTodo}
        >
          Add todo
        </button>
      </div>
      <div className="gap-5 grid grid-cols-3 mt-5">
        <ul className="flex flex-col gap-3 col-span-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="bg-neutral-50 rounded px-2 py-1.5 border border-neutral-300 flex items-center gap-2 justify-between"
            >
              <label htmlFor={`todo-${todo.id}-complete`}>{todo.title}</label>
              <input
                type="checkbox"
                id={`todo-${todo.id}-complete`}
                checked={todo.completed}
                onChange={async () => {
                  await toggleTodo(todo);
                }}
              />
            </li>
          ))}
        </ul>
        <ul className="col-span-1 flex flex-col gap-2">
          {completedTodos.map((todo) => (
            <li
              key={todo.id}
              className="bg-neutral-100 rounded px-2 py-1.5 flex items-center gap-2 justify-between"
            >
              <label htmlFor={`todo-${todo.id}-complete`}>{todo.title}</label>
              <input
                type="checkbox"
                id={`todo-${todo.id}-complete`}
                checked={todo.completed}
                onChange={async () => {
                  await store.update(todo.id, { completed: !todo.completed });
                  await fetchCompletedTodos();
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
