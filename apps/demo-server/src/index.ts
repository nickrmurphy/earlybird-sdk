import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createNodeFsAdapter, createStore } from "@earlybird-sdk/store";
import z from "zod";
import { cors } from "hono/cors";

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

const adapter = createNodeFsAdapter();
const store = createStore<Todo>(adapter, "todos");

const app = new Hono();
app.use("*", cors());

app.get("/heartbeat", async (c) => {
  return c.json({ message: "ok" });
});

app.get("/:collection/hashes", async (c) => {
  const hashes = await store.getHashes();
  return c.json(hashes);
});

app.get(
  "/:collection",
  validator("query", (value, c) => {
    const parsed = z
      .object({
        buckets: z
          .string()
          .transform((str) =>
            str.split(",").map((s) => z.coerce.number().parse(s)),
          ),
      })
      .safeParse(value);
    if (!parsed.success) {
      return c.json({ error: parsed.error.message }, 401);
    }
    return parsed.data;
  }),
  async (c) => {
    const buckets = c.req.valid("query").buckets;
    const result = await store.getBuckets(buckets);
    return c.json(result);
  },
);

app.post("/:collection", async (c) => {
  const rawData = await c.req.json();
  await store.mergeData(rawData);
  return c.text("Hello Hono!");
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
