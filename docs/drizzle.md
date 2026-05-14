---
summary: 'Drizzle ORM 0.45 API reference — schema, queries, migrations, Drizzle Kit, PG column types.'
read_when:
  - Writing or modifying DB queries
  - Schema changes or migrations
  - Drizzle ORM API questions
---

## ⚠️ Regla crítica: Migration Tracker

> Las migraciones de Drizzle se consideran aplicadas **por timestamp** en `drizzle.__drizzle_migrations`.  
> **No basta con que la columna exista en la DB.**

El migrador `neon-http` usa exclusivamente el campo `created_at` de `drizzle.__drizzle_migrations` para determinar qué migraciones ejecutar. Si una columna fue añadida a mano (sin `npm run migrate`), el migrador no lo sabe y volverá a intentar `ALTER TABLE ADD COLUMN` → error en el siguiente deploy.

**Tabla correcta:** `drizzle.__drizzle_migrations` (schema `drizzle`)  
**Tabla incorrecta:** `public.__drizzle_migrations` (existe pero el migrador no la lee)

Si alguna vez aplicas DDL manualmente en Neon, registra inmediatamente la migración:

```bash
# Verificación obligatoria después de cualquier cambio manual en DB:
npm run migrate
# Debe mostrar: "Done." sin ejecutar SQL
```

Ver incidente completo: `docs/incidents/2026-05-14-drizzle-migration-tracker.md`

<!--
Downloaded via https://llm.codes by @steipete on March 17, 2026 at 01:44 PM
Source URL: https://orm.drizzle.team/docs/
Total pages processed: 200
URLs filtered: Yes
Content de-duplicated: Yes
Availability strings filtered: Yes
Code blocks only: No
-->

# https://orm.drizzle.team/docs/

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/overview

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Drizzle ORM

It looks and feels simple, performs on day _1000_ of your project,

lets you do things your way, and is there when you need it.

**It’s the only ORM with both relational and SQL-like query APIs**,
providing you the best of both worlds when it comes to accessing your relational data.
Drizzle is lightweight, performant, typesafe, non-lactose, gluten-free, sober, flexible and **serverless-ready by design**.
Drizzle is not just a library, it’s an experience. 🤩

![Drizzle bestofjs](https://bestofjs.org/projects/drizzle-orm)

## Headless ORM?

First and foremost, Drizzle is a library and a collection of complementary opt-in tools.

**ORM** stands for _object relational mapping_, and developers tend to call Django-like or Spring-like tools an ORM.
We truly believe it’s a misconception based on legacy nomenclature, and we call them **data frameworks**.

WARNING

With data frameworks you have to build projects **around them** and not **with them**.

**Drizzle** lets you build your project the way you want, without interfering with your project or structure.

Using Drizzle you can define and manage database schemas in TypeScript, access your data in a SQL-like
or relational way, and take advantage of opt-in tools
to push your developer experience _through the roof_. 🤯

## Why SQL-like?

**If you know SQL, you know Drizzle.**

Other ORMs and data frameworks tend to deviate/abstract you away from SQL, which
leads to a double learning curve: needing to know both SQL and the framework’s API.

Drizzle is the opposite.
We embrace SQL and built Drizzle to be SQL-like at its core, so you can have zero to no
learning curve and access to the full power of SQL.

We bring all the familiar **SQL schema**, **queries**,
**automatic migrations** and **one more thing**. ✨

index.ts

schema.ts

migration.sql

// Access your data
await db
.select()
.from(countries)
.leftJoin(cities, eq(cities.countryId, countries.id))
.where(eq(countries.id, 10))
// manage your schema
export const countries = pgTable('countries', {
id: serial('id').primaryKey(),
name: varchar('name', { length: 256 }),
});

export const cities = pgTable('cities', {
id: serial('id').primaryKey(),
name: varchar('name', { length: 256 }),

});
-- generate migrations
CREATE TABLE IF NOT EXISTS "countries" (
"id" serial PRIMARY KEY NOT NULL,
"name" varchar(256)
);

CREATE TABLE IF NOT EXISTS "cities" (
"id" serial PRIMARY KEY NOT NULL,
"name" varchar(256),
"country_id" integer
);

ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE no action ON UPDATE no action;

## Why not SQL-like?

We’re always striving for a perfectly balanced solution, and while SQL-like does cover 100% of the needs,
there are certain common scenarios where you can query data in a better way.

We’ve built the **Queries API** for you, so you can fetch relational nested data from the database
in the most convenient and performant way, and never think about joins and data mapping.

**Drizzle always outputs exactly 1 SQL query.** Feel free to use it with serverless databases and never worry about performance or roundtrip costs!

const result = await db.query.users.findMany({
with: {
posts: true
},
});

## Serverless?

The best part is no part. **Drizzle has exactly 0 dependencies!**

Drizzle ORM is dialect-specific, slim, performant and serverless-ready **by design**.

We’ve spent a lot of time to make sure you have best-in-class SQL dialect support, including Postgres, MySQL, and others.

Drizzle operates natively through industry-standard database drivers. We support all major **PostgreSQL**, **MySQL**, **SQLite** or **SingleStore** drivers out there, and we’re adding new ones **really fast**.

## Welcome on board!

More and more companies are adopting Drizzle in production, experiencing immense benefits in both DX and performance.

**We’re always there to help, so don’t hesitate to reach out. We’ll gladly assist you in your Drizzle journey!**

We have an outstanding **Discord community** and welcome all builders to our **Twitter**.

Now go build something awesome with Drizzle and your **PostgreSQL**, **MySQL** or **SQLite** database. 🚀

### Video Showcase

1:37:39\\
\\

\\
Full Drizzle Course for Beginners \\
\\
Code Genix

56:09\\
\\

\\
Learn Drizzle In 60 Minutes \\
\\
Web Dev Simplified

2:55\\
\\

\\
Drizzle ORM in 100 Seconds \\
\\
Fireship

14:00\\
\\

\\
Learn Drizzle ORM in 13 mins (crash course) \\
\\
Neon

38:08\\
\\

\\
Easiest Database Setup in Next.js 14 with Turso & Drizzle \\
\\
Sam Meech-Ward

5:46:28\\
\\

\\
Next.js Project with Vercel, Neon, Drizzle, TailwindCSS, FlowBite and more! \\
\\
CodingEntrepreneurs

5:46\\
\\

\\
I Have A New Favorite Database Tool \\
\\
Theo - t3.gg

33:52\\
\\

\\
Drizzle ORM First impressions - migrations, relations, queries! \\
\\
Marius Espejo

9:00\\
\\

\\
I want to learn Drizzle ORM, so I'm starting another next14 project \\
\\
Web Dev Cody

5:18\\
\\

\\
Picking an ORM is Getting Harder... \\
\\
Ben Davis

8:49\\
\\

\\
This New Database Tool is a Game-Changer \\
\\
Josh tried coding

4:23\\
\\

\\
My Favorite Database Tool Just Got EVEN Better \\
\\
Josh tried coding

11:41:46\\
\\

\\
SaaS Notion Clone with Realtime cursors, Nextjs 13, Stripe, Drizzle ORM, Tailwind, Supabase, Sockets \\
\\
Web Prodigies

12:18\\
\\

\\
SvelteKit + Drizzle Code Breakdown \\
\\
Ben Davis

2:01:29\\
\\

\\
Build a Multi-Tenanted, Role-Based Access Control System \\
\\
TomDoesTech

5:42\\
\\

\\
The Prisma killer is finally here \\
\\
SST

1:07:41\\
\\

\\
Learning Drizzle ORM and working on a next14 project \\
\\
Web Dev Cody

6:01\\
\\

\\
This Trick Makes My Favorite Database Tool Even Better \\
\\
Josh tried coding

26:29\\
\\

\\
Effortless Auth in Next.js 14: Use Auth.js & Drizzle ORM for Secure Login \\
\\
Sam Meech-Ward

---

# https://orm.drizzle.team/docs/sql-schema-declaration

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Drizzle schema

Drizzle lets you define a schema in TypeScript with various models and properties supported by the underlying database.
When you define your schema, it serves as the source of truth for future modifications in queries (using Drizzle-ORM)
and migrations (using Drizzle-Kit).

If you are using Drizzle-Kit for the migration process, make sure to export all the models defined in your schema files so that Drizzle-Kit can import them and use them in the migration diff process.

Using imports

Using callback

Using import \*

import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
id: integer().primaryKey().generatedAlwaysAsIdentity(),
name: varchar().notNull(),
age: integer().notNull(),
email: varchar().notNull().unique(),
});
import { pgTable } from "drizzle-orm/pg-core";

id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
name: t.varchar().notNull(),
age: t.integer().notNull(),
email: t.varchar().notNull().unique(),
}));
import \* as p from "drizzle-orm/pg-core";

export const usersTable = p.pgTable("users", {
id: p.integer().primaryKey().generatedAlwaysAsIdentity(),
name: p.varchar().notNull(),
age: p.integer().notNull(),
email: p.varchar().notNull().unique(),
});

## Organize your schema files

You can declare your SQL schema directly in TypeScript either in a single `schema.ts` file,
or you can spread them around — whichever you prefer, all the freedom!

#### Schema in 1 file

This approach works well if you don’t have too many table models defined, or if you’re okay with keeping them all in one file

Example:

└ 📂 db
└ 📜 schema.ts

In the `drizzle.config.ts` file, you need to specify the path to your schema file. With this configuration, Drizzle will
read from the `schema.ts` file and use this information during the migration generation process. For more information
about the `drizzle.config.ts` file and migrations with Drizzle, please check: link

import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: 'postgresql', // 'mysql' | 'sqlite' | 'turso'
schema: './src/db/schema.ts'
})

#### Schema in multiple files

You can place your Drizzle models — such as tables, enums, sequences, etc. — not only in one file but in any file you prefer.
The only thing you must ensure is that you export all the models from those files so that the Drizzle kit can import
them and use them in migrations.

One use case would be to separate each table into its own file.

└ 📂 db
└ 📂 schema
├ 📜 users.ts
├ 📜 countries.ts
├ 📜 cities.ts
├ 📜 products.ts
├ 📜 clients.ts
└ 📜 etc.ts

In the `drizzle.config.ts` file, you need to specify the path to your schema folder. With this configuration, Drizzle will
read from the `schema` folder and find all the files recursively and get all the drizzle tables from there. For more information
about the `drizzle.config.ts` file and migrations with Drizzle, please check: link

export default defineConfig({
dialect: 'postgresql', // 'mysql' | 'sqlite' | 'turso'
schema: './src/db/schema'
})

You can also group them in any way you like, such as creating groups for user-related tables, messaging-related tables, product-related tables, etc.

└ 📂 db
└ 📂 schema
├ 📜 users.ts
├ 📜 messaging.ts
└ 📜 products.ts

## Shape your data schema

Drizzle schema consists of several model types from database you are using. With drizzle you can specify:

- Tables with columns, constraints, etc.
- Schemas(PostgreSQL only)
- Enums
- Sequences(PostgreSQL only)
- Views
- Materialized Views
- etc.

Let’s go one by one and check how the schema should be defined with drizzle

#### **Tables and columns declaration**

A table in Drizzle should be defined with at least 1 column, the same as it should be done in database. There is one important thing to know,
there is no such thing as a common table object in drizzle. You need to choose a dialect you are using, PostgreSQL, MySQL or SQLite

PostgreSQL Table

MySQL Table

SQLite Table

import { pgTable, integer } from "drizzle-orm/pg-core"

export const users = pgTable('users', {
id: integer()
});
import { mysqlTable, int } from "drizzle-orm/mysql-core"

export const users = mysqlTable('users', {
id: int()
});
import { sqliteTable, integer } from "drizzle-orm/sqlite-core"

export const users = sqliteTable('users', {
id: integer()
});

By default, Drizzle will use the TypeScript key names for columns in database queries.
Therefore, the schema and query from the example will generate the SQL query shown below

This example uses a db object, whose initialization is not covered in this part of the documentation. To learn how to connect to the database, please refer to the Connections Docs

**TypeScript key = database key**

// schema.ts
import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
id: integer(),
first_name: varchar()
})
// query.ts
await db.select().from(users);
SELECT "id", "first_name" from users;

If you want to use different names in your TypeScript code and in the database, you can use column aliases

export const users = pgTable('users', {
id: integer(),
firstName: varchar('first_name')
})
// query.ts
await db.select().from(users);
SELECT "id", "first_name" from users;

### Camel and Snake casing

Database model names often use `snake_case` conventions, while in TypeScript, it is common to use `camelCase` for naming models.
This can lead to a lot of alias definitions in the schema. To address this, Drizzle provides a way to automatically
map `camelCase` from TypeScript to `snake_case` in the database by including one optional parameter during Drizzle database initialization

For such mapping, you can use the `casing` option in the Drizzle DB declaration. This parameter will
help you specify the database model naming convention and will attempt to map all JavaScript keys accordingly

// schema.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
id: integer(),
firstName: varchar()
})
// db.ts
const db = drizzle({ connection: process.env.DATABASE_URL, casing: 'snake_case' })
// query.ts
await db.select().from(users);
SELECT "id", "first_name" from users;

### Advanced

There are a few tricks you can use with Drizzle ORM. As long as Drizzle is entirely in TypeScript files,
you can essentially do anything you would in a simple TypeScript project with your code.

One common feature is to separate columns into different places and then reuse them.
For example, consider the `updated_at`, `created_at`, and `deleted_at` columns. Many tables/models may need these
three fields to track and analyze the creation, deletion, and updates of entities in a system

We can define those columns in a separate file and then import and spread them across all the table objects you have

// columns.helpers.ts
const timestamps = {
updated_at: timestamp(),
created_at: timestamp().defaultNow().notNull(),
deleted_at: timestamp(),
}
// users.sql.ts
export const users = pgTable('users', {
id: integer(),
...timestamps
})
// posts.sql.ts
export const posts = pgTable('posts', {
id: integer(),
...timestamps
})

#### **Schemas**

PostgreSQL

MySQL

SQLite

In PostgreSQL, there is an entity called a `schema` (which we believe should be called `folders`). This creates a structure in PostgreSQL:

You can manage your PostgreSQL schemas with `pgSchema` and place any other models inside it.

Define the schema you want to manage using Drizzle

import { pgSchema } from "drizzle-orm/pg-core"

export const customSchema = pgSchema('custom');

Then place the table inside the schema object

import { integer, pgSchema } from "drizzle-orm/pg-core";

export const users = customSchema.table('users', {
id: integer()
})

In MySQL, there is an entity called `Schema`, but in MySQL terms, this is equivalent to a `Database`.

You can define them with `drizzle-orm` and use them in queries, but they won’t be detected by `drizzle-kit` or included in the migration flow

import { mysqlSchema } from "drizzle-orm/mysql-core"

export const customSchema = mysqlSchema('custom');

import { int, mysqlSchema } from "drizzle-orm/mysql-core";

export const users = customSchema.table('users', {
id: int()
})

In SQLite, there is no concept of a schema, so you can only define tables within a single SQLite file context

### Example

import { AnyPgColumn } from "drizzle-orm/pg-core";
import { pgEnum, pgTable as table } from "drizzle-orm/pg-core";
import \* as t from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("roles", ["guest", "user", "admin"]);

export const users = table(
"users",
{
id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
firstName: t.varchar("first_name", { length: 256 }),
lastName: t.varchar("last_name", { length: 256 }),
email: t.varchar().notNull(),

role: rolesEnum().default("guest"),
},

t.uniqueIndex("email_idx").on(table.email)\
]
);

export const posts = table(
"posts",
{
id: t.integer().primaryKey().generatedAlwaysAsIdentity(),

title: t.varchar({ length: 256 }),

},

t.uniqueIndex("slug_idx").on(table.slug),\
t.index("title_idx").on(table.title),\
]
);

export const comments = table("comments", {
id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
text: t.varchar({ length: 256 }),

});
import { mysqlTable as table } from "drizzle-orm/mysql-core";
import \* as t from "drizzle-orm/mysql-core";
import { AnyMySqlColumn } from "drizzle-orm/mysql-core";

export const users = table(
"users",
{
id: t.int().primaryKey().autoincrement(),
firstName: t.varchar("first_name", { length: 256 }),
lastName: t.varchar("last_name", { length: 256 }),
email: t.varchar({ length: 256 }).notNull(),

role: t.mysqlEnum(["guest", "user", "admin"]).default("guest"),
},

export const posts = table(
"posts",
{
id: t.int().primaryKey().autoincrement(),

export const comments = table("comments", {
id: t.int().primaryKey().autoincrement(),
text: t.varchar({ length: 256 }),

});
import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import \* as t from "drizzle-orm/sqlite-core";
import { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const users = table(
"users",
{
id: t.int().primaryKey({ autoIncrement: true }),
firstName: t.text("first_name"),
lastName: t.text("last_name"),
email: t.text().notNull(),

export const posts = table(
"posts",
{
id: t.int().primaryKey({ autoIncrement: true }),

title: t.text(),

export const comments = table("comments", {
id: t.int().primaryKey({ autoIncrement: true }),
text: t.text({ length: 256 }),

});

**`generateUniqueString` implementation:**

function generateUniqueString(length: number = 12): string {
const characters =
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let uniqueString = "";

for (let i = 0; i < length; i++) {
const randomIndex = Math.floor(Math.random() \* characters.length);
uniqueString += characters[randomIndex];
}

return uniqueString;
}

#### What’s next?

**Manage schema**

Column types Indexes and Constraints Database Views Database Schemas Sequences Extensions

**Zero to Hero**

Database connection Data querying Migrations

---

# https://orm.drizzle.team/docs/rqb

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Drizzle Queries

PostgreSQL

SQLite

MySQL

SingleStore

Drizzle ORM is designed to be a thin typed layer on top of SQL.
We truly believe we’ve designed the best way to operate an SQL database from TypeScript and it’s time to make it better.

Relational queries are meant to provide you with a great developer experience for querying
nested relational data from an SQL database, avoiding multiple joins and complex data mappings.

It is an extension to the existing schema definition and query builder.
You can opt-in to use it based on your needs.
We’ve made sure you have both the best-in-class developer experience and performance.

index.ts

schema.ts

import \* as schema from './schema';
import { drizzle } from 'drizzle-orm/...';

const db = drizzle({ schema });

const result = await db.\_query.users.findMany({
with: {
posts: true
},
});
[{\
id: 10,\
name: "Dan",\
posts: [\
{\
id: 1,\
content: "SQL is awesome",\
authorId: 10,\
},\
{\
id: 2,\
content: "But check relational queries",\
authorId: 10,\
}\
]\
}]
import { integer, serial, text, pgTable } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
});

posts: many(posts),
}));

export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
content: text('content').notNull(),
authorId: integer('author_id').notNull(),
});

author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

⚠️ If you have SQL schema declared in multiple files you can do it like that

schema1.ts

schema2.ts

import _ as schema1 from './schema1';
import _ as schema2 from './schema2';
import { drizzle } from 'drizzle-orm/...';

const db = drizzle({ schema: { ...schema1, ...schema2 } });

const result = await db.\_query.users.findMany({
with: {
posts: true
},
});
// schema declaration in the first file
// schema declaration in the second file

## Modes

Drizzle relational queries always generate exactly one SQL statement to run on the database and it has certain caveats.
To have best in class support for every database out there we’ve introduced **`modes`**.

Drizzle relational queries use lateral joins of subqueries under the hood and for now PlanetScale does not support them.

When using **mysql2** driver with regular **MySQL** database — you should specify `mode: "default"`
When using **mysql2** driver with **PlanetScale** — you need to specify `mode: "planetscale"`

import \* as schema from './schema';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
uri: process.env.PLANETSCALE_DATABASE_URL,
});

const db = drizzle({ client: connection, schema, mode: 'planetscale' });

## Querying

Relational queries are an extension to Drizzle’s original **query builder**.
You need to provide all `tables` and `relations` from your schema file/files upon `drizzle()`
initialization and then just use the `db._query` API.

`drizzle` import path depends on the **database driver** you’re using.

await db.\_query.users.findMany(...);
// if you have schema in multiple files
import _ as schema1 from './schema1';
import _ as schema2 from './schema2';
import { drizzle } from 'drizzle-orm/...';

await db.\_query.users.findMany(...);
import { type AnyPgColumn, boolean, integer, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
verified: boolean('verified').notNull(),

});

invitee: one(users, { fields: [users.invitedBy], references: [users.id] }),
usersToGroups: many(usersToGroups),
posts: many(posts),
}));

export const groups = pgTable('groups', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
description: text('description'),
});

usersToGroups: many(usersToGroups),
}));

export const usersToGroups = pgTable('users_to_groups', {
id: serial('id').primaryKey(),

primaryKey({ columns: [t.userId, t.groupId] })\
]);

group: one(groups, { fields: [usersToGroups.groupId], references: [groups.id] }),
user: one(users, { fields: [usersToGroups.userId], references: [users.id] }),
}));

export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
content: text('content').notNull(),

createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

author: one(users, { fields: [posts.authorId], references: [users.id] }),
comments: many(comments),
}));

export const comments = pgTable('comments', {
id: serial('id').primaryKey(),
content: text('content').notNull(),

post: one(posts, { fields: [comments.postId], references: [posts.id] }),
author: one(users, { fields: [comments.creator], references: [users.id] }),
likes: many(commentLikes),
}));

export const commentLikes = pgTable('comment_likes', {
id: serial('id').primaryKey(),

comment: one(comments, { fields: [commentLikes.commentId], references: [comments.id] }),
author: one(users, { fields: [commentLikes.creator], references: [users.id] }),
}));

Drizzle provides `.findMany()` and `.findFirst()` APIs.

### Find many

const users = await db.\_query.users.findMany();
// result type
const result: {
id: number;
name: string;
verified: boolean;
invitedBy: number | null;
}[];

### Find first

`.findFirst()` will add `limit 1` to the query.

const user = await db.\_query.users.findFirst();
// result type
const result: {
id: number;
name: string;
verified: boolean;
invitedBy: number | null;
};

### Include relations

`With` operator lets you combine data from multiple related tables and properly aggregate results.

**Getting all posts with comments:**

const posts = await db.\_query.posts.findMany({
with: {
comments: true,
},
});

**Getting first post with comments:**

const post = await db.\_query.posts.findFirst({
with: {
comments: true,
},
});

You can chain nested with statements as much as necessary.

For any nested `with` queries Drizzle will infer types using Core Type API.

**Get all users with posts. Each post should contain a list of comments:**

const users = await db.\_query.users.findMany({
with: {
posts: {
with: {
comments: true,
},
},
},
});

### Partial fields select

`columns` parameter lets you include or omit columns you want to get from the database.

Drizzle performs partial selects on the query level, no additional data is transferred from the database.

Keep in mind that **a single SQL statement is outputted by Drizzle.**

**Get all posts with just `id`, `content` and include `comments`:**

const posts = await db.\_query.posts.findMany({
columns: {
id: true,
content: true,
},
with: {
comments: true,
}
});

**Get all posts without `content`:**

const posts = await db.\_query.posts.findMany({
columns: {
content: false,
},
});

When both `true` and `false` select options are present, all `false` options are ignored.

If you include the `name` field and exclude the `id` field, `id` exclusion will be redundant,
all fields apart from `name` would be excluded anyways.

**Exclude and Include fields in the same query:**

const users = await db.\_query.users.findMany({
columns: {
name: true,
id: false //ignored
},
});
// result type
const users: {
name: string;
};

**Only include columns from nested relations:**

const res = await db.\_query.users.findMany({
columns: {},
with: {
posts: true
}
});
// result type
const res: {
posts: {
id: number,
text: string
}
}[];

### Nested partial fields select

Just like with **`partial select`**, you can include or exclude columns of nested relations:

const posts = await db.\_query.posts.findMany({
columns: {
id: true,
content: true,
},
with: {
comments: {
columns: {
authorId: false
}
}
}
});

### Select filters

Just like in our SQL-like query builder,
relational queries API lets you define filters and conditions with the list of our **`operators`**.

You can either import them from `drizzle-orm` or use from the callback syntax:

import { eq } from 'drizzle-orm';

const users = await db.\_query.users.findMany({
where: eq(users.id, 1)
})
const users = await db.\_query.users.findMany({

})

Find post with `id=1` and comments that were created before particular date:

await db.\_query.posts.findMany({

with: {
comments: {

},
},
});

### Limit & Offset

Drizzle ORM provides `limit` & `offset` API for queries and for the nested entities.

**Find 5 posts:**

await db.\_query.posts.findMany({
limit: 5,
});

**Find posts and get 3 comments at most:**

await db.\_query.posts.findMany({
with: {
comments: {
limit: 3,
},
},
});

IMPORTANT

`offset` is only available for top level query.

await db.\_query.posts.findMany({
limit: 5,
offset: 2, // correct ✅
with: {
comments: {
offset: 3, // incorrect ❌
limit: 3,
},
},
});

Find posts with comments from the 5th to the 10th post:

await db.\_query.posts.findMany({
limit: 5,
offset: 5,
with: {
comments: true,
},
});

### Order By

Drizzle provides API for ordering in the relational query builder.

You can use same ordering **core API** or use
`order by` operator from the callback with no imports.

import { desc, asc } from 'drizzle-orm';

await db.\_query.posts.findMany({
orderBy: [asc(posts.id)],
});
await db.\_query.posts.findMany({

**Order by `asc` \+ `desc`:**

### Include custom fields

Relational query API lets you add custom additional fields.
It’s useful when you need to retrieve data and apply additional functions to it.

As of now aggregations are not supported in `extras`, please use **`core queries`** for that.

import { sql } from 'drizzle-orm';

await db.\_query.users.findMany({
extras: {
loweredName: sql`lower(${users.name})`.as('lowered_name'),
},
})
await db.\_query.users.findMany({
extras: {

},
})

`lowerName` as a key will be included to all fields in returned object.

To retrieve all users with groups, but with the fullName field included (which is a concatenation of firstName and lastName),
you can use the following query with the Drizzle relational query builder.

const res = await db.\_query.users.findMany({
extras: {

},
with: {
usersToGroups: {
with: {
group: true,
},
},
},
});
// result type
const res: {
id: number;
name: string;
verified: boolean;
invitedBy: number | null;
fullName: string;
usersToGroups: {
group: {
id: number;
name: string;
description: string | null;
};
}[];
}[];

To retrieve all posts with comments and add an additional field to calculate the size of the post content and the size of each comment content:

const res = await db.\_query.posts.findMany({

}),
with: {
comments: {
extras: {

},
},
},
});
// result type
const res: {
id: number;
createdAt: Date;
content: string;
authorId: number | null;
contentLength: number;
comments: {
id: number;
createdAt: Date;
content: string;
creator: number | null;
postId: number | null;
commentSize: number;
}[];
};

### Prepared statements

Prepared statements are designed to massively improve query performance — see here.

In this section, you can learn how to define placeholders and execute prepared statements
using the Drizzle relational query builder.

##### **Placeholder in `where`**

const prepared = db.\_query.users.findMany({

with: {
posts: {

},
},
}).prepare('query_name');

const usersWithPosts = await prepared.execute({ id: 1 });
const prepared = db.\_query.users.findMany({

},
},
}).prepare();

const usersWithPosts = await prepared.execute({ id: 1 });

##### **Placeholder in `limit`**

const prepared = db.\_query.users.findMany({
with: {
posts: {
limit: placeholder('limit'),
},
},
}).prepare('query_name');

const usersWithPosts = await prepared.execute({ limit: 1 });
const prepared = db.\_query.users.findMany({
with: {
posts: {
limit: placeholder('limit'),
},
},
}).prepare();

const usersWithPosts = await prepared.execute({ limit: 1 });

##### **Placeholder in `offset`**

const prepared = db.\_query.users.findMany({
offset: placeholder('offset'),
with: {
posts: true,
},
}).prepare('query_name');

const usersWithPosts = await prepared.execute({ offset: 1 });
const prepared = db.\_query.users.findMany({
offset: placeholder('offset'),
with: {
posts: true,
},
}).prepare();

const usersWithPosts = await prepared.execute({ offset: 1 });

##### **Multiple placeholders**

const prepared = db.\_query.users.findMany({
limit: placeholder('uLimit'),
offset: placeholder('uOffset'),

limit: placeholder('pLimit'),
},
},
}).prepare('query_name');

const usersWithPosts = await prepared.execute({ pLimit: 1, uLimit: 3, uOffset: 1, id: 2, pid: 6 });
const prepared = db.\_query.users.findMany({
limit: placeholder('uLimit'),
offset: placeholder('uOffset'),

limit: placeholder('pLimit'),
},
},
}).prepare();

const usersWithPosts = await prepared.execute({ pLimit: 1, uLimit: 3, uOffset: 1, id: 2, pid: 6 });

---

# https://orm.drizzle.team/docs/kit-overview

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Migrations with Drizzle Kit

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here

**Drizzle Kit** is a CLI tool for managing SQL database migrations with Drizzle.

npm

yarn

pnpm

bun

npm i -D drizzle-kit
yarn add -D drizzle-kit
pnpm add -D drizzle-kit
bun add -D drizzle-kit

IMPORTANT

Make sure to first go through Drizzle get started and migration fundamentals and pick SQL migration flow that suits your business needs best.

Based on your schema, Drizzle Kit let’s you generate and run SQL migration files,
push schema directly to the database, pull schema from database, spin up drizzle studio and has a couple of utility commands.

npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit push
npx drizzle-kit pull
npx drizzle-kit check
npx drizzle-kit up
npx drizzle-kit studio
yarn drizzle-kit generate
yarn drizzle-kit migrate
yarn drizzle-kit push
yarn drizzle-kit pull
yarn drizzle-kit check
yarn drizzle-kit up
yarn drizzle-kit studio
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm drizzle-kit push
pnpm drizzle-kit pull
pnpm drizzle-kit check
pnpm drizzle-kit up
pnpm drizzle-kit studio
bunx drizzle-kit generate
bunx drizzle-kit migrate
bunx drizzle-kit push
bunx drizzle-kit pull
bunx drizzle-kit check
bunx drizzle-kit up
bunx drizzle-kit studio

|                        |                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `drizzle-kit generate` | lets you generate SQL migration files based on your Drizzle schema either upon declaration or on subsequent changes, see here.         |
| `drizzle-kit migrate`  | lets you apply generated SQL migration files to your database, see here.                                                               |
| `drizzle-kit pull`     | lets you pull(introspect) database schema, convert it to Drizzle schema and save it to your codebase, see here                         |
| `drizzle-kit push`     | lets you push your Drizzle schema to database either upon declaration or on subsequent schema changes, see here                        |
| `drizzle-kit studio`   | will connect to your database and spin up proxy server for Drizzle Studio which you can use for convenient database browsing, see here |
| `drizzle-kit check`    | will walk through all generate migrations and check for any race conditions(collisions) of generated migrations, see here              |
| `drizzle-kit up`       | used to upgrade snapshots of previously generated migrations, see here                                                                 |

Drizzle Kit is configured through drizzle.config.ts configuration file or via CLI params.

It’s required to at least provide SQL `dialect` and `schema` path for Drizzle Kit to know how to generate migrations.

├ 📂 src
├ 📜 .env
├ 📜 drizzle.config.ts <--- Drizzle config file
├ 📜 package.json
└ 📜 tsconfig.json

simple config

extended config

import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
});
import { defineConfig } from "drizzle-kit";

export default defineConfig({
out: "./drizzle",
dialect: "postgresql",
schema: "./src/schema.ts",

driver: "pglite",
dbCredentials: {
url: "./database/",
},

extensionsFilters: ["postgis"],
schemaFilter: "public",
tablesFilter: "\*",

introspect: {
casing: "camel",
},

migrations: {
prefix: "timestamp",
table: "**drizzle_migrations**",
schema: "public",
},

breakpoints: true,
strict: true,
verbose: true,
});

You can provide Drizzle Kit config path via CLI param, it’s very useful when you have multiple database stages or multiple databases or different databases on the same project:

npx drizzle-kit push --config=drizzle-dev.drizzle.config
npx drizzle-kit push --config=drizzle-prod.drizzle.config
yarn drizzle-kit push --config=drizzle-dev.drizzle.config
yarn drizzle-kit push --config=drizzle-prod.drizzle.config
pnpm drizzle-kit push --config=drizzle-dev.drizzle.config
pnpm drizzle-kit push --config=drizzle-prod.drizzle.config
bunx drizzle-kit push --config=drizzle-dev.drizzle.config
bunx drizzle-kit push --config=drizzle-prod.drizzle.config

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

---

# https://orm.drizzle.team/docs/guides

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Guides

Comprehensive collection of code samples and step-by-step walkthroughs for
common tasks

Conditional filters in query

SQL Increment value

SQL Decrement value

Include or Exclude Columns in Query

SQL Toggle value

Count rows

Upsert Query

SQL Limit/Offset pagination

SQL Cursor-based pagination

SQL Timestamp as a default value

Gel auth extension

Select parent rows with at least one related child row

Empty array as a default value

Update many with different values for each row

Unique and Case-Insensitive Email Handling

Vector similarity search with pgvector extension

PostgreSQL full-text search

Cloudflare D1 HTTP API with Drizzle Kit

Point datatype in PostgreSQL

PostGIS geometry point

How to setup PostgreSQL locally

How to setup MySQL locally

Seeding Partially Exposed Tables with Foreign Key

Seeding using 'with' option

Full-text search with Generated Columns

---

# https://orm.drizzle.team/docs/tutorials

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Tutorials

Drizzle with Netlify Edge Functions and Neon Postgres

Drizzle with Netlify Edge Functions and Supabase Database

Drizzle with Supabase Edge Functions

Drizzle with Vercel Edge Functions

Drizzle with Neon Postgres

Drizzle with Nile Database

Drizzle with Supabase Database

Drizzle with Turso

Drizzle with Vercel Postgres

Drizzle with Xata

Todo App with Neon Postgres

Drizzle with Encore

---

# https://orm.drizzle.team/docs/latest-releases

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Latest Releases

Drizzle ORM and Drizzle Kit v1.0.0-beta.2 release\\
\\
Feb 12, 2025 \\
\\
v1 pre-release \\
\\
Read more Drizzle Kit v0.23.2 release\\
\\
Aug 5, 2024 \\
\\
Bug fixes \\
\\
Read more DrizzleORM v0.32.2 release\\
\\
Aug 5, 2024 \\
\\
Bug fixes \\
\\
Read more DrizzleORM v0.32.1 release\\
\\
Jul 23, 2024 \\
\\
Bug fixes \\
\\
Read more DrizzleORM v0.32.0 release\\
\\
Jul 10, 2024 \\
\\
Generated columns, identity columns, sequences and more \\
\\
Read more DrizzleORM v0.31.3 release\\
\\
Jul 8, 2024 \\
\\
Prisma-Drizzle extension \\
\\
Read more DrizzleORM v0.31.4 release\\
\\
Jul 8, 2024 \\
\\
Mark prisma clients package as optional \\
\\
Read more DrizzleORM v0.31.2 release\\
\\
Jun 7, 2024 \\
\\
Added support for TiDB Cloud Serverless driver \\
\\
Read more DrizzleORM v0.31.1 release\\
\\
Jun 4, 2024 \\
\\
React Live Queries 🎉 \\
\\
Read more DrizzleORM v0.31.0 release\\
\\
May 31, 2024 \\
\\
PostgreSQL indexes API changes \\
\\
Read more DrizzleORM v0.30.10 release\\
\\
May 1, 2024 \\
\\
Added '.if()' function to all WHERE expressions and fixed internal mappings for sessions '.all', '.values', '.execute' functions in AWS DataAPI. \\
\\
Read more DrizzleORM v0.30.9 release\\
\\
Apr 22, 2024 \\
\\
Added 'setWhere' and 'targetWhere' fields to '.onConflictDoUpdate()' config in SQLite, added schema information to Drizzle instances via 'db.\_.fullSchema' and fixed migrator in AWS Data API. \\
\\
Read more DrizzleORM v0.30.8 release\\
\\
Apr 11, 2024 \\
\\
Added custom schema support to enums in Postgres, changed D1 'migrate()' function to use batch API, updated '.onConflictDoUpdate' method, fixed query generation for 'where' clause in Postgres '.onConflictDoNothing' method and fixed various bugs related to AWS Data API. \\
\\
Read more DrizzleORM v0.30.7 release\\
\\
Apr 3, 2024 \\
\\
Added mappings for '@vercel/postgres' package and fixed interval mapping for neon drivers. \\
\\
Read more DrizzleORM v0.30.6 release\\
\\
Mar 28, 2024 \\
\\
Added support for PGlite driver. \\
\\
Read more DrizzleORM v0.30.5 release\\
\\
Mar 27, 2024 \\
\\
Added '$onUpdate' functionality for PostgreSQL, MySQL and SQLite and fixed insertions on columns with the smallserial datatype. \\
\\
Read more DrizzleORM v0.30.4 release\\
\\
Mar 19, 2024 \\
\\
Added support for Xata driver. \\
\\
Read more DrizzleORM v0.30.3 release\\
\\
Mar 19, 2024 \\
\\
Added raw query support to batch API in Neon HTTP driver, fixed '@neondatabase/serverless' HTTP driver types issue, and fixed sqlite-proxy driver '.run()' result. \\
\\
Read more DrizzleORM v0.30.2 release\\
\\
Mar 14, 2024 \\
\\
Updated LibSQL migrations to utilize batch execution instead of transactions and fixed findFirst query for bun:sqlite. \\
\\
Read more DrizzleORM v0.30.1 release\\
\\
Mar 8, 2024 \\
\\
Added support for op-sqlite driver and fixed migration hook for Expo driver. \\
\\
Read more DrizzleORM v0.30.0 release\\
\\
Mar 7, 2024 \\
\\
Modified the 'postgres.js' driver instance to always return strings for dates, and then Drizzle will provide you with either strings of mapped dates, depending on the selected 'mode'. Fixed many bugs related to timestamps and dates. \\
\\
Read more DrizzleORM v0.29.5 release\\
\\
Mar 6, 2024 \\
\\
Added with update, with delete, with insert, possibility to specify custom schema and custom name for migrations table, sqlite proxy batch and relational queries support. \\
\\
Read more DrizzleORM v0.29.4 release\\
\\
Feb 22, 2024 \\
\\
Added Neon HTTP Batch support and updated the default behavior and instances of database-js. \\
\\
Read more DrizzleORM v0.29.3 release\\
\\
Jan 2, 2024 \\
\\
Fixed expo peer dependencies. \\
\\
Read more DrizzleORM v0.29.2 release\\
\\
Dec 25, 2023 \\
\\
Implemented enhancements in the planescale relational tests. Corrected string escaping for empty PgArrays. Rectified syntax error for the exists function in SQLite. Ensured proper handling of dates in AWS Data API. Resolved the Hermes mixins constructor issue. \\
\\
Read more DrizzleORM v0.29.1 release\\
\\
Nov 29, 2023 \\
\\
Fixed issues include forwarding arguments correctly when using the withReplica feature, resolving the selectDistinctOn not working with multiple columns problem, and providing detailed JSDoc for all query builders in all dialects. Additionally, introduced new helpers for aggregate functions in SQL and a new ESLint Drizzle Plugin package. \\
\\
Read more DrizzleORM v0.29.0 release\\
\\
Nov 9, 2023 \\
\\
Added new features like unsigned option for bigint in MySQL, improved query builder types, added possibility to specify name for primary keys and foreign keys, read replicas support, set operators support, new MySQL and PostgreSQL proxy drivers, D1 Batch API support. \\
\\
Read more DrizzleORM v0.28.6 release\\
\\
Sep 6, 2023 \\
\\
Changed datetime mapping for MySQL, added LibSQL batch API support, added JSON mode for text in SQLite, added '.toSQL()' to Relational Query API calls, added new PostgreSQL operators for Arrays, added more SQL operators for the 'where' function in Relational Queries, and fixed bugs. \\
\\
Read more DrizzleORM v0.28.5 release\\
\\
Aug 24, 2023 \\
\\
Fixed incorrect OpenTelemetry type import that caused a runtime error. \\
\\
Read more DrizzleORM v0.28.4 release\\
\\
Aug 24, 2023 \\
\\
Fixed imports in ESM-based projects and type error on Postgres table definitions. \\
\\
Read more DrizzleORM v0.28.3 release\\
\\
Aug 22, 2023 \\
\\
Added SQLite simplified query API, added methods to column builders and to table model type inference. Fixed sqlite-proxy and SQL.js response from '.get()' when the result is empty. \\
\\
Read more DrizzleORM v0.28.2 release\\
\\
Aug 10, 2023 \\
\\
Added a set of tests for d1, fixed issues in internal documentation, resolved the issue of truncating timestamp milliseconds for MySQL, corrected the type of the '.get()' method for sqlite-based dialects, rectified the sqlite-proxy bug that caused the query to execute twice. Added a support for Typebox package. \\
\\
Read more DrizzleORM v0.28.1 release\\
\\
Aug 7, 2023 \\
\\
Fixed Postgres array-related issues introduced by 0.28.0. \\
\\
Read more DrizzleORM v0.28.0 release\\
\\
Aug 6, 2023 \\
\\
Removed support for filtering by nested relations, Added Relational Queries mode config for mysql2 driver, improved IntelliSense performance for large schemas, improved Relational Queries Permormance and Read Usage. Added possibility to insert rows with default values for all columns. \\
\\
Read more DrizzleORM v0.27.2 release\\
\\
Jul 12, 2023 \\
\\
Added support for unique constraints in PostgreSQL, MySQL, SQLite. \\
\\
Read more DrizzleORM v0.16.2 release\\
\\
Jan 21, 2023 \\
\\
Drizzle ORM - is an idiomatic TypeScript ORM which can be used as query builder and as an ORM being the source of truth for SQL schema and CLI for automatic migrations generation. \\
\\
Read more DrizzleORM v0.11.0 release\\
\\
Jul 20, 2022 \\
\\
DrizzleORM - is an open source TypeScript ORM, supports PostgreSQL and about to have MySQL and SQLite support in couple of weeks. We've decided it's time to share it with public. \\
\\
Read more

---

# https://orm.drizzle.team/docs/overview)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/sql-schema-declaration)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/rqb)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/kit-overview)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/tutorials)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/%3CBase64-Image-Removed%3E

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/select

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# SQL Select

Drizzle provides you the most SQL-like way to fetch data from your database, while remaining type-safe and composable.
It natively supports mostly every query feature and capability of every dialect,
and whatever it doesn’t support yet, can be added by the user with the powerful `sql` operator.

For the following examples, let’s assume you have a `users` table defined like this:

PostgreSQL

MySQL

SQLite

SingleStore

MSSQL

CockroachDB

import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
age: integer('age'),
});
import { mysqlTable, serial, text, int } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
age: int('age'),
});
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
id: integer('id').primaryKey(),
name: text('name').notNull(),
age: integer('age'),
});
import { singlestoreTable, serial, text, int } from 'drizzle-orm/singlestore-core';

export const users = singlestoreTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
age: int('age'),
});
import { mssqlTable, int, text } from 'drizzle-orm/mssql-core';

export const users = pgTable('users', {
id: int().primaryKey(),
name: text().notNull(),
age: int(),
});
import { cockroachTable, int4, text } from 'drizzle-orm/cockroach-core';

export const users = pgTable('users', {
id: int4().primaryKey(),
name: text().notNull(),
age: int4(),
});

### Basic select

Select all rows from a table including all columns:

const result = await db.select().from(users);
/_
{
id: number;
name: string;
age: number | null;
}[]
_/
select "id", "name", "age" from "users";

Notice that the result type is inferred automatically based on the table definition, including columns nullability.

Drizzle always explicitly lists columns in the `select` clause instead of using `select *`.

This is required internally to guarantee the fields order in the query result, and is also generally considered a good practice.

### Partial select

In some cases, you might want to select only a subset of columns from a table.
You can do that by providing a selection object to the `.select()` method:

const result = await db.select({
field1: users.id,
field2: users.name,
}).from(users);

const { field1, field2 } = result[0];
select "id", "name" from "users";

Like in SQL, you can use arbitrary expressions as selection fields, not just table columns:

const result = await db.select({
id: users.id,

}).from(users);
select "id", lower("name") from "users";

IMPORTANT

Drizzle cannot perform any type casts based on the provided type generic, because that information is not available at runtime.

If you need to apply runtime transformations to the returned value, you can use the `.mapWith()` method.

Info

Starting from `v1.0.0-beta.1` you can use `.as()` for columns:

const result = await db.select({
id: users.id,
lowerName: users.name.as("lower"),
}).from(users);

### Conditional select

You can have a dynamic selection object based on some condition:

async function selectUsers(withName: boolean) {
return db
.select({
id: users.id,
...(withName ? { name: users.name } : {}),
})
.from(users);
}

const users = await selectUsers(true);

### Distinct select

You can use `.selectDistinct()` instead of `.select()` to retrieve only unique rows from a dataset:

await db.selectDistinct().from(users).orderBy(users.id, users.name);

await db.selectDistinct({ id: users.id }).from(users).orderBy(users.id);
select distinct "id", "name" from "users" order by "id", "name";

select distinct "id" from "users" order by "id";

In PostgreSQL, you can also use the `distinct on` clause to specify how the unique rows are determined:

`distinct on` clause is only supported in PostgreSQL.

await db.selectDistinctOn([users.id]).from(users).orderBy(users.id);
await db.selectDistinctOn([users.name], { name: users.name }).from(users).orderBy(users.name);
select distinct on ("id") "id", "name" from "users" order by "id";
select distinct on ("name") "name" from "users" order by "name";

### Advanced select

Powered by TypeScript, Drizzle APIs let you build your select queries in a variety of flexible ways.

Sneak peek of advanced partial select, for more detailed advanced usage examples - see our dedicated guide.

`getColumns` available starting from `drizzle-orm@1.0.0-beta.2`(read more here)

If you are on pre-1 version(like `0.45.1`) then use `getTableColumns`

example 1

example 2

example 3

example 4

import { getColumns, sql } from 'drizzle-orm';

await db.select({
...getColumns(posts),

}).from(posts);
import { getColumns } from 'drizzle-orm';

const { content, ...rest } = getColumns(posts); // exclude "content" column
await db.select({ ...rest }).from(posts); // select all other columns
await db.query.posts.findMany({
columns: {
title: true,
},
});
await db.query.posts.findMany({
columns: {
content: false,
},
});

## \-\-\-

### Filters

You can filter the query results using the filter operators in the `.where()` method:

import { eq, lt, gte, ne } from 'drizzle-orm';

await db.select().from(users).where(eq(users.id, 42));
await db.select().from(users).where(lt(users.id, 42));
await db.select().from(users).where(gte(users.id, 42));
await db.select().from(users).where(ne(users.id, 42));
...
select "id", "name", "age" from "users" where "id" = 42;
select "id", "name", "age" from "users" where "id" < 42;

All filter operators are implemented using the `sql` function.
You can use it yourself to write arbitrary SQL filters, or build your own operators.
For inspiration, you can check how the operators provided by Drizzle are implemented.

import { sql } from 'drizzle-orm';

function equals42(col: Column) {
return sql`${col} = 42`;
}

await db.select().from(users).where(sql`${users.id} < 42`);
await db.select().from(users).where(sql`${users.id} = 42`);
await db.select().from(users).where(equals42(users.id));

await db.select().from(users).where(sql`lower(${users.name}) = 'aaron'`);
select "id", "name", "age" from "users" where 'id' < 42;
select "id", "name", "age" from "users" where 'id' = 42;
select "id", "name", "age" from "users" where 'id' = 42;

select "id", "name", "age" from "users" where lower("name") = 'aaron';

All the values provided to filter operators and to the `sql` function are parameterized automatically.
For example, this query:

await db.select().from(users).where(eq(users.id, 42));

will be translated to:

select "id", "name", "age" from "users" where "id" = $1; -- params: [42]

Inverting condition with a `not` operator:

import { eq, not, sql } from 'drizzle-orm';

await db.select().from(users).where(not(eq(users.id, 42)));
await db.select().from(users).where(sql`not ${users.id} = 42`);
select "id", "name", "age" from "users" where not ("id" = 42);
select "id", "name", "age" from "users" where not ("id" = 42);

You can safely alter schema, rename tables and columns
and it will be automatically reflected in your queries because of template interpolation,
as opposed to hardcoding column or table names when writing raw SQL.

### Combining filters

You can logically combine filter operators with `and()` and `or()` operators:

import { eq, and, sql } from 'drizzle-orm';

await db.select().from(users).where(
and(
eq(users.id, 42),
eq(users.name, 'Dan')
)
);
await db.select().from(users).where(sql`${users.id} = 42 and ${users.name} = 'Dan'`);
select "id", "name", "age" from "users" where "id" = 42 and "name" = 'Dan';
select "id", "name", "age" from "users" where "id" = 42 and "name" = 'Dan';
import { eq, or, sql } from 'drizzle-orm';

await db.select().from(users).where(
or(
eq(users.id, 42),
eq(users.name, 'Dan')
)
);
await db.select().from(users).where(sql`${users.id} = 42 or ${users.name} = 'Dan'`);
select "id", "name", "age" from "users" where "id" = 42 or "name" = 'Dan';
select "id", "name", "age" from "users" where "id" = 42 or "name" = 'Dan';

### Advanced filters

In combination with TypeScript, Drizzle APIs provide you powerful and flexible ways to combine filters in queries.

Sneak peek of conditional filtering, for more detailed advanced usage examples - see our dedicated guide.

await db
.select()
.from(posts)
.where(term ? ilike(posts.title, term) : undefined);
};
await searchPosts();
await searchPosts('AI');

await db
.select()
.from(posts)
.where(and(...filters));
};
const filters: SQL[] = [];
filters.push(ilike(posts.title, 'AI'));
filters.push(inArray(posts.category, ['Tech', 'Art', 'Science']));
filters.push(gt(posts.views, 200));
await searchPosts(filters);

### Limit & offset

Use `.limit()` and `.offset()` to add `limit` and `offset` clauses to the query - for example, to implement pagination:

await db.select().from(users).limit(10);
await db.select().from(users).limit(10).offset(10);
select "id", "name", "age" from "users" limit 10;
select "id", "name", "age" from "users" limit 10 offset 10;

### Fetch & offset

In MSSQL, `FETCH` and `OFFSET` are part of the `ORDER BY` clause, so they can only be used after the `.orderBy()` function

await db.select().from(users).orderBy(asc(users.id)).offset(5);
await db.select().from(users).orderBy(asc(users.id)).offset(5).fetch(10);
select [id], [name], [age] from [users] offset 5 rows;
select [id], [name], [age] from [users] offset 5 rows fetch next 10 rows;

### Top

Limits the rows returned in a query result set to a specified number of rows

await db.select().from(users).top(10);
select top (10) [id], [name], [age] from [users];

### Order By

Use `.orderBy()` to add `order by` clause to the query, sorting the results by the specified fields:

import { asc, desc } from 'drizzle-orm';

await db.select().from(users).orderBy(users.name);
await db.select().from(users).orderBy(desc(users.name));

// order by multiple fields
await db.select().from(users).orderBy(users.name, users.name2);
await db.select().from(users).orderBy(asc(users.name), desc(users.name2));
select "id", "name", "age" from "users" order by "name";
select "id", "name", "age" from "users" order by "name" desc;

select "id", "name", "age" from "users" order by "name", "name2";
select "id", "name", "age" from "users" order by "name" asc, "name2" desc;

### Advanced pagination

Powered by TypeScript, Drizzle APIs let you implement all possible SQL pagination and sorting approaches.

Sneak peek of advanced pagination, for more detailed advanced
usage examples - see our dedicated limit offset pagination
and cursor pagination guides.

await db
.select()
.from(users)
.orderBy(asc(users.id)) // order by is mandatory
.limit(4) // the number of rows to return
.offset(4); // the number of rows to skip

await db.query.users.findMany({

limit: pageSize,
offset: (page - 1) \* pageSize,
});
};
await getUsers();

const sq = db
.select({ id: users.id })
.from(users)
.orderBy(users.id)
.limit(pageSize)
.offset((page - 1) \* pageSize)
.as('subquery');
await db.select().from(users).innerJoin(sq, eq(users.id, sq.id)).orderBy(users.id);
};

await db
.select()
.from(users)
.where(cursor ? gt(users.id, cursor) : undefined) // if cursor is provided, get rows after it
.limit(pageSize) // the number of rows to return
.orderBy(asc(users.id)); // ordering
};
// pass the cursor of the last row of the previous page (id)
await nextUserPage(3);

### WITH clause

Check how to use WITH statement with insert, update, delete

Using the `with` clause can help you simplify complex queries by splitting them into smaller subqueries called common table expressions (CTEs):

const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));

const result = await db.with(sq).select().from(sq);
with sq as (select "id", "name", "age" from "users" where "id" = 42)
select "id", "name", "age" from sq;

You can also provide `insert`, `update` and `delete` statements inside `with`

const sq = db.$with('sq').as(
db.insert(users).values({ name: 'John' }).returning(),
);

const result = await db.with(sq).select().from(sq);
with "sq" as (insert into "users" ("id", "name") values (default, 'John') returning "id", "name")
select "id", "name" from "sq"
const sq = db.$with('sq').as(
db.update(users).set({ age: 25 }).where(eq(users.name, 'John')).returning(),
);
const result = await db.with(sq).select().from(sq);
with "sq" as (update "users" set "age" = 25 where "users"."name" = 'John' returning "id", "name", "age")
select "id", "name", "age" from "sq"
const sq = db.$with('sq').as(
db.delete(users).where(eq(users.name, 'John')).returning(),
);

const result = await db.with(sq).select().from(sq);
with "sq" as (delete from "users" where "users"."name" = $1 returning "id", "name", "age")
select "id", "name", "age" from "sq"

To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query,
you need to add aliases to them:

const sq = db.$with('sq').as(db.select({

})
.from(users));

const result = await db.with(sq).select({ name: sq.name }).from(sq);

If you don’t provide an alias, the field type will become `DrizzleTypeError` and you won’t be able to reference it in other queries.
If you ignore the type error and still try to use the field,
you will get a runtime error, since there’s no way to reference that field without an alias.

### Select from subquery

Just like in SQL, you can embed queries into other queries by using the subquery API:

const sq = db.select().from(users).where(eq(users.id, 42)).as('sq');
const result = await db.select().from(sq);
select "id", "name", "age" from (select "id", "name", "age" from "users" where "id" = 42) "sq";

Subqueries can be used in any place where a table can be used, for example in joins:

const sq = db.select().from(users).where(eq(users.id, 42)).as('sq');
const result = await db.select().from(users).leftJoin(sq, eq(users.id, sq.id));
select "users"."id", "users"."name", "users"."age", "sq"."id", "sq"."name", "sq"."age" from "users"
left join (select "id", "name", "age" from "users" where "id" = 42) "sq"
on "users"."id" = "sq"."id";

### Aggregations

With Drizzle, you can do aggregations using functions like `sum`, `count`, `avg`, etc. by
grouping and filtering with `.groupBy()` and `.having()` respectfully, same as you would do in raw SQL:

import { gt } from 'drizzle-orm';

await db.select({
age: users.age,

})
.from(users)
.groupBy(users.age);

})
.from(users)
.groupBy(users.age)

select "age", cast(count("id") as int)
from "users"
group by "age";

select "age", cast(count("id") as int)
from "users"
group by "age"

`cast(... as int)` is necessary because `count()` returns `bigint` in PostgreSQL and `decimal` in MySQL, which are treated as string values instead of numbers.
Alternatively, you can use `.mapWith(Number)` to cast the value to a number at runtime.

If you need count aggregation - we recommend using our `$count` API

### Aggregations helpers

Drizzle has a set of wrapped `sql` functions, so you don’t need to write
`sql` templates for common cases in your app

Remember, aggregation functions are often used with the GROUP BY clause of the SELECT statement.
So if you are selecting using aggregating functions and other columns in one query,
be sure to use the `.groupBy` clause

**count**

Returns the number of values in `expression`.

import { count } from 'drizzle-orm'

await db.select({ value: count() }).from(users);
await db.select({ value: count(users.id) }).from(users);
select count("_") from "users";
select count("id") from "users";
// It's equivalent to writing
await db.select({
value: sql`count('_'))`.mapWith(Number)
}).from(users);

await db.select({
value: sql`count(${users.id})`.mapWith(Number)
}).from(users);

**countDistinct**

Returns the number of non-duplicate values in `expression`.

import { countDistinct } from 'drizzle-orm'

await db.select({ value: countDistinct(users.id) }).from(users);
select count(distinct "id") from "users";
// It's equivalent to writing
await db.select({
value: sql`count(${users.id})`.mapWith(Number)
}).from(users);

**avg**

Returns the average (arithmetic mean) of all non-null values in `expression`.

import { avg } from 'drizzle-orm'

await db.select({ value: avg(users.id) }).from(users);
select avg("id") from "users";
// It's equivalent to writing
await db.select({
value: sql`avg(${users.id})`.mapWith(String)
}).from(users);

**avgDistinct**

import { avgDistinct } from 'drizzle-orm'

await db.select({ value: avgDistinct(users.id) }).from(users);
select avg(distinct "id") from "users";
// It's equivalent to writing
await db.select({
value: sql`avg(distinct ${users.id})`.mapWith(String)
}).from(users);

**sum**

Returns the sum of all non-null values in `expression`.

import { sum } from 'drizzle-orm'

await db.select({ value: sum(users.id) }).from(users);
select sum("id") from "users";
// It's equivalent to writing
await db.select({
value: sql`sum(${users.id})`.mapWith(String)
}).from(users);

**sumDistinct**

Returns the sum of all non-null and non-duplicate values in `expression`.

import { sumDistinct } from 'drizzle-orm'

await db.select({ value: sumDistinct(users.id) }).from(users);
select sum(distinct "id") from "users";
// It's equivalent to writing
await db.select({
value: sql`sum(distinct ${users.id})`.mapWith(String)
}).from(users);

**max**

Returns the maximum value in `expression`.

import { max } from 'drizzle-orm'

await db.select({ value: max(users.id) }).from(users);
select max("id") from "users";
// It's equivalent to writing
await db.select({
value: sql`max(${expression})`.mapWith(users.id)
}).from(users);

**min**

Returns the minimum value in `expression`.

import { min } from 'drizzle-orm'

await db.select({ value: min(users.id) }).from(users);
select min("id") from "users";
// It's equivalent to writing
await db.select({
value: sql`min(${users.id})`.mapWith(users.id)
}).from(users);

A more advanced example:

const orders = sqliteTable('order', {
id: integer('id').primaryKey(),
orderDate: integer('order_date', { mode: 'timestamp' }).notNull(),
requiredDate: integer('required_date', { mode: 'timestamp' }).notNull(),
shippedDate: integer('shipped_date', { mode: 'timestamp' }),
shipVia: integer('ship_via').notNull(),
freight: numeric('freight').notNull(),
shipName: text('ship_name').notNull(),
shipCity: text('ship_city').notNull(),
shipRegion: text('ship_region'),
shipPostalCode: text('ship_postal_code'),
shipCountry: text('ship_country').notNull(),
customerId: text('customer_id').notNull(),
employeeId: integer('employee_id').notNull(),
});

const details = sqliteTable('order_detail', {
unitPrice: numeric('unit_price').notNull(),
quantity: integer('quantity').notNull(),
discount: numeric('discount').notNull(),
orderId: integer('order_id').notNull(),
productId: integer('product_id').notNull(),
});

db
.select({
id: orders.id,
shippedDate: orders.shippedDate,
shipName: orders.shipName,
shipCity: orders.shipCity,
shipCountry: orders.shipCountry,

})
.from(orders)
.leftJoin(details, eq(orders.id, details.orderId))
.groupBy(orders.id)
.orderBy(asc(orders.id))
.all();

### $count

`db.$count()` is a utility wrapper of `count(*)`, it is a very flexible operator which can be used as is or as a subquery, more details in our GitHub discussion.

const count = await db.$count(users);
// ^? number

const count = await db.$count(users, eq(users.name, "Dan")); // works with filters
select count(_) from "users";
select count(_) from "users" where "name" = 'Dan';

It is exceptionally useful in subqueries:

const users = await db.select({
...users,
postsCount: db.$count(posts, eq(posts.authorId, users.id)),
}).from(users);

usage example with relational queries

const users = await db.query.users.findMany({
extras: {
postsCount: db.$count(posts, eq(posts.authorId, users.id)),
},
});

### Iterator

PostgreSQL\[WIP\]

SQLite\[WIP\]

SingleStore\[WIP\]

CockroachDB\[WIP\]

If you need to return a very large amount of rows from a query and you don’t want to load them all into memory, you can use `.iterator()` to convert the query into an async iterator:

const iterator = await db.select().from(users).iterator();

for await (const row of iterator) {
console.log(row);
}

It also works with prepared statements:

const query = await db.select().from(users).prepare();
const iterator = await query.iterator();

### Use Index

The `USE INDEX` hint suggests to the optimizer which indexes to consider when processing the query. The optimizer is not forced to use these indexes but will prioritize them if they are suitable.

export const users = mysqlTable('users', {
id: int('id').primaryKey(),
name: varchar('name', { length: 100 }).notNull(),

const usersTableNameIndex = index('users_name_index').on(users.name);

await db.select()
.from(users, { useIndex: usersTableNameIndex })
.where(eq(users.name, 'David'));

You can also use this option on any join you want

await db.select()
.from(users)
.leftJoin(posts, eq(posts.userId, users.id), { useIndex: usersTableNameIndex })
.where(eq(users.name, 'David'));

### Ignore Index

The `IGNORE INDEX` hint tells the optimizer to avoid using specific indexes for the query. MySQL will consider all other indexes (if any) or perform a full table scan if necessary.

await db.select()
.from(users, { ignoreIndex: usersTableNameIndex })
.where(eq(users.name, 'David'));

### Force Index

The `FORCE INDEX` hint forces the optimizer to use the specified index(es) for the query. If the specified index cannot be used, MySQL will not fall .notNull(),

await db.select()
.from(users, { forceIndex: usersTableNameIndex })
.where(eq(users.name, 'David'));

---

# https://orm.drizzle.team/docs/connect-overview

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Database connection with Drizzle

Drizzle ORM runs SQL queries on your database via **database drivers**.

index.ts

schema.ts

import { drizzle } from "drizzle-orm/node-postgres"
import { users } from "./schema"

const db = drizzle(process.env.DATABASE_URL);
const usersCount = await db.$count(users);
┌──────────────────────┐
│ db.$count(users) │ <--- drizzle query
└──────────────────────┘
│ ʌ
select count(\*) from users -│ │
│ │- [{ count: 0 }]
v │
┌─────────────────────┐
│ node-postgres │ <--- database driver
└─────────────────────┘
│ ʌ
01101000 01100101 01111001 -│ │
│ │- 01110011 01110101 01110000
v │
┌────────────────────┐
│ Database │
└────────────────────┘
import { pgTable, integer, text } from "drizzle-orm";

export const users = pgTable("users", {
id: integer("id").generateAlwaysAsIdentity(),
name: text("name"),
})

Under the hood Drizzle will create a **node-postgres** driver instance which you can access via `db.$client` if necessary

import { drizzle } from "drizzle-orm/node-postgres"

const db = drizzle(process.env.DATABASE_URL);
const pool = db.$client;
// above is equivalent to
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
});
const db = drizzle({ client: pool });

Drizzle is by design natively compatible with every **edge** or **serverless** runtime, whenever you’d need access to a serverless database - we’ve got you covered

Neon HTTP

Neon with websockets

Vercel Postgres

PlanetScale HTTP

Cloudflare d1

import { drizzle } from "drizzle-orm/neon-http";

const db = drizzle(process.env.DATABASE_URL);
import { drizzle } from "drizzle-orm/neon-serverless";

const db = drizzle(process.env.DATABASE_URL);
import { drizzle } from "drizzle-orm/vercel-postgres";

const db = drizzle();
import { drizzle } from "drizzle-orm/planetscale";

const db = drizzle(process.env.DATABASE_URL);
import { drizzle } from "drizzle-orm/d1";

const db = drizzle({ connection: env.DB });

And yes, we do support runtime specific drivers like Bun SQLite or Expo SQLite:

import { drizzle } from "drizzle-orm/bun-sqlite"

const db = drizzle(); // <--- will create an in-memory db
const db = drizzle("./sqlite.db");
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

const expo = openDatabaseSync("db.db");
const db = drizzle(expo);

#### Database connection URL

Just in case if you’re not familiar with database connection URL concept

postgresql://alex:AbC123dEf@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname
└──┘ └───────┘ └─────────────────────────────────────────────┘ └────┘
ʌ ʌ ʌ ʌ
role -│ │ │- hostname │- database
│
│- password

#### Next steps

Feel free to check out per-driver documentations

**PostgreSQL drivers**

PostgreSQL Neon Vercel Postgres Supabase Xata PGLite

**MySQL drivers**

MySQL PlanetsScale TiDB

**SQLite drivers**

SQLite Turso Cloud Turso Database Cloudflare D1 Bun SQLite SQLite Cloud

**Native SQLite**

Expo SQLite OP SQLite React Native SQLite

**Others**

Drizzle Proxy

---

# https://orm.drizzle.team/docs/goodies

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

## Type API

To retrieve a type from your table schema for `select` and `insert` queries, you can make use of our type helpers.

PostgreSQL

MySQL

SQLite

SingleStore

MSSQL

CockroachDB

import { serial, text, pgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
});

type SelectUser = typeof users.$inferSelect;
type InsertUser = typeof users.$inferInsert;
// or
type SelectUser = typeof users._.$inferSelect;
type InsertUser = typeof users._.$inferInsert;
// or

import { int, text, mysqlTable } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

const users = mysqlTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
});

import { int, text, sqliteTable } from 'drizzle-orm/sqlite-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

const users = sqliteTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
});

import { int, text, singlestoreTable } from 'drizzle-orm/singlestore-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

const users = singlestoreTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
});

import { int, text, mssqlTable } from 'drizzle-orm/mssql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

const users = mssqlTable('users', {
id: int().primaryKey(),
name: text().notNull(),
});

import { int4, text, cockroachTable } from 'drizzle-orm/cockroach-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

const users = cockroachTable('users', {
id: int4().primaryKey(),
name: text().notNull(),
});

## Logging

To enable default query logging, just pass `{ logger: true }` to the `drizzle` initialization function:

import { drizzle } from 'drizzle-orm/...'; // driver specific

const db = drizzle({ logger: true });

You can change the logs destination by creating a `DefaultLogger` instance and providing a custom `writer` to it:

import { DefaultLogger, LogWriter } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/...'; // driver specific

class MyLogWriter implements LogWriter {
write(message: string) {
// Write to file, stdout, etc.
}
}

const logger = new DefaultLogger({ writer: new MyLogWriter() });
const db = drizzle({ logger });

You can also create a custom logger:

import { Logger } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/...'; // driver specific

class MyLogger implements Logger {
logQuery(query: string, params: unknown[]): void {
console.log({ query, params });
}
}

const db = drizzle({ logger: new MyLogger() });

## Multi-project schema

**Table creator** API lets you define customize table names.

It’s very useful when you need to keep schemas of different projects in one database.

import { serial, text, pgTableCreator } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
});
import { int, text, mysqlTableCreator } from 'drizzle-orm/mysql-core';

const users = mysqlTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
});
import { int, text, sqliteTableCreator } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
});
import { int, text, singlestoreTableCreator } from 'drizzle-orm/singlestore-core';

const users = singlestoreTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
});
import { int, text, mssqlTableCreator } from 'drizzle-orm/mssql-core';

const users = mssqlTable('users', {
id: int().primaryKey(),
name: text().notNull(),
});
import { int4, text, cockroachTableCreator } from 'drizzle-orm/cockroach-core';

const users = pgTable('users', {
id: int4().primaryKey(),
name: text().notNull(),
});
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/schema/_",
out: "./drizzle",
dialect: "mysql",
dbCredentials: {
url: process.env.DATABASE*URL,
}
tablesFilter: ["project1*_"],
});

You can apply multiple `or` filters:

tablesFilter: ["project1_*", "project2_*"]

## Printing SQL query

You can print SQL queries with `db` instance or by using **`standalone query builder`**.

const query = db
.select({ id: users.id, name: users.name })
.from(users)
.groupBy(users.id)
.toSQL();
// query:
{
sql: 'select 'id', 'name' from 'users' group by 'users'.'id'',
params: [],
}

## Raw SQL queries execution

If you have some complex queries to execute and `drizzle-orm` can’t handle them yet,
you can use the `db.execute` method to execute raw `parametrized` queries.

const statement = sql`select * from ${users} where ${users.id} = ${userId}`;

import { ..., MySqlQueryResult } from "drizzle-orm/mysql2";

const statement = sql`select * from ${users} where ${users.id} = ${userId}`;
const res: MySqlRawQueryResult = await db.execute(statement);
const statement = sql`select * from ${users} where ${users.id} = ${userId}`;

const res: unknown[] = db.all(statement)
const res: unknown = db.get(statement)
const res: unknown[][] = db.values(statement)
const res: Database.RunResult = db.run(statement)
import { ..., SingleStoreQueryResult } from "drizzle-orm/singlestore";

const statement = sql`select * from ${users} where ${users.id} = ${userId}`;
const res: SingleStoreRawQueryResult = await db.execute(statement);
import { sql } from "drizzle-orm";

const statement = sql`select * from ${users} where ${users.id} = ${userId}`;
const res = await db.execute(statement);
const statement = sql`select * from ${users} where ${users.id} = ${userId}`;
const res = await db.execute(statement)

## Standalone query builder

Drizzle ORM provides a standalone query builder that allows you to build queries
without creating a database instance and get generated SQL.

import { QueryBuilder } from 'drizzle-orm/pg-core';

const qb = new QueryBuilder();

const query = qb.select().from(users).where(eq(users.name, 'Dan'));
const { sql, params } = query.toSQL();
import { QueryBuilder } from 'drizzle-orm/mysql-core';

const query = qb.select().from(users).where(eq(users.name, 'Dan'));
const { sql, params } = query.toSQL();
import { QueryBuilder } from 'drizzle-orm/sqlite-core';

const query = qb.select().from(users).where(eq(users.name, 'Dan'));
const { sql, params } = query.toSQL();
import { QueryBuilder } from 'drizzle-orm/singlestore-core';

const query = qb.select().from(users).where(eq(users.name, 'Dan'));
const { sql, params } = query.toSQL();
import { QueryBuilder } from 'drizzle-orm/mssql-core';

const query = qb.select().from(users).where(eq(users.name, 'Dan'));
const { sql, params } = query.toSQL();
import { QueryBuilder } from 'drizzle-orm/cockroach-core';

const query = qb.select().from(users).where(eq(users.name, 'Dan'));
const { sql, params } = query.toSQL();

## Get typed columns

You can get a typed columns map,
very useful when you need to omit certain columns upon selection.

IMPORTANT

`getColumns` available starting from `drizzle-orm@1.0.0-beta.2`(read more here)

If you are on pre-1 version(like `0.45.1`) then use `getTableColumns`

index.ts

schema.ts

import { getColumns } from "drizzle-orm";
import { user } from "./schema";

const { password, role, ...rest } = getColumns(user);

await db.select({ ...rest }).from(users);
import { serial, text, pgTable } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
id: serial("id").primaryKey(),
name: text("name"),
email: text("email"),
password: text("password"),

});

await db.select({ ...rest }).from(users);
import { int, text, mysqlTable } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),
email: text("email"),
password: text("password"),

await db.select({ ...rest }).from(users);
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
id: integer("id").primaryKey({ autoIncrement: true }),
name: text("name"),
email: text("email"),
password: text("password"),

await db.select({ ...rest }).from(users);
import { int, text, singlestoreTable } from "drizzle-orm/singlestore-core";

export const user = singlestoreTable("user", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),
email: text("email"),
password: text("password"),

await db.select({ ...rest }).from(users);
import { int, text, mssqlTable } from "drizzle-orm/mssql-core";

export const user = mssqlTable("user", {
id: int().primaryKey(),
name: text(),
email: text(),
password: text(),

await db.select({ ...rest }).from(users);
import { int4, text, pgTable } from "drizzle-orm/cockroach-core";

export const user = pgTable("user", {
id: int4().primaryKey(),
name: text(),
email: text(),
password: text(),

## Get table information

import { getTableConfig, pgTable } from 'drizzle-orm/pg-core';

export const table = pgTable(...);

const {
columns,
indexes,
foreignKeys,
checks,
primaryKeys,
name,
schema,
} = getTableConfig(table);
import { getTableConfig, mysqlTable } from 'drizzle-orm/mysql-core';

export const table = mysqlTable(...);

const {
columns,
indexes,
foreignKeys,
checks,
primaryKeys,
name,
schema,
} = getTableConfig(table);
import { getTableConfig, sqliteTable } from 'drizzle-orm/sqlite-core';

export const table = sqliteTable(...);

const {
columns,
indexes,
foreignKeys,
checks,
primaryKeys,
name,
schema,
} = getTableConfig(table);
import { getTableConfig, mysqlTable } from 'drizzle-orm/singlestore-core';

export const table = singlestoreTable(...);

const {
columns,
indexes,
checks,
primaryKeys,
name,
schema,
} = getTableConfig(table);
import { getTableConfig, mssqlTable } from 'drizzle-orm/mssql-core';

export const table = mssqlTable(...);

const {
columns,
indexes,
checks,
primaryKeys,
name,
schema,
} = getTableConfig(table);
import { getTableConfig, cockroachTable } from 'drizzle-orm/cockroach-core';

export const table = cockroachTable(...);

const {
columns,
indexes,
foreignKeys,
checks,
primaryKeys,
name,
schema,
} = getTableConfig(table);

## Compare objects types (instanceof alternative)

You can check if an object is of a specific Drizzle type using the `is()` function.
You can use it with any available type in Drizzle.

You should always use `is()` instead of `instanceof`

**Few examples**

import { Column, is } from 'drizzle-orm';

if (is(value, Column)) {
// value's type is narrowed to Column
}

### Mock Driver

This API is a successor to an undefined `drizzle({} as any)` API which we’ve used internally in Drizzle tests and rarely recommended to external developers.

We decided to build and expose a proper API, every `drizzle` driver now has `drizzle.mock()`:

import { drizzle } from "drizzle-orm/...";

const db = drizzle.mock();

you can provide schema if necessary for types

import { drizzle } from "drizzle-orm/...";
import \* as schema from "./schema"

const db = drizzle.mock({ schema });

---

# https://orm.drizzle.team/docs/operators

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Filter and conditional operators

We natively support all dialect specific filter and conditional operators.

You can import all filter & conditional from `drizzle-orm`:

import { eq, ne, gt, gte, ... } from "drizzle-orm";

### eq

PostgreSQL

MySQL

SQLite

SingleStore

Value equal to `n`

import { eq } from "drizzle-orm";

db.select().from(table).where(eq(table.column, 5));
SELECT \* FROM table WHERE table.column = 5
import { eq } from "drizzle-orm";

db.select().from(table).where(eq(table.column1, table.column2));
SELECT \* FROM table WHERE table.column1 = table.column2

### ne

Value is not equal to `n`

import { ne } from "drizzle-orm";

db.select().from(table).where(ne(table.column, 5));

db.select().from(table).where(ne(table.column1, table.column2));

## \-\-\-

### gt

Value is greater than `n`

import { gt } from "drizzle-orm";

db.select().from(table).where(gt(table.column, 5));

db.select().from(table).where(gt(table.column1, table.column2));

### gte

Value is greater than or equal to `n`

import { gte } from "drizzle-orm";

db.select().from(table).where(gte(table.column, 5));

db.select().from(table).where(gte(table.column1, table.column2));

### lt

Value is less than `n`

import { lt } from "drizzle-orm";

db.select().from(table).where(lt(table.column, 5));
SELECT \* FROM table WHERE table.column < 5
import { lt } from "drizzle-orm";

db.select().from(table).where(lt(table.column1, table.column2));
SELECT \* FROM table WHERE table.column1 < table.column2

### lte

Value is less than or equal to `n`.

import { lte } from "drizzle-orm";

db.select().from(table).where(lte(table.column, 5));
SELECT \* FROM table WHERE table.column <= 5
import { lte } from "drizzle-orm";

db.select().from(table).where(lte(table.column1, table.column2));
SELECT \* FROM table WHERE table.column1 <= table.column2

### exists

Value exists

import { exists } from "drizzle-orm";

const query = db.select().from(table2)
db.select().from(table).where(exists(query));
SELECT _ FROM table WHERE EXISTS (SELECT _ from table2)

### notExists

import { notExists } from "drizzle-orm";

const query = db.select().from(table2)
db.select().from(table).where(notExists(query));
SELECT _ FROM table WHERE NOT EXISTS (SELECT _ from table2)

### isNull

Value is `null`

import { isNull } from "drizzle-orm";

db.select().from(table).where(isNull(table.column));
SELECT \* FROM table WHERE table.column IS NULL

### isNotNull

Value is not `null`

import { isNotNull } from "drizzle-orm";

db.select().from(table).where(isNotNull(table.column));
SELECT \* FROM table WHERE table.column IS NOT NULL

### inArray

Value is in array of values

import { inArray } from "drizzle-orm";

db.select().from(table).where(inArray(table.column, [1, 2, 3, 4]));
SELECT \* FROM table WHERE table.column in (1, 2, 3, 4)
import { inArray } from "drizzle-orm";

const query = db.select({ data: table2.column }).from(table2);
db.select().from(table).where(inArray(table.column, query));
SELECT \* FROM table WHERE table.column IN (SELECT table2.column FROM table2)

### notInArray

Value is not in array of values

import { notInArray } from "drizzle-orm";

db.select().from(table).where(notInArray(table.column, [1, 2, 3, 4]));
SELECT \* FROM table WHERE table.column NOT in (1, 2, 3, 4)
import { notInArray } from "drizzle-orm";

const query = db.select({ data: table2.column }).from(table2);
db.select().from(table).where(notInArray(table.column, query));
SELECT \* FROM table WHERE table.column NOT IN (SELECT table2.column FROM table2)

### between

Value is between two values

import { between } from "drizzle-orm";

db.select().from(table).where(between(table.column, 2, 7));
SELECT \* FROM table WHERE table.column BETWEEN 2 AND 7

### notBetween

Value is not between two value

import { notBetween } from "drizzle-orm";

db.select().from(table).where(notBetween(table.column, 2, 7));
SELECT \* FROM table WHERE table.column NOT BETWEEN 2 AND 7

### like

Value is like other value, case sensitive

import { like } from "drizzle-orm";

db.select().from(table).where(like(table.column, "%llo wor%"));
SELECT \* FROM table WHERE table.column LIKE '%llo wor%'

### ilike

Value is like some other value, case insensitive

import { ilike } from "drizzle-orm";

db.select().from(table).where(ilike(table.column, "%llo wor%"));
SELECT \* FROM table WHERE table.column ILIKE '%llo wor%'

### notIlike

Value is not like some other value, case insensitive

import { notIlike } from "drizzle-orm";

db.select().from(table).where(notIlike(table.column, "%llo wor%"));
SELECT \* FROM table WHERE table.column NOT ILIKE '%llo wor%'

### not

All conditions must return `false`.

import { eq, not } from "drizzle-orm";

db.select().from(table).where(not(eq(table.column, 5)));
SELECT \* FROM table WHERE NOT (table.column = 5)

### and

All conditions must return `true`.

import { gt, lt, and } from "drizzle-orm";

db.select().from(table).where(and(gt(table.column, 5), lt(table.column, 7)));

### or

One or more conditions must return `true`.

import { gt, lt, or } from "drizzle-orm";

db.select().from(table).where(or(gt(table.column, 5), lt(table.column, 7)));

### arrayContains

Test that a column or expression contains all elements of the list passed as the second argument

import { arrayContains } from "drizzle-orm";

const contains = await db.select({ id: posts.id }).from(posts)
.where(arrayContains(posts.tags, ['Typescript', 'ORM']));

const withSubQuery = await db.select({ id: posts.id }).from(posts)
.where(arrayContains(
posts.tags,
db.select({ tags: posts.tags }).from(posts).where(eq(posts.id, 1)),
));

### arrayContained

Test that the list passed as the second argument contains all elements of a column or expression

import { arrayContained } from "drizzle-orm";

const contained = await db.select({ id: posts.id }).from(posts)
.where(arrayContained(posts.tags, ['Typescript', 'ORM']));
select "id" from "posts" where "posts"."tags" <@ {Typescript,ORM};

### arrayOverlaps

Test that a column or expression contains any elements of the list passed as the second argument.

import { arrayOverlaps } from "drizzle-orm";

const overlaps = await db.select({ id: posts.id }).from(posts)
.where(arrayOverlaps(posts.tags, ['Typescript', 'ORM']));
select "id" from "posts" where "posts"."tags" && {Typescript,ORM}

---

# https://orm.drizzle.team/docs/perf-queries

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Query performance

When it comes to **Drizzle** — we’re a thin TypeScript layer on top of SQL with
almost 0 overhead and to make it actual 0, you can utilise our prepared statements API.

**When you run a query on the database, there are several things that happen:**

- all the configurations of the query builder got concatenated to the SQL string
- that string and params are sent to the database driver
- driver compiles SQL query to the binary SQL executable format and sends it to the database

With prepared statements you do SQL concatenation once on the Drizzle ORM side and then database
driver is able to reuse precompiled binary SQL instead of parsing query all the time.
It has extreme performance benefits on large SQL queries.

Different database drivers support prepared statements in different ways and sometimes
Drizzle ORM you can go **faster than better-sqlite3 driver.**

## Prepared statement

PostgreSQL

MySQL

SQLite

SingleStore

const db = drizzle(...);

const prepared = db.select().from(customers).prepare("statement_name");

const res1 = await prepared.execute();
const res2 = await prepared.execute();
const res3 = await prepared.execute();
const db = drizzle(...);

const prepared = db.select().from(customers).prepare();

const res1 = prepared.all();
const res2 = prepared.all();
const res3 = prepared.all();
const db = drizzle(...);

const res1 = await prepared.execute();
const res2 = await prepared.execute();
const res3 = await prepared.execute();

## Placeholder

Whenever you need to embed a dynamic runtime value - you can use the `sql.placeholder(...)` api

import { sql } from "drizzle-orm";

const p1 = db
.select()
.from(customers)
.where(eq(customers.id, sql.placeholder('id')))
.prepare("p1")

await p1.execute({ id: 10 }) // SELECT _ FROM customers WHERE id = 10
await p1.execute({ id: 12 }) // SELECT _ FROM customers WHERE id = 12

const p2 = db
.select()
.from(customers)
.where(sql`lower(${customers.name}) like ${sql.placeholder('name')}`)
.prepare("p2");

await p2.execute({ name: '%an%' }) // SELECT \* FROM customers WHERE name ilike '%an%'
import { sql } from "drizzle-orm";

const p1 = db
.select()
.from(customers)
.where(eq(customers.id, sql.placeholder('id')))
.prepare()

const p2 = db
.select()
.from(customers)
.where(sql`lower(${customers.name}) like ${sql.placeholder('name')}`)
.prepare();

p1.get({ id: 10 }) // SELECT _ FROM customers WHERE id = 10
p1.get({ id: 12 }) // SELECT _ FROM customers WHERE id = 12

p2.all({ name: '%an%' }) // SELECT \* FROM customers WHERE name ilike '%an%'
import { sql } from "drizzle-orm";

await p2.execute({ name: '%an%' }) // SELECT \* FROM customers WHERE name ilike '%an%'

---

# https://orm.drizzle.team/docs/select)\*\*.

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/connect-overview)\*\*

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/operators)\*\*.

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/select)\*\*

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/perf-queries)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-config-file

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Drizzle Kit configuration file

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here
- Drizzle Kit overview and config file

Drizzle Kit lets you declare configuration options in `TypeScript` or `JavaScript` configuration files.

├ 📂 drizzle
├ 📂 src
├ 📜 drizzle.config.ts
└ 📜 package.json

drizzle.config.ts

drizzle.config.js

import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
out: "./drizzle",
});
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
out: "./drizzle",
});

Example of an extended config file

export default defineConfig({
out: "./drizzle",
dialect: "postgresql",
schema: "./src/schema.ts",

driver: "pglite",
dbCredentials: {
url: "./database/",
},

extensionsFilters: ["postgis"],
schemaFilter: "public",
tablesFilter: "\*",

introspect: {
casing: "camel",
},

migrations: {
prefix: "timestamp",
table: "**drizzle_migrations**",
schema: "public",
},

entities: {
roles: {
provider: '',
exclude: [],
include: []
}
},

breakpoints: true,
strict: true,
verbose: true,
});

Expand

### Multiple configuration files

You can have multiple config files in the project, it’s very useful when you have multiple database stages or multiple databases or different databases on the same project:

npm

yarn

pnpm

bun

npx drizzle-kit generate --config=drizzle-dev.config.ts
npx drizzle-kit generate --config=drizzle-prod.config.ts
yarn drizzle-kit generate --config=drizzle-dev.config.ts
yarn drizzle-kit generate --config=drizzle-prod.config.ts
pnpm drizzle-kit generate --config=drizzle-dev.config.ts
pnpm drizzle-kit generate --config=drizzle-prod.config.ts
bunx drizzle-kit generate --config=drizzle-dev.config.ts
bunx drizzle-kit generate --config=drizzle-prod.config.ts

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

### Migrations folder

`out` param lets you define folder for your migrations, it’s optional and `drizzle` by default.

It’s very useful since you can have many separate schemas for different databases in the same project
and have different migration folders for them.

Migration folder contains folders with `.sql` migration files which is used by `drizzle-kit`

├ 📂 drizzle
│ ├ 📂 20242409125510_premium_mister_fear
│ ├ 📜 user.ts
│ ├ 📜 post.ts
│ └ 📜 comment.ts
├ 📂 src
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql", // "mysql" | "sqlite" | "postgresql" | "turso" | "singlestore" | "mssql"
schema: "./src/schema/\*",
out: "./drizzle",
});

## \-\-\-

### `dialect`

Dialect of the database you’re using

|          |                                                                     |
| -------- | ------------------------------------------------------------------- |
| type     | `postgresql``mysql``sqlite``turso``singlestore``mssql``cockroachdb` |
| default  | —                                                                   |
| commands | `generate``migrate``push``pull``check``up`                          |

export default defineConfig({
dialect: "mysql",
});

### `schema`

`glob`
based path to drizzle schema file(s) or folder(s) contaning schema files.

|          |                    |
| -------- | ------------------ |
| type     | `string``string[]` |
| default  | —                  |
| commands | `generate``push`   |

Example 1

Example 2

Example 3

Example 4

├ 📂 drizzle
├ 📂 src
│ ├ ...
│ ├ 📜 index.ts
│ └ 📜 schema.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/schema.ts",
});

├ 📂 drizzle
├ 📂 src
│ ├ 📂 user
│ │ ├ 📜 handler.ts
│ │ └ 📜 schema.ts
│ ├ 📂 posts
│ │ ├ 📜 handler.ts
│ │ └ 📜 schema.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/\*\*/schema.ts",
//or
schema: ["./src/user/schema.ts", "./src/posts/schema.ts"]
});

├ 📂 drizzle
├ 📂 src
│ ├ 📂 schema
│ │ ├ 📜 user.ts
│ │ ├ 📜 post.ts
│ │ └ 📜 comment.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/schema/\*",
});

├ 📂 drizzle
├ 📂 src
│ ├ 📜 userById.ts
│ ├ 📜 userByEmail.ts
│ ├ 📜 listUsers.ts
│ ├ 📜 user.sql.ts
│ ├ 📜 postById.ts
│ ├ 📜 listPosts.ts
│ └ 📜 post.sql.ts
│ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/\*_/_.sql.ts", // Dax's favourite
});

### `out`

Defines output folder of your SQL migration files, json snapshots of your schema and `schema.ts` from `drizzle-kit pull` command.

|          |                                            |
| -------- | ------------------------------------------ |
| type     | `string``string[]`                         |
| default  | `drizzle`                                  |
| commands | `generate``migrate``push``pull``check``up` |

export default defineConfig({
out: "./drizzle",
});

### `driver`

Drizzle Kit automatically picks available database driver from your current project based on the provided `dialect`,
yet some vendor specific databases require a different subset of connection params.

`driver` option let’s you explicitely pick those exceptions drivers.

|          |                                  |
| -------- | -------------------------------- |
| type     | `aws-data-api``d1-http``pglight` |
| default  | —                                |
| commands | `migrate``push``pull`            |

AWS Data API

PGLite

Cloudflare D1 HTTP

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
driver: "aws-data-api",
dbCredentials: {
database: "database",
resourceArn: "resourceArn",
secretArn: "secretArn",
},
});
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
driver: "pglite",
dbCredentials: {
// inmemory
url: ":memory:"

// or database folder
url: "./database/"
},
});
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "sqlite",
schema: "./src/schema.ts",
driver: "d1-http",
dbCredentials: {
accountId: "accountId",
databaseId: "databaseId",
token: "token",
},
});

### `dbCredentials`

Database connection credentials in a form of `url`,
`user:password@host:port/db` params or exceptions drivers(`aws-data-api``d1-http``pglight` ) specific connection options.

|          |                                     |
| -------- | ----------------------------------- |
| type     | union of drivers connection options |
| default  | —                                   |
| commands | `migrate``push``pull`               |

PostgreSQL

MySQL

SQLite

Turso

Cloudflare D1

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
dialect: "postgresql",
dbCredentials: {
url: "postgres://user:password@host:port/db",
}
});
import { defineConfig } from 'drizzle-kit'

// via connection params
export default defineConfig({
dialect: "postgresql",
dbCredentials: {
host: "host",
port: 5432,
user: "user",
password: "password",
database: "dbname",
ssl: true, // can be boolean | "require" | "allow" | "prefer" | "verify-full" | options from node:tls
}
});
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
dialect: "mysql",
dbCredentials: {
url: "mysql://user:password@host:port/db",
}
});
import { defineConfig } from 'drizzle-kit'

// via connection params
export default defineConfig({
dialect: "mysql",
dbCredentials: {
host: "host",
port: 5432,
user: "user",
password: "password",
database: "dbname",
ssl: "...", // can be: string | SslOptions (ssl options from mysql2 package)
}
});
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
dialect: "sqlite",
dbCredentials: {
url: ":memory:", // inmemory database
// or
url: "sqlite.db",
// or
url: "file:sqlite.db" // file: prefix is required by libsql
}
});
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
dialect: "turso",
dbCredentials: {
url: "libsql://acme.turso.io" // remote Turso database url
authToken: "...",

// or if you need local db

url: ":memory:", // inmemory database
// or
url: "file:sqlite.db", // file: prefix is required by libsql
}
});
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
dialect: "sqlite",
driver: "d1-http",
dbCredentials: {
accountId: "",
databaseId: "",
token: "",
}
});
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
dialect: "postgresql",
driver: "aws-data-api",
dbCredentials: {
database: "database",
resourceArn: "resourceArn",
secretArn: "secretArn",
},
});
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
dialect: "postgresql",
driver: "pglite",
dbCredentials: {
url: "./database/", // database folder path
}
});

### `migrations`

When running `drizzle-kit migrate` \- drizzle will records about
successfully applied migrations in your database in log table named `__drizzle_migrations` in `public` schema(PostgreSQL only).

`migrations` config options lets you change both migrations log `table` name and `schema`.

|          |                                                        |
| -------- | ------------------------------------------------------ |
| type     | `{ table: string, schema: string }`                    |
| default  | `{ table: "__drizzle_migrations", schema: "drizzle" }` |
| commands | `migrate`                                              |

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
migrations: {
table: 'my-migrations-table', // `__drizzle_migrations` by default
schema: 'public', // used in PostgreSQL only, `drizzle` by default
},
});

### `introspect`

Configuration for `drizzle-kit pull` command.

`casing` is responsible for in-code column keys casing

|          |                       |
| -------- | --------------------- | ---------- |
| type     | `{ casing: "preserve" | "camel" }` |
| default  | `{ casing: "camel" }` |
| commands | `pull`                |

camel

preserve

import \* as p from "drizzle-orm/pg-core"

export const users = p.pgTable("users", {
id: p.serial(),
firstName: p.text("first-name"),
lastName: p.text("LastName"),
email: p.text(),
phoneNumber: p.text("phone_number"),
});
SELECT a.attname AS column_name, format_type(a.atttypid, a.atttypmod) as data_type FROM pg_catalog.pg_attribute a;
column_name | data_type
---------------+------------------------
id | serial
first-name | text
LastName | text
email | text
phone_number | text
import \* as p from "drizzle-orm/pg-core"

export const users = p.pgTable("users", {
id: p.serial(),
"first-name": p.text("first-name"),
LastName: p.text("LastName"),
email: p.text(),
phone_number: p.text("phone_number"),
});
SELECT a.attname AS column_name, format_type(a.atttypid, a.atttypmod) as data_type FROM pg_catalog.pg_attribute a;
column_name | data_type
---------------+------------------------
id | serial
first-name | text
LastName | text
email | text
phone_number | text

### `tablesFilter`

If you want to run multiple projects with one database - check out our guide.

`drizzle-kit push` and `drizzle-kit pull` will by default manage all tables in `public` schema.
You can configure list of tables, schemas and extensions via `tablesFilters`, `schemaFilter` and `extensionFilters` options.

`tablesFilter` option lets you specify `glob`
based table names filter, e.g. `["users", "user_info"]` or `"user*"`

|          |                        |
| -------- | ---------------------- |
| type     | `string``string[]`     |
| default  | —                      |
| commands | `generate``push``pull` |

export default defineConfig({
dialect: "postgresql",
tablesFilter: ["users", "posts", "project1_*"],
});

### `schemaFilter`

Was changed starting from `1.0.0-beta.1` version!

IMPORTANT

How it works in 0.x versions

`schemaFilter` option lets you specify list of schemas for Drizzle Kit to manage

|          |              |
| -------- | ------------ |
| type     | `string[]`   |
| default  | `["public"]` |
| commands | `push``pull` |

`drizzle-kit push` and `drizzle-kit pull` will by default manage all schemas.

`schemaFilter` option lets you specify `glob`
based schema names filter, e.g. `["public", "auth"]` or `"tenant_*"`

|          |              |
| -------- | ------------ |
| type     | `string[]`   |
| commands | `push``pull` |

export default defineConfig({
dialect: "postgresql",
schemaFilter: ["public", "schema1", "schema2"],
});

### `extensionsFilters`

Some extensions like `postgis`, when installed on the database, create its own tables in public schema.
Those tables have to be ignored by `drizzle-kit push` or `drizzle-kit pull`.

`extensionsFilters` option lets you declare list of installed extensions for drizzle kit to ignore their tables in the schema.

|          |               |
| -------- | ------------- |
| type     | `["postgis"]` |
| default  | `[]`          |
| commands | `push``pull`  |

export default defineConfig({
dialect: "postgresql",
extensionsFilters: ["postgis"],
});

### `entities`

This configuration is created to set up management settings for specific `entities` in the database.

For now, it only includes `roles`, but eventually all database entities will migrate here, such as `tables`, `schemas`, `extensions`, `functions`, `triggers`, etc

#### `roles`

If you are using Drizzle Kit to manage your schema and especially the defined roles, there may be situations where you have some roles that are not defined in the Drizzle schema.
In such cases, you may want Drizzle Kit to skip those `roles` without the need to write each role in your Drizzle schema and mark it with `.existing()`.

The `roles` option lets you:

- Enable or disable role management with Drizzle Kit.
- Exclude specific roles from management by Drizzle Kit.
- Include specific roles for management by Drizzle Kit.
- Enable modes for providers like `Neon` and `Supabase`, which do not manage their specific roles.
- Combine all the options above

|          |                        |
| -------- | ---------------------- | ------------------ | -------------------------------------------------- |
| type     | `boolean               | { provider: "neon" | "supabase", include: string[], exclude: string[]}` |
| default  | `false`                |
| commands | `push``pull``generate` |

By default, `drizzle-kit` won’t manage roles for you, so you will need to enable that. in `drizzle.config.ts`

export default defineConfig({
dialect: "postgresql",
entities: {
roles: true
}
});

**You have a role `admin` and want to exclude it from the list of manageable roles**

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
...
entities: {
roles: {
exclude: ['admin']
}
}
});

**You have a role `admin` and want to include to the list of manageable roles**

export default defineConfig({
...
entities: {
roles: {
include: ['admin']
}
}
});

**If you are using `Neon` and want to exclude roles defined by `Neon`, you can use the provider option**

export default defineConfig({
...
entities: {
roles: {
provider: 'neon'
}
}
});

**If you are using `Supabase` and want to exclude roles defined by `Supabase`, you can use the provider option**

export default defineConfig({
...
entities: {
roles: {
provider: 'supabase'
}
}
});

important

You may encounter situations where Drizzle is slightly outdated compared to new roles specified by database providers,
so you may need to use both the `provider` option and `exclude` additional roles. You can easily do this with Drizzle:

export default defineConfig({
...
entities: {
roles: {
provider: 'supabase',
exclude: ['new_supabase_role']
}
}
});

### `strict`

Prompts confirmation to run printed SQL statements when running `drizzle-kit push` command.

|          |           |
| -------- | --------- |
| type     | `boolean` |
| default  | `false`   |
| commands | `push`    |

export default defineConfig({
dialect: "postgresql",
strict: false,
});

### `verbose`

Print all SQL statements during `drizzle-kit push` command.

|          |                  |
| -------- | ---------------- |
| type     | `boolean`        |
| default  | `true`           |
| commands | `generate``pull` |

export default defineConfig({
dialect: "postgresql",
verbose: false,
});

### `breakpoints`

that’s necessary for databases that do not support multiple DDL alternation statements in one transaction(MySQL and SQLite).

`breakpoints` option flag lets you switch it on and off

export default defineConfig({
dialect: "postgresql",
breakpoints: false,
});

---

# https://orm.drizzle.team/docs/get-started-postgresql

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

This guide assumes familiarity with:

- Database connection basics with Drizzle
- node-postgres basics
- postgres.js basics

Drizzle has native support for PostgreSQL connections with the `node-postgres` and `postgres.js` drivers.

There are a few differences between the `node-postgres` and `postgres.js` drivers that we discovered while using both and integrating them with the Drizzle ORM. For example:

- With `node-postgres`, you can install `pg-native` to boost the speed of both `node-postgres` and Drizzle by approximately 10%.
- `node-postgres` supports providing type parsers on a per-query basis without globally patching things. For more details, see Types Docs.
- `postgres.js` uses prepared statements by default, which you may need to opt out of. This could be a potential issue in AWS environments, among others, so please keep that in mind.
- If there’s anything else you’d like to contribute, we’d be happy to receive your PRs here

## node-postgres

#### Step 1 - Install packages

npm

yarn

pnpm

bun

npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
yarn add drizzle-orm pg
yarn add -D drizzle-kit @types/pg
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
bun add drizzle-orm pg
bun add -D drizzle-kit @types/pg

#### Step 2 - Initialize the driver and make a query

node-postgres

node-postgres with config

// Make sure to install the 'pg' package
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute('select 1');
// Make sure to install the 'pg' package
import { drizzle } from 'drizzle-orm/node-postgres';

// You can specify any property from the node-postgres connection options
const db = drizzle({
connection: {
connectionString: process.env.DATABASE_URL,
ssl: true
}
});

const result = await db.execute('select 1');

If you need to provide your existing driver:

// Make sure to install the 'pg' package
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
});
const db = drizzle({ client: pool });

## postgres.js

#### Step 1 - Install packages

npm i drizzle-orm postgres
npm i -D drizzle-kit
yarn add drizzle-orm postgres
yarn add -D drizzle-kit
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
bun add drizzle-orm postgres
bun add -D drizzle-kit

#### Step 2 - Initialize the driver and make a query

postgres.js

postgres.js with config

import { drizzle } from 'drizzle-orm/postgres-js';

const result = await db.execute('select 1');
import { drizzle } from 'drizzle-orm/postgres-js';

// You can specify any property from the postgres-js connection options
const db = drizzle({
connection: {
url: process.env.DATABASE_URL,
ssl: true
}
});

// Make sure to install the 'postgres' package
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres(process.env.DATABASE_URL);
const db = drizzle({ client: queryClient });

#### What’s next?

**Manage schema**

Drizzle Schema PostgreSQL data types Indexes and Constraints Database Views Database Schemas Sequences Extensions

**Query data**

Relational Queries Select Insert Update Delete Filters Joins sql\`\` operator

---

# https://orm.drizzle.team/docs/column-types/pg

We've merged alternation-engine into Beta release. Try it out!

**PostgreSQL** **MySQL** **SQLite** **SingleStore** **MSSQL** **CockroachDB**

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# PostgreSQL column types

We have native support for all of them, yet if that’s not enough for you, feel free to create **custom types**.

important

All examples in this part of the documentation do not use database column name aliases, and column names are generated from TypeScript keys.

You can use database aliases in column names if you want, and you can also use the `casing` parameter to define a mapping strategy for Drizzle.

You can read more about it here

### integer

`integer``int``int4`

Signed 4-byte integer

If you need `integer autoincrement` please refer to **serial.**

import { integer, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
int: integer()
});
CREATE TABLE "table" (
"int" integer
);
import { sql } from "drizzle-orm";
import { integer, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
int1: integer().default(10),
int2: integer().default(sql`'10'::int`)
});
CREATE TABLE "table" (
"int1" integer DEFAULT 10,
"int2" integer DEFAULT '10'::int
);

### smallint

`smallint``int2`

Small-range signed 2-byte integer

If you need `smallint autoincrement` please refer to **smallserial.**

import { smallint, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
smallint: smallint()
});
CREATE TABLE "table" (
"smallint" smallint
);
import { sql } from "drizzle-orm";
import { smallint, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
smallint1: smallint().default(10),
smallint2: smallint().default(sql`'10'::smallint`)
});
CREATE TABLE "table" (
"smallint1" smallint DEFAULT 10,
"smallint2" smallint DEFAULT '10'::smallint
);

### bigint

`bigint``int8`

Signed 8-byte integer

If you need `bigint autoincrement` please refer to **bigserial.**

If you’re expecting values above 2^31 but below 2^53, you can utilise `mode: 'number'` and deal with javascript number as opposed to bigint.

import { bigint, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
bigint: bigint({ mode: 'number' })
});

// will be inferred as `number`
bigint: bigint({ mode: 'number' })

// will be inferred as `bigint`
bigint: bigint({ mode: 'bigint' })
CREATE TABLE "table" (
"bigint" bigint
);
import { sql } from "drizzle-orm";
import { bigint, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
bigint1: bigint().default(10),
bigint2: bigint().default(sql`'10'::bigint`)
});
CREATE TABLE "table" (
"bigint1" bigint DEFAULT 10,
"bigint2" bigint DEFAULT '10'::bigint
);

## \-\-\-

### serial

`serial``serial4`

Auto incrementing 4-bytes integer, notational convenience for creating unique identifier columns (similar to the `AUTO_INCREMENT` property supported by some other databases).

For more info please refer to the official PostgreSQL **docs.**

import { serial, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
serial: serial(),
});
CREATE TABLE "table" (
"serial" serial NOT NULL
);

### smallserial

`smallserial``serial2`

Auto incrementing 2-bytes integer, notational convenience for creating unique identifier columns (similar to the `AUTO_INCREMENT` property supported by some other databases).

import { smallserial, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
smallserial: smallserial(),
});
CREATE TABLE "table" (
"smallserial" smallserial NOT NULL
);

### bigserial

`bigserial``serial8`

Auto incrementing 8-bytes integer, notational convenience for creating unique identifier columns (similar to the `AUTO_INCREMENT` property supported by some other databases).

import { bigserial, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
bigserial: bigserial({ mode: 'number' }),
});
CREATE TABLE "table" (
"bigserial" bigserial NOT NULL
);

### boolean

PostgreSQL provides the standard SQL type boolean.

import { boolean, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
boolean: boolean()
});
CREATE TABLE "table" (
"boolean" boolean
);

### bytea

PostgreSQL provides the standard SQL type bytea.

import { bytea, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
bytea: bytea()
});
CREATE TABLE IF NOT EXISTS "table" (
"bytea" bytea,
);

### text

`text`

Variable-length(unlimited) character string.

You can define `{ enum: ["value1", "value2"] }` config to infer `insert` and `select` types, it **won’t** check runtime values.

import { text, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
text: text()
});

// will be inferred as text: "value1" | "value2" | null
text: text({ enum: ["value1", "value2"] })
CREATE TABLE "table" (
"text" text
);

### varchar

`character varying(n)``varchar(n)`

Variable-length character string, can store strings up to **`n`** characters (not bytes).

The `length` parameter is optional according to PostgreSQL docs.

import { varchar, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
varchar1: varchar(),
varchar2: varchar({ length: 256 }),
});

// will be inferred as text: "value1" | "value2" | null
varchar: varchar({ enum: ["value1", "value2"] }),
CREATE TABLE "table" (
"varchar1" varchar,
"varchar2" varchar(256)
);

### char

`character(n)``char(n)`

Fixed-length, blank padded character string, can store strings up to **`n`** characters(not bytes).

import { char, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
char1: char(),
char2: char({ length: 256 }),
});

// will be inferred as text: "value1" | "value2" | null
char: char({ enum: ["value1", "value2"] }),
CREATE TABLE "table" (
"char1" char,
"char2" char(256)
);

### numeric

`numeric``decimal`

Exact numeric of selectable precision. Can store numbers with a very large number of digits, up to 131072 digits before the decimal point and up to 16383 digits after the decimal point.

import { numeric, pgTable } from "drizzle-orm/pg-core";

export const table = pgTable('table', {
numeric1: numeric(),
numeric2: numeric({ precision: 100 }),
numeric3: numeric({ precision: 100, scale: 20 }),
numericNum: numeric({ mode: 'number' }),
numericBig: numeric({ mode: 'bigint' }),
});
CREATE TABLE "table" (
"numeric1" numeric,
"numeric2" numeric(100),
"numeric3" numeric(100, 20),
"numericNum" numeric,
"numericBig" numeric
);

### decimal

An alias of **numeric.**

### real

`real``float4`

Single precision floating-point number (4 bytes)

import { sql } from "drizzle-orm";
import { real, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
real1: real(),
real2: real().default(10.10),
real3: real().default(sql`'10.10'::real`),
});
CREATE TABLE "table" (
"real1" real,
"real2" real default 10.10,
"real3" real default '10.10'::real
);

### double precision

`double precision``float8`

Double precision floating-point number (8 bytes)

import { sql } from "drizzle-orm";
import { doublePrecision, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
double1: doublePrecision(),
double2: doublePrecision().default(10.10),
double3: doublePrecision().default(sql`'10.10'::double precision`),
});
CREATE TABLE "table" (
"double1" double precision,
"double2" double precision default 10.10,
"double3" double precision default '10.10'::double precision
);

### json

`json`

Textual JSON data, as specified in **RFC 7159.**

import { sql } from "drizzle-orm";
import { json, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
json1: json(),
json2: json().default({ foo: "bar" }),
json3: json().default(sql`'{foo: "bar"}'::json`),
});
CREATE TABLE "table" (
"json1" json,
"json2" json default '{"foo": "bar"}'::json,
"json3" json default '{"foo": "bar"}'::json
);

It provides compile time protection for default values, insert and select schemas.

// will be inferred as { foo: string }

// will be inferred as string[]

// won't compile

### jsonb

`jsonb`

Binary JSON data, decomposed.

import { jsonb, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
jsonb1: jsonb(),
jsonb2: jsonb().default({ foo: "bar" }),
jsonb3: jsonb().default(sql`'{foo: "bar"}'::jsonb`),
});
CREATE TABLE "table" (
"jsonb1" jsonb,
"jsonb2" jsonb default '{"foo": "bar"}'::jsonb,
"jsonb3" jsonb default '{"foo": "bar"}'::jsonb
);

### uuid

`uuid`

The data type uuid stores Universally Unique Identifiers (UUID) as defined by RFC 4122, ISO/IEC 9834-8:2005, and related standards

import { uuid, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
uuid1: uuid(),
uuid2: uuid().defaultRandom(),
uuid3: uuid().default('a0ee-bc99-9c0b-4ef8-bb6d-6bb9-bd38-0a11')
});
CREATE TABLE "table" (
"uuid1" uuid,
"uuid2" uuid default gen_random_uuid(),
"uuid3" uuid default 'a0ee-bc99-9c0b-4ef8-bb6d-6bb9-bd38-0a11'
);

### time

`time``timetz``time with timezone``time without timezone`

Time of day with or without time zone.

import { time, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
time1: time(),
time2: time({ withTimezone: true }),
time3: time({ precision: 6 }),
time4: time({ precision: 6, withTimezone: true })
});
CREATE TABLE "table" (
"time1" time,
"time2" time with timezone,
"time3" time(6),
"time4" time(6) with timezone
);

### timestamp

`timestamp``timestamptz``timestamp with time zone``timestamp without time zone`

Date and time with or without time zone.

import { sql } from "drizzle-orm";
import { timestamp, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
timestamp1: timestamp(),
timestamp2: timestamp({ precision: 6, withTimezone: true }),
timestamp3: timestamp().defaultNow(),
timestamp4: timestamp().default(sql`now()`),
});
CREATE TABLE "table" (
"timestamp1" timestamp,
"timestamp2" timestamp (6) with time zone,
"timestamp3" timestamp default now(),
"timestamp4" timestamp default now()
);

You can specify either `date` or `string` infer modes:

// will infer as date
timestamp: timestamp({ mode: "date" }),

// will infer as string
timestamp: timestamp({ mode: "string" }),

How mapping works for `timestamp` and `timestamp with timezone`:

> For timestamp with time zone, the internally stored value is always in UTC (Universal Coordinated Time, traditionally known as Greenwich Mean Time, GMT).
> An input value that has an explicit time zone specified is converted to UTC using the appropriate offset for that time zone.
> If no time zone is stated in the input string, then it is assumed to be in the time zone indicated by the system’s TimeZone parameter,
> and is converted to UTC using the offset for the timezone zone.

So for `timestamp with timezone` you will get back string converted to a timezone set in your Postgres instance.
You can check timezone using this sql query:

show timezone;

### date

`date`

Calendar date (year, month, day)

import { date, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
date: date(),
});
CREATE TABLE "table" (
"date" date
);

// will infer as date
date: date({ mode: "date" }),

// will infer as string
date: date({ mode: "string" }),

### interval

`interval`

Time span

import { interval, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
interval1: interval(),
interval2: interval({ fields: 'day' }),
interval3: interval({ fields: 'month' , precision: 6 }),
});
CREATE TABLE "table" (
"interval1" interval,
"interval2" interval day,
"interval3" interval(6) month
);

### point

`point`

Geometric point type

Type `point` has 2 modes for mappings from the database: `tuple` and `xy`.

- `tuple` will be accepted for insert and mapped on select to a tuple. So, the database Point(1,2) will be typed as \[1,2\] with drizzle.

- `xy` will be accepted for insert and mapped on select to an object with x, y coordinates. So, the database Point(1,2) will be typed as `{ x: 1, y: 2 }` with drizzle

const items = pgTable('items', {
point: point(),
pointObj: point({ mode: 'xy' }),
});
CREATE TABLE "items" (
"point" point,
"pointObj" point
);

### line

`line`

Geometric line type

Type `line` has 2 modes for mappings from the database: `tuple` and `abc`.

- `tuple` will be accepted for insert and mapped on select to a tuple. So, the database Line3 will be typed as \[1,2,3\] with drizzle.

- `abc` will be accepted for insert and mapped on select to an object with a, b, and c constants from the equation `Ax + By + C = 0`. So, the database Line3 will be typed as `{ a: 1, b: 2, c: 3 }` with drizzle.

const items = pgTable('items', {
line: line(),
lineObj: line({ mode: 'abc' }),
});
CREATE TABLE "items" (
"line" line,
"lineObj" line
);

### enum

`enum``enumerated types`

Enumerated (enum) types are data types that comprise a static, ordered set of values.
They are equivalent to the enum types supported in a number of programming languages.
An example of an enum type might be the days of the week, or a set of status values for a piece of data.

import { pgEnum, pgTable } from "drizzle-orm/pg-core";

export const moodEnum = pgEnum('mood', ['sad', 'ok', 'happy']);

export const table = pgTable('table', {
mood: moodEnum(),
});
CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy');

CREATE TABLE "table" (
"mood" mood
);

### Customizing data type

Every column builder has a `.$type()` method, which allows you to customize the data type of the column.

This is useful, for example, with unknown or branded types:

type UserId = number & { \_\_brand: 'user_id' };
type Data = {
foo: string;
bar: number;
};

const users = pgTable('users', {

});

### Identity Columns

To use this feature you would need to have `drizzle-orm@0.32.0` or higher and `drizzle-kit@0.23.0` or higher

PostgreSQL supports identity columns as a way to automatically generate unique integer values for a column. These values are generated using sequences and can be defined using the GENERATED AS IDENTITY clause.

**Types of Identity Columns**

- `GENERATED ALWAYS AS IDENTITY`: The database always generates a value for the column. Manual insertion or updates to this column are not allowed unless the OVERRIDING SYSTEM VALUE clause is used.
- `GENERATED BY DEFAULT AS IDENTITY`: The database generates a value by default, but manual values can also be inserted or updated. If a manual value is provided, it will be used instead of the system-generated value.

**Key Features**

- Automatic Value Generation: Utilizes sequences to generate unique values for each new row.
- Customizable Sequence Options: You can define starting values, increments, and other sequence options.
- Support for Multiple Identity Columns: PostgreSQL allows more than one identity column per table.

**Limitations**

- Manual Insertion Restrictions: For columns defined with GENERATED ALWAYS AS IDENTITY, manual insertion or updates require the OVERRIDING SYSTEM VALUE clause.
- Sequence Constraints: Identity columns depend on sequences, which must be managed correctly to avoid conflicts or gaps.

**Usage example**

import { pgTable, integer, text } from 'drizzle-orm/pg-core'

export const ingredients = pgTable("ingredients", {
id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
name: text().notNull(),
description: text(),
});

You can specify all properties available for sequences in the `.generatedAlwaysAsIdentity()` function. Additionally, you can specify custom names for these sequences

PostgreSQL docs reference.

### Default value

The `DEFAULT` clause specifies a default value to use for the column if no value
is explicitly provided by the user when doing an `INSERT`.
If there is no explicit `DEFAULT` clause attached to a column definition,
then the default value of the column is `NULL`.

An explicit `DEFAULT` clause may specify that the default value is `NULL`,
a string constant, a blob constant, a signed-number, or any constant expression enclosed in parentheses.

import { sql } from "drizzle-orm";
import { integer, pgTable, uuid } from "drizzle-orm/pg-core";

const table = pgTable('table', {
integer1: integer().default(42),
integer2: integer().default(sql`'42'::integer`),
uuid1: uuid().defaultRandom(),
uuid2: uuid().default(sql`gen_random_uuid()`),
});
CREATE TABLE "table" (
"integer1" integer DEFAULT 42,
"integer2" integer DEFAULT '42'::integer,
"uuid1" uuid DEFAULT gen_random_uuid(),
"uuid2" uuid DEFAULT gen_random_uuid()
);

When using `$default()` or `$defaultFn()`, which are simply different aliases for the same function,
you can generate defaults at runtime and use these values in all insert queries.

These functions can assist you in utilizing various implementations such as `uuid`, `cuid`, `cuid2`, and many more.

Note: This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`

import { text, pgTable } from "drizzle-orm/pg-core";
import { createId } from '@paralleldrive/cuid2';

const table = pgTable('table', {

When using `$onUpdate()` or `$onUpdateFn()`, which are simply different aliases for the same function,
you can generate defaults at runtime and use these values in all update queries.

Adds a dynamic update value to the column. The function will be called when the row is updated,
and the returned value will be used as the column value if none is provided.
If no default (or $defaultFn) value is provided, the function will be called
when the row is inserted as well, and the returned value will be used as the column value.

import { integer, timestamp, text, pgTable } from "drizzle-orm/pg-core";

### Not null

`NOT NULL` constraint dictates that the associated column may not contain a `NULL` value.

const table = pgTable('table', {
integer: integer().notNull(),
});
CREATE TABLE "table" (
"integer" integer NOT NULL
);

### Primary key

A primary key constraint indicates that a column, or group of columns, can be used as a unique identifier for rows in the table.
This requires that the values be both unique and not null.

const table = pgTable('table', {
id: serial().primaryKey(),
});
CREATE TABLE "table" (
"id" serial PRIMARY KEY NOT NULL
);

---

# https://orm.drizzle.team/docs/indexes-constraints

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Indexes & Constraints

## Constraints

SQL constraints are the rules enforced on table columns. They are used to prevent invalid data from being entered into the database.

This ensures the accuracy and reliability of your data in the database.

### Default

The `DEFAULT` clause specifies a default value to use for the column if no value provided by the user when doing an `INSERT`.
If there is no explicit `DEFAULT` clause attached to a column definition,
then the default value of the column is `NULL`.

An explicit `DEFAULT` clause may specify that the default value is `NULL`,
a string constant, a blob constant, a signed-number, or any constant expression enclosed in parentheses.

PostgreSQL

MySQL

SQLite

SingleStore

MSSQL

CockroachDB

import { sql } from "drizzle-orm";
import { integer, uuid, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
integer1: integer('integer1').default(42),
integer2: integer('integer2').default(sql`'42'::integer`),
uuid1: uuid('uuid1').defaultRandom(),
uuid2: uuid('uuid2').default(sql`gen_random_uuid()`),
});
CREATE TABLE "table" (
"integer1" integer DEFAULT 42,
"integer2" integer DEFAULT '42'::integer,
"uuid1" uuid DEFAULT gen_random_uuid(),
"uuid2" uuid DEFAULT gen_random_uuid()
);
import { sql } from "drizzle-orm";
import { int, time, mysqlTable } from "drizzle-orm/mysql-core";

const table = mysqlTable("table", {
int: int("int").default(42),
time: time("time").default(sql`cast("14:06:10" AS TIME)`),
});
CREATE TABLE `table` (
`int` int DEFAULT 42,
`time` time DEFAULT cast("14:06:10" AS TIME)
);
import { sql } from "drizzle-orm";
import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

const table = sqliteTable('table', {
int1: integer('int1').default(42),
int2: integer('int2').default(sql`(abs(42))`)
});
CREATE TABLE `table` (
`int1` integer DEFAULT 42
`int2` integer DEFAULT (abs(42))
);
import { sql } from "drizzle-orm";
import { int, time, singlestoreTable } from "drizzle-orm/singlestore-core";

const table = singlestoreTable("table", {
int: int("int").default(42),
time: time("time").default(sql`cast("14:06:10" AS TIME)`),
});
CREATE TABLE `table` (
`int` int DEFAULT 42,
`time` time DEFAULT cast("14:06:10" AS TIME)
);
import { sql } from "drizzle-orm";
import { int, time, mssqlTable } from "drizzle-orm/mssql-core";

const table = mssqlTable("table", {
int: int().default(42),
description: text().default(`This is your dashboard!`),
});
CREATE TABLE [table] (
[int] int DEFAULT 42,
[description] text DEFAULT 'This is your dashboard!'
);
import { sql } from "drizzle-orm";
import { int4, uuid, cockroachTable } from "drizzle-orm/cockroach-core";

const table = cockroachTable('table', {
integer1: int4().default(42),
integer2: int4().default(sql`'42'::int4`),
uuid1: uuid().defaultRandom(),
uuid2: uuid().default(sql`gen_random_uuid()`),
});
CREATE TABLE "table" (
"integer1" int4 DEFAULT 42,
"integer2" int4 DEFAULT '42'::integer,
"uuid1" uuid DEFAULT gen_random_uuid(),
"uuid2" uuid DEFAULT gen_random_uuid()
);

### Not null

By default, a column can hold **NULL** values. The `NOT NULL` constraint enforces a column to **NOT** accept **NULL** values.

This enforces a field to always contain a value, which means that you cannot insert a new record,
or update a record without adding a value to this field.

import { integer, pgTable } from "drizzle-orm/pg-core";

const table = pgTable('table', {
integer: integer('integer').notNull(),
});
CREATE TABLE "table" (
"integer" integer NOT NULL
);
import { int, mysqlTable } from "drizzle-orm/mysql-core";

const table = mysqlTable('table', {
int: int('int').notNull(),
});
CREATE TABLE `table` (
`int` int NOT NULL
);
const table = sqliteTable('table', {
numInt: integer('numInt').notNull()
});
CREATE TABLE table (
`numInt` integer NOT NULL
);
import { int, singlestoreTable } from "drizzle-orm/singlestore-core";

const table = singlestoreTable('table', {
int: int('int').notNull(),
});
CREATE TABLE `table` (
`int` int NOT NULL
);
import { int, mssqlTable } from "drizzle-orm/mssql-core";

const table = mssqlTable('table', {
int: int().notNull(),
});
CREATE TABLE [table] (
[int] int NOT NULL
);
import { int4, cockroachTable } from "drizzle-orm/cockroach-core";

const table = cockroachTable('table', {
integer: int4().notNull(),
});
CREATE TABLE "table" (
"integer" int4 NOT NULL
);

### Unique

The `UNIQUE` constraint ensures that all values in a column are different.

Both the `UNIQUE` and `PRIMARY KEY` constraints provide a guarantee for uniqueness for a column or set of columns.

A `PRIMARY KEY` constraint automatically has a `UNIQUE` constraint.

You can have many `UNIQUE` constraints per table, but only one `PRIMARY KEY` constraint per table.

import { integer, text, unique, pgTable } from "drizzle-orm/pg-core";

export const user = pgTable('user', {
id: integer('id').unique(),
});

export const table = pgTable('table', {
id: integer('id').unique('custom_name'),
});

export const composite = pgTable('composite_example', {
id: integer('id'),
name: text('name'),

unique().on(t.id, t.name),\
unique('custom_name').on(t.id, t.name)\
]);

// In Postgres 15.0+ NULLS NOT DISTINCT is available
// This example demonstrates both available usages
export const userNulls = pgTable('user_nulls_example', {
id: integer('id').unique("custom_name", { nulls: 'not distinct' }),

unique().on(t.id).nullsNotDistinct()\
]);
CREATE TABLE "composite_example" (
"id" integer,
"name" text,
CONSTRAINT "composite_example_id_name_unique" UNIQUE("id","name"),
CONSTRAINT "custom_name" UNIQUE("id","name")
);

CREATE TABLE "table" (
"id" integer,
CONSTRAINT "custom_name" UNIQUE("id")
);

CREATE TABLE "user" (
"id" integer,
CONSTRAINT "user_id_unique" UNIQUE("id")
);

CREATE TABLE "user_nulls_example" (
"id" integer,
CONSTRAINT "custom_name" UNIQUE NULLS NOT DISTINCT("id"),
CONSTRAINT "user_nulls_example_id_unique" UNIQUE NULLS NOT DISTINCT("id")
);
import { int, varchar, unique, mysqlTable } from "drizzle-orm/mysql-core";

export const user = mysqlTable('user', {
id: int('id').unique(),
});

export const table = mysqlTable('table', {
id: int('id').unique('custom_name'),
});

export const composite = mysqlTable('composite_example', {
id: int('id'),
name: varchar('name', { length: 256 }),

unique().on(t.id, t.name),\
unique('custom_name').on(t.id, t.name)\
]);
CREATE TABLE `user` (
`id` int,
CONSTRAINT `user_id_unique` UNIQUE(`id`)
);

CREATE TABLE `table` (
`id` int,
CONSTRAINT `custom_name` UNIQUE(`id`)
);

CREATE TABLE `composite_example` (
`id` int,
`name` varchar(256),
CONSTRAINT `composite_example_id_name_unique` UNIQUE(`id`,`name`),
CONSTRAINT `custom_name` UNIQUE(`id`,`name`)
);
import { int, text, unique, sqliteTable } from "drizzle-orm/sqlite-core";

export const user = sqliteTable('user', {
id: int('id').unique(),
});

export const table = sqliteTable('table', {
id: int('id').unique('custom_name'),
});

export const composite = sqliteTable('composite_example', {
id: int('id'),
name: text('name'),

unique().on(t.id, t.name),\
unique('custom_name').on(t.id, t.name)\
]);
CREATE TABLE `user` (
`id` integer
);

CREATE TABLE `table` (
`id` integer
);

CREATE TABLE `composite_example` (
`id` integer,
`name` text
);

CREATE UNIQUE INDEX `composite_example_id_name_unique` ON `composite_example` (`id`,`name`);
CREATE UNIQUE INDEX `custom_name` ON `composite_example` (`id`,`name`);
CREATE UNIQUE INDEX `custom_name` ON `table` (`id`);
CREATE UNIQUE INDEX `user_id_unique` ON `user` (`id`);
import { int, varchar, unique, singlestoreTable } from "drizzle-orm/singlestore-core";

export const user = singlestoreTable('user', {
id: int('id').unique(),
});

export const table = singlestoreTable('table', {
id: int('id').unique('custom_name'),
});

export const composite = singlestoreTable('composite_example', {
id: int('id'),
name: varchar('name', { length: 256 }),

CREATE TABLE `composite_example` (
`id` int,
`name` varchar(256),
CONSTRAINT `composite_example_id_name_unique` UNIQUE(`id`,`name`),
CONSTRAINT `custom_name` UNIQUE(`id`,`name`)
);

IMPORTANT

With MSSQL you can’t create unique constraint on `text`, `ntext`, `varchar(max)`, `nvarchar(max)`

import { int, varchar, unique, mssqlTable } from "drizzle-orm/mssql-core";

export const user = mssqlTable('user', {
id: int().unique(),
});

export const table = mssqlTable('table', {
id: int().unique('custom_name'),
});

export const composite = mssqlTable('composite_example', {
id: int(),
name: varchar({ length: 256 }),

unique().on(t.id, t.name),\
unique('custom_name').on(t.id, t.name)\
]);
CREATE TABLE [user] (
[id] int,
CONSTRAINT [user_id_key] UNIQUE([id])
);

CREATE TABLE [table] (
[id] int,
CONSTRAINT [custom_name] UNIQUE([id])
);

CREATE TABLE [composite_example] (
[id] int,
[name] varchar(256),
CONSTRAINT [composite_example_id_name_key] UNIQUE([id],[name]),
CONSTRAINT [custom_name] UNIQUE([id],[name])
);
import { int4, text, unique, cockroachTable } from "drizzle-orm/cockroach-core";

export const user = cockroachTable('user', {
id: int4().unique(),
});

export const table = cockroachTable('table', {
id: int4().unique('custom_name'),
});

export const composite = cockroachTable('composite_example', {
id: int4(),
name: text(),

unique().on(t.id, t.name),\
unique('custom_name').on(t.id, t.name)\
]);
CREATE TABLE "user" (
"id" integer,
CONSTRAINT "user_id_unique" UNIQUE("id")
);

CREATE TABLE "composite_example" (
"id" integer,
"name" text,
CONSTRAINT "composite_example_id_name_unique" UNIQUE("id","name"),
CONSTRAINT "custom_name" UNIQUE("id","name")
);

### Check

The `CHECK` constraint is used to limit the value range that can be placed in a column.

If you define a `CHECK` constraint on a column it will allow only certain values for this column.

If you define a `CHECK` constraint on a table it can limit the values in certain columns based on values in other columns in the row.

import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
"users",
{
id: uuid().defaultRandom().primaryKey(),
username: text().notNull(),
age: integer(),
},

]
);
CREATE TABLE "users" (
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"username" text NOT NULL,
"age" integer,

);
import { sql } from "drizzle-orm";
import { check, int, mysqlTable, text } from "drizzle-orm/mysql-core";

export const users = mysqlTable(
"users",
{
id: int().primaryKey(),
username: text().notNull(),
age: int(),
},

]
);
CREATE TABLE `users` (
`id` int NOT NULL,
`username` text NOT NULL,
`age` int,
CONSTRAINT `users_id` PRIMARY KEY(`id`),

);
import { sql } from "drizzle-orm";
import { check, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
"users",
{
id: int().primaryKey(),
username: text().notNull(),
age: int(),
},

]
);
CREATE TABLE `users` (
`id` integer PRIMARY KEY NOT NULL,
`username` text NOT NULL,
`age` integer,

);

Currently not supported in SingleStore

import { sql } from "drizzle-orm";
import { check, int, mssqlTable, text } from "drizzle-orm/mssql-core";

export const users = mssqlTable(
"users",
{
id: int().primaryKey(),
username: text().notNull(),
age: integer(),
},

]
);
CREATE TABLE [users] (
[id] int PRIMARY KEY,
[username] text NOT NULL,
[age] integer,

);
import { sql } from "drizzle-orm";
import { check, int4, cockroachTable, text, uuid } from "drizzle-orm/cockroach-core";

export const users = cockroachTable(
"users",
{
id: uuid().defaultRandom().primaryKey(),
username: text().notNull(),
age: int4(),
},

]
);
CREATE TABLE "users" (
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"username" text NOT NULL,
"age" int4,

### Primary Key

The `PRIMARY KEY` constraint uniquely identifies each record in a table.

Primary keys must contain `UNIQUE` values, and cannot contain `NULL` values.

A table can have only **ONE** primary key; and in the table, this primary key can consist of single or multiple columns (fields).

import { serial, text, pgTable } from "drizzle-orm/pg-core";

const user = pgTable('user', {
id: serial('id').primaryKey(),
});

const table = pgTable('table', {
id: text('cuid').primaryKey(),
});
CREATE TABLE "user" (
"id" serial PRIMARY KEY
);

CREATE TABLE "table" (
"cuid" text PRIMARY KEY
);
import { int, text, mysqlTable } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
id: int("id").autoincrement().primaryKey(),
})

export const table = mysqlTable("table", {
cuid: text("cuid").primaryKey(),
})
CREATE TABLE `user` (
`id` int AUTO_INCREMENT PRIMARY KEY NOT NULL
);

CREATE TABLE `table` (
`cuid` text PRIMARY KEY NOT NULL
);
import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
id: integer("id").primaryKey(),
})

export const pet = sqliteTable("pet", {
id: integer("id").primaryKey(),
})
CREATE TABLE `user` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL
);

CREATE TABLE `pet` (
`id` integer PRIMARY KEY AUTOINCREMENT
)
import { int, text, singlestoreTable } from "drizzle-orm/singlestore-core";

export const user = singlestoreTable("user", {
id: int("id").autoincrement().primaryKey(),
})

export const table = singlestoreTable("table", {
cuid: text("cuid").primaryKey(),
})
CREATE TABLE `user` (
`id` int AUTO_INCREMENT PRIMARY KEY NOT NULL
);

CREATE TABLE `table` (
`cuid` text PRIMARY KEY NOT NULL
);
import { int, text, mssqlTable } from "drizzle-orm/mssql-core";

export const user = mssqlTable("user", {
id: int().primaryKey(),
})
CREATE TABLE [user] (
[id] int,
CONSTRAINT [user_pkey] PRIMARY KEY [id]
);
import { int4, text, cockroachTable } from "drizzle-orm/cockroach-core";

const user = cockroachTable('user', {
id: int4().primaryKey(),
});

const table = cockroachTable('table', {
id: text().primaryKey(),
});
CREATE TABLE "user" (
"id" int4 PRIMARY KEY
);

CREATE TABLE "table" (
"cuid" text PRIMARY KEY
);

### Composite Primary Key

Just like `PRIMARY KEY`, composite primary key uniquely identifies each record in a table using multiple fields.

Drizzle ORM provides a standalone `primaryKey` operator for that:

import { serial, text, integer, primaryKey, pgTable } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
id: serial("id").primaryKey(),
name: text("name"),
});

export const book = pgTable("book", {
id: serial("id").primaryKey(),
name: text("name"),
});

export const booksToAuthors = pgTable("books_to_authors", {
authorId: integer("author_id"),
bookId: integer("book_id"),

primaryKey({ columns: [table.bookId, table.authorId] }),\
// Or PK with custom name\
primaryKey({ name: 'custom_name', columns: [table.bookId, table.authorId] }),\
]);
...

CREATE TABLE "books_to_authors" (
"author_id" integer,
"book_id" integer,
PRIMARY KEY("book_id","author_id")
);

ALTER TABLE "books_to_authors" ADD CONSTRAINT "custom_name" PRIMARY KEY("book_id","author_id");
import { int, text, primaryKey, mysqlTable } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
id: int("id").autoincrement().primaryKey(),
name: text("name"),
});

export const book = mysqlTable("book", {
id: int("id").autoincrement().primaryKey(),
name: text("name"),
});

export const booksToAuthors = mysqlTable("books_to_authors", {
authorId: int("author_id"),
bookId: int("book_id"),

primaryKey({ columns: [table.bookId, table.authorId] }),\
// Or PK with custom name\
primaryKey({ name: 'custom_name', columns: [table.bookId, table.authorId] })\
]);
...

CREATE TABLE `books_to_authors` (
`author_id` int,
`book_id` int,
PRIMARY KEY(`book_id`,`author_id`)
);
import { integer, text, primaryKey, sqliteTable} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
id: integer("id").primaryKey({ autoIncrement: true }),
name: text("name"),
});

export const book = sqliteTable("book", {
id: integer("id").primaryKey({ autoIncrement: true }),
name: text("name"),
});

export const bookToAuthor = sqliteTable("book_to_author", {
authorId: integer("author_id"),
bookId: integer("book_id"),

CREATE TABLE `book_to_author` (
`author_id` integer,
`book_id` integer,
PRIMARY KEY(`book_id`, `author_id`)
);
import { int, text, primaryKey, mysqlTable } from "drizzle-orm/singlestore-core";

export const user = singlestoreTable("user", {
id: int("id").autoincrement().primaryKey(),
name: text("name"),
});

export const book = singlestoreTable("book", {
id: int("id").autoincrement().primaryKey(),
name: text("name"),
});

export const booksToAuthors = singlestoreTable("books_to_authors", {
authorId: int("author_id"),
bookId: int("book_id"),

CREATE TABLE `books_to_authors` (
`author_id` int,
`book_id` int,
PRIMARY KEY(`book_id`,`author_id`)
);
import { int, text, primaryKey, mssqlTable } from "drizzle-orm/mssql-core";

export const user = mssqlTable("user", {
id: int().primaryKey(),
name: text(),
});

export const book = mssqlTable("book", {
id: int().primaryKey(),
name: text(),
});

export const booksToAuthors = mssqlTable("books_to_authors", {
authorId: int("author_id"),
bookId: int("book_id"),

CREATE TABLE [books_to_authors] (
[author_id] int,
[book_id] int,
CONSTRAINT [custom_name] PRIMARY KEY([book_id], [author_id])
);
import { int4, text, primaryKey, cockroachTable } from "drizzle-orm/cockroach-core";

export const user = cockroachTable("user", {
id: int4().primaryKey(),
name: text(),
});

export const book = cockroachTable("book", {
id: int4("id").primaryKey(),
name: text("name"),
});

export const booksToAuthors = cockroachTable("books_to_authors", {
authorId: int4("author_id"),
bookId: int4("book_id"),

CREATE TABLE "books_to_authors" (
"author_id" int4,
"book_id" int4,
PRIMARY KEY("book_id","author_id")
);

ALTER TABLE "books_to_authors" ADD CONSTRAINT "custom_name" PRIMARY KEY("book_id","author_id");

### Foreign key

The `FOREIGN KEY` constraint is used to prevent actions that would destroy links between tables.
A `FOREIGN KEY` is a field (or collection of fields) in one table, that refers to the `PRIMARY KEY` in another table.
The table with the foreign key is called the child table, and the table with the primary key is called the referenced or parent table.

Drizzle ORM provides several ways to declare foreign keys.
You can declare them in a column declaration statement:

import { serial, text, integer, pgTable } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
id: serial("id"),
name: text("name"),
});

export const book = pgTable("book", {
id: serial("id"),
name: text("name"),

});
import { int, text, mysqlTable } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),
});

export const book = mysqlTable("book", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),

});
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const book = sqliteTable("book", {
id: integer("id").primaryKey({ autoIncrement: true }),
name: text("name"),

});

import { int, text, mssqlTable } from "drizzle-orm/mssql-core";

export const book = mssqlTable("book", {
id: int().primaryKey(),
name: text(),

});
import { int4, text, cockroachTable } from "drizzle-orm/cockroach-core";

export const book = cockroachTable("book", {
id: int4().primaryKey(),
name: text(),

If you want to do a self reference, due to a TypeScript limitations you will have to either explicitly
set return type for reference callback or use a standalone `foreignKey` operator.

import { serial, text, integer, foreignKey, pgTable, AnyPgColumn } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
id: serial("id"),
name: text("name"),

// or
export const user = pgTable("user", {
id: serial("id"),
name: text("name"),
parentId: integer("parent_id"),

foreignKey({\
columns: [table.parentId],\
foreignColumns: [table.id],\
name: "custom_fk"\
})\
]);
import { int, text, foreignKey, AnyMySqlColumn, mysqlTable } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),

// or
export const user = mysqlTable("user", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),
parentId: int("parent_id")

foreignKey({\
columns: [table.parentId],\
foreignColumns: [table.id],\
name: "custom_fk"\
})\
]);
import { integer, text, foreignKey, sqliteTable, AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
id: integer("id").primaryKey({ autoIncrement: true }),
name: text("name"),

//or
export const user = sqliteTable("user", {
id: integer("id").primaryKey({ autoIncrement: true }),
name: text("name"),
parentId: integer("parent_id"),

foreignKey({\
columns: [table.parentId],\
foreignColumns: [table.id],\
name: "custom_fk"\
})\
]);

import { int, text, foreignKey, mssqlTable, AnyMsSQLColumn } from "drizzle-orm/mssql-core";

export const user = mssqlTable("user", {
id: int().primaryKey(),
name: text(),

//or
export const user = mssqlTable("user", {
id: int().primaryKey(),
name: text(),
parentId: int("parent_id"),

foreignKey({\
columns: [table.parentId],\
foreignColumns: [table.id],\
name: "custom_fk"\
})\
]);
import { int4, text, foreignKey, cockroachTable, AnyCockroachColumn } from "drizzle-orm/cockroach-core";

export const user = cockroachTable("user", {
id: int4().primaryKey(),
name: text(),

// or
export const user = cockroachTable("user", {
id: int4().primaryKey(),
name: text(),
parentId: int4("parent_id"),

To declare multi-column foreign keys you can use a dedicated `foreignKey` operator:

import { serial, text, foreignKey, pgTable, AnyPgColumn } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
firstName: text("firstName"),
lastName: text("lastName"),

primaryKey({ columns: [table.firstName, table.lastName]})\
]);

export const profile = pgTable("profile", {
id: serial("id").primaryKey(),
userFirstName: text("user_first_name"),
userLastName: text("user_last_name"),

foreignKey({\
columns: [table.userFirstName, table.userLastName],\
foreignColumns: [user.firstName, user.lastName],\
name: "custom_fk"\
})\
])
import { int, text, primaryKey, foreignKey, mysqlTable, AnyMySqlColumn } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
firstName: text("firstName"),
lastName: text("lastName"),

export const profile = mysqlTable("profile", {
id: int("id").autoincrement().primaryKey(),
userFirstName: text("user_first_name"),
userLastName: text("user_last_name"),

foreignKey({\
columns: [table.userFirstName, table.userLastName],\
foreignColumns: [user.firstName, user.lastName],\
name: "custom_name"\
})\
]);
import { integer, text, primaryKey, foreignKey, sqliteTable, AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
firstName: text("firstName"),
lastName: text("lastName"),

export const profile = sqliteTable("profile", {
id: integer("id").primaryKey({ autoIncrement: true }),
userFirstName: text("user_first_name"),
userLastName: text("user_last_name"),

foreignKey({\
columns: [table.userFirstName, table.userLastName],\
foreignColumns: [user.firstName, user.lastName],\
name: "custom_name"\
})\
]);

import { int, text, primaryKey, foreignKey, mssqlTable, AnyMsSqlColumn } from "drizzle-orm/mssql-core";

export const user = mssqlTable("user", {
firstName: text(),
lastName: text(),

export const profile = mssqlTable("profile", {
id: int().primaryKey(),
userFirstName: text("user_first_name"),
userLastName: text("user_last_name"),

foreignKey({\
columns: [table.userFirstName, table.userLastName],\
foreignColumns: [user.firstName, user.lastName],\
name: "custom_name"\
})\
]);
import { int4, text, foreignKey, cockroachTable, AnyCockroachColumn } from "drizzle-orm/cockroach-core";

export const user = cockroachTable("user", {
firstName: text(),
lastName: text(),

export const profile = cockroachTable("profile", {
id: int4().primaryKey(),
userFirstName: text("user_first_name"),
userLastName: text("user_last_name"),

foreignKey({\
columns: [table.userFirstName, table.userLastName],\
foreignColumns: [user.firstName, user.lastName],\
name: "custom_fk"\
})\
])

## Indexes

Drizzle ORM provides API for both `index` and `unique index` declaration:

import { serial, text, index, uniqueIndex, pgTable } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
id: serial("id").primaryKey(),
name: text("name"),
email: text("email"),

index("name_idx").on(table.name),\
uniqueIndex("email_idx").on(table.email)\
]);
CREATE TABLE "user" (
...
);

CREATE INDEX "name_idx" ON "user" ("name");
CREATE UNIQUE INDEX "email_idx" ON "user" ("email");

For versions before `drizzle-kit@0.22.0` and `drizzle-orm@0.31.0``drizzle-kit` only supports index `name` and `on()` param.

After versions `drizzle-kit@0.22.0` and `drizzle-orm@0.31.0` all fields are supported in drizzle-kit!

Starting from 0.31.0 a new index api for Drizzle ORM provides set of all params for index creation:

// First example, with `.on()`
index('name')
.on(table.column1.asc(), table.column2.nullsFirst(), ...) or .onOnly(table.column1.desc().nullsLast(), table.column2, ...)
.concurrently()
.where(sql``)
.with({ fillfactor: '70' })

// Second Example, with `.using()`
index('name')
.using('btree', table.column1.asc(), sql`lower(${table.column2})`, table.column1.op('text_ops'))
.where(sql``) // sql expression
.with({ fillfactor: '70' })
import { int, text, index, uniqueIndex, mysqlTable } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),
email: text("email"),

index("name_idx").on(table.name),\
uniqueIndex("email_idx").on(table.email),\
]);
CREATE TABLE `user` (
...
);

CREATE INDEX `name_idx` ON `user` (`name`);
CREATE UNIQUE INDEX `email_idx` ON `user` (`email`);

As of now `drizzle-kit` only supports index `name` and `on()` param.

Drizzle ORM provides set of all params for index creation:

// Index declaration reference
index("name")
.on(table.name)
.algorythm("default") // "default" | "copy" | "inplace"
.using("btree") // "btree" | "hash"
.lock("default") // "none" | "default" | "exclusive" | "shared"
import { integer, text, index, uniqueIndex, sqliteTable } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
id: integer("id").primaryKey({ autoIncrement: true }),
name: text("name"),
email: text("email"),

// Index declaration reference
index("name")
.on(table.name)
.where(sql`...`)
import { int, text, index, uniqueIndex, singlestoreTable } from "drizzle-orm/singlestore-core";

export const user = singlestoreTable("user", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),
email: text("email"),

CREATE INDEX `name_idx` ON `user` (`name`);
CREATE UNIQUE INDEX `email_idx` ON `user` (`email`);
import { int, text, index, uniqueIndex, mssqlTable } from "drizzle-orm/mssql-core";

export const user = mysqlTable("user", {
id: int().primaryKey(),
name: text(),
email: text(),

index("name_idx").on(table.name),\
uniqueIndex("email_idx").on(table.email),\
]);
CREATE TABLE [user] (
...
);

CREATE INDEX [name_idx] ON [user] ([name]);
CREATE UNIQUE INDEX [email_idx] ON [user] ([email]);

With MSSQL you can’t create unique index on `text`, `ntext`, `varchar(max)`, `nvarchar(max)`

Drizzle ORM provides set of params for index creation:

// Index declaration reference
index("name")
.on(table.name)
.where(sql``)
import { int4, text, index, uniqueIndex, cockroachTable } from "drizzle-orm/cockroach-core";

export const user = cockroachTable("user", {
id: int4().primaryKey(),
name: text(),
email: text(),

CREATE INDEX "name_idx" ON "user" ("name");
CREATE UNIQUE INDEX "email_idx" ON "user" ("email");
// First example, with `.on()`
index('name')
.on(table.column1.asc(), table.column2) or .onOnly(table.column1.desc(), table.column2, ...)
.where(sql``)

// Second Example, with `.using()`
index('name')
.using('btree', table.column1.asc(), sql`lower(${table.column2})`)
.where(sql``) // sql expression

---

# https://orm.drizzle.team/docs/views

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Views

PostgreSQL

SQLite

MySQL

SingleStore

MSSQL

CockroachDB

There’re several ways you can declare views with Drizzle ORM.

You can declare views that have to be created or you can declare views that already exist in the database.

You can declare views statements with an inline `query builder` syntax, with `standalone query builder` and with raw `sql` operators.

When views are created with either inlined or standalone query builders, view columns schema will be automatically inferred,
yet when you use `sql` you have to explicitly declare view columns schema.

### Declaring views

import { pgTable, pgView, serial, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
id: serial(),
name: text(),
email: text(),
password: text(),

createdAt: timestamp("created_at"),
updatedAt: timestamp("updated_at"),
});

CREATE VIEW "user*view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';
import { text, mysqlTable, mysqlView, int, timestamp } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
id: int().primaryKey().autoincrement(),
name: text(),
email: text(),
password: text(),

CREATE VIEW "user*view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';
import { integer, text, sqliteView, sqliteTable } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
id: integer().primaryKey({ autoIncrement: true }),
name: text(),
email: text(),
password: text(),

createdAt: integer("created_at"),
updatedAt: integer("updated_at"),
});

CREATE VIEW "user*view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';
import { mssqlTable, mssqlView, int, text, timestamp } from "drizzle-orm/mssql-core";

export const user = mssqlTable("user", {
id: int(),
name: text(),
email: text(),
password: text(),

CREATE VIEW [user_view] AS (SELECT _ FROM "user");
CREATE VIEW [customers_view] AS (SELECT _ FROM "user" WHERE "role" = 'customer');

If you need a subset of columns you can use `.select({ ... })` method in query builder, like this:

return qb
.select({
id: user.id,
name: user.name,
email: user.email,
})
.from(user);
});
CREATE VIEW [customers_view] AS (SELECT "id", "name", "email" FROM "user" WHERE "role" = 'customer');
import { cockroachTable, cockroachView, int4, text, timestamp } from "drizzle-orm/cockroach-core";

export const user = cockroachTable("user", {
id: int4(),
name: text(),
email: text(),
password: text(),

CREATE VIEW "user*view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';

You can also declare views using `standalone query builder`, it works exactly the same way:

import { pgTable, pgView, serial, text, timestamp, QueryBuilder} from "drizzle-orm/pg-core";

const qb = new QueryBuilder();

export const userView = pgView("user*view").as(qb.select().from(user));
export const customersView = pgView("customers_view").as(qb.select().from(user).where(eq(user.role, "customer")));
CREATE VIEW "user_view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';
import { text, mysqlTable, mysqlView, int, timestamp, QueryBuilder } from "drizzle-orm/mysql-core";

export const userView = mysqlView("user*view").as(qb.select().from(user));
export const customersView = mysqlView("customers_view").as(qb.select().from(user).where(eq(user.role, "customer")));
CREATE VIEW "user_view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';
import { integer, text, sqliteView, sqliteTable, QueryBuilder } from "drizzle-orm/sqlite-core";

CREATE VIEW "user*view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';
import { int, text, mssqlView, mssqlTable, QueryBuilder } from "drizzle-orm/mssql-core";

export const user = mssqlTable("user", {
id: integer().primaryKey(),
name: text(),
email: text(),
password: text(),

CREATE VIEW [user_view] AS (SELECT _ FROM "user");
CREATE VIEW [customers_view] AS (SELECT _ FROM "user" WHERE "role" = 'customer');
import { cockroachTable, cockroachView, int4, text, timestamp, QueryBuilder} from "drizzle-orm/cockroach-core";

export const userView = cockroachView("user*view").as(qb.select().from(user));
export const customersView = cockroachView("customers_view").as(qb.select().from(user).where(eq(user.role, "customer")));
CREATE VIEW "user_view" AS SELECT * FROM "user";
CREATE VIEW "customers*view" AS SELECT * FROM "user" WHERE "role" = 'customer';

### Declaring views with raw SQL

Whenever you need to declare view using a syntax that is not supported by the query builder,
you can directly use `sql` operator and explicitly specify view columns schema.

// regular view
const newYorkers = pgView('new_yorkers', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
cityId: integer('city_id').notNull(),
}).as(sql`select * from ${users} where ${eq(users.cityId, 1)}`);

// materialized view
const newYorkers = pgMaterializedView('new_yorkers', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
cityId: integer('city_id').notNull(),
}).as(sql`select * from ${users} where ${eq(users.cityId, 1)}`);

### Declaring existing views

When you’re provided with a read only access to an existing view in the database you should use `.existing()` view configuration,
`drizzle-kit` will ignore and will not generate a `create view` statement in the generated migration.

// regular view
export const trimmedUser = pgView("trimmed_user", {
id: serial("id"),
name: text("name"),
email: text("email"),
}).existing();

// materialized view won't make any difference, yet you can use it for consistency
export const trimmedUser = pgMaterializedView("trimmed_user", {
id: serial("id"),
name: text("name"),
email: text("email"),
}).existing();

### Materialized views

Cockroach

According to the official docs, PostgreSQL and CockroachDB have both **`regular`**
and **`materialized`** views.

Materialized views in PostgreSQL and CockroachDB use the rule system like views do, but persist the results in a table-like form.

CREATE MATERIALIZED VIEW "new_yorkers" AS SELECT \* FROM "users";

You can then refresh materialized views in the application runtime:

await db.refreshMaterializedView(newYorkers);

await db.refreshMaterializedView(newYorkers).concurrently();

await db.refreshMaterializedView(newYorkers).withNoData();

### Extended example

All the parameters inside the query will be inlined, instead of replaced by `$1`, `$2`, etc.

// regular view
const newYorkers = pgView('new_yorkers')
.with({
checkOption: 'cascaded',
securityBarrier: true,
securityInvoker: true,
})

const sq = qb
.$with('sq')
.as(
qb.select({ userId: users.id, cityId: cities.id })
.from(users)
.leftJoin(cities, eq(cities.id, users.homeCity))

);
return qb.with(sq).select().from(sq).where(sql`${users.homeCity} = 1`);
});

// materialized view
const newYorkers2 = pgMaterializedView('new_yorkers')
.using('btree')
.with({
fillfactor: 90,
toast_tuple_target: 0.5,
autovacuum_enabled: true,
...
})
.tablespace('custom_tablespace')
.withNoData()

);
return qb.with(sq).select().from(sq).where(sql`${users.homeCity} = 1`);
});
// regular view
const newYorkers = cockroachView('new_yorkers')

// materialized view
const newYorkers2 = cockroachMaterializedView('new_yorkers')
.withNoData()

---

# https://orm.drizzle.team/docs/schemas

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Table schemas

PostgreSQL

MySQL

SQLite

SingleStore

MSSQL

CockroachDB

If you declare an entity within a schema, query builder will prepend schema names in queries:

`select * from "schema"."users"`

import { serial, text, pgSchema } from "drizzle-orm/pg-core";

export const mySchema = pgSchema("my_schema");

export const colors = mySchema.enum('colors', ['red', 'green', 'blue']);

export const mySchemaUsers = mySchema.table('users', {
id: serial('id').primaryKey(),
name: text('name'),
color: colors('color').default('red'),
});
CREATE SCHEMA "my_schema";

CREATE TYPE "my_schema"."colors" AS ENUM ('red', 'green', 'blue');

CREATE TABLE "my_schema"."users" (
"id" serial PRIMARY KEY,
"name" text,
"color" "my_schema"."colors" DEFAULT 'red'
);
import { int, text, mysqlSchema } from "drizzle-orm/mysql-core";

export const mySchema = mysqlSchema("my_schema")

export const mySchemaUsers = mySchema.table("users", {
id: int("id").primaryKey().autoincrement(),
name: text("name"),
});
CREATE SCHEMA "my_schema";

CREATE TABLE "my_schema"."users" (
"id" serial PRIMARY KEY,
"name" text
);

SQLite does not have support for schemas 😕

import { int, text, singlestoreSchema } from "drizzle-orm/singlestore-core";

export const mySchema = singlestoreSchema("my_schema")

CREATE TABLE "my_schema"."users" (
"id" serial PRIMARY KEY,
"name" text
);
import { int, text, mssqlSchema } from "drizzle-orm/mssql-core";

export const mySchema = mssqlSchema("my_schema")

export const mySchemaUsers = mySchema.table("users", {
id: int().primaryKey(),
name: text(),
});
CREATE SCHEMA [my_schema];

CREATE TABLE [my_schema].[users] (
[id] int PRIMARY KEY,
[name] text
);
import { int4, text, cockroachSchema } from "drizzle-orm/cockroach-core";

export const mySchema = cockroachSchema("my_schema");

export const mySchemaUsers = mySchema.table('users', {
id: int4().primaryKey(),
name: text(),
color: colors().default('red'),
});
CREATE SCHEMA "my_schema";

CREATE TABLE "my_schema"."users" (
"id" serial PRIMARY KEY,
"name" text,
"color" "my_schema"."colors" DEFAULT 'red'
);

---

# https://orm.drizzle.team/docs/sequences

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Sequences

PostgreSQL

SQLite

MySQL

SingleStore

MSSQL

CockroachDB

Sequences in PostgreSQL and CockroachDB are special single-row tables created to generate unique identifiers, often used for auto-incrementing primary key values. They provide a thread-safe way to generate unique sequential values across multiple sessions.

import { pgSchema, pgSequence } from "drizzle-orm/pg-core";

// No params specified
export const customSequence = pgSequence("name");

// Sequence with params
export const customSequence = pgSequence("name", {
startWith: 100,
maxValue: 10000,
minValue: 100,
cycle: true,
cache: 10,
increment: 2
});

// Sequence in custom schema
export const customSchema = pgSchema('custom_schema');
export const customSequence = customSchema.sequence("name");
import { cockroachSchema, cockroachSequence } from "drizzle-orm/cockroach-core";

// No params specified
export const customSequence = cockroachSequence("name");

// Sequence with params
export const customSequence = cockroachSequence("name", {
startWith: 100,
maxValue: 10000,
minValue: 100,
cycle: true,
cache: 10,
increment: 2
});

// Sequence in custom schema
export const customSchema = cockroachSchema('custom_schema');
export const customSequence = customSchema.sequence("name");

---

# https://orm.drizzle.team/docs/extensions/pg

We've merged alternation-engine into Beta release. Try it out!

**PostgreSQL** **MySQL** **SQLite** **SingleStore** **MSSQL** **CockroachDB**

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# PostgreSQL extensions

### `pg_vector`

There is no specific code to create an extension inside the Drizzle schema. We assume that if you are using vector types,
indexes, and queries, you have a PostgreSQL database with the pg_vector extension installed.

`pg_vector` is open-source vector similarity search for Postgres

Store your vectors with the rest of your data. Supports:

- exact and approximate nearest neighbor search
- single-precision, half-precision, binary, and sparse vectors
- L2 distance, inner product, cosine distance, L1 distance, Hamming distance, and Jaccard distance

#### Column Types

**`vector`**

Store your vectors with the rest of your data

For more info please refer to the official pg_vector docs **docs.**

const table = pgTable('table', {
embedding: vector({ dimensions: 3 })
})
CREATE TABLE IF NOT EXISTS "table" (
"embedding" vector(3)
);

#### Indexes

You can now specify indexes for `pg_vector` and utilize `pg_vector` functions for querying, ordering, etc.

Let’s take a few examples of `pg_vector` indexes from the `pg_vector` docs and translate them to Drizzle

#### L2 distance, Inner product and Cosine distance

// CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
// CREATE INDEX ON items USING hnsw (embedding vector_ip_ops);
// CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);

const table = pgTable('items', {
embedding: vector({ dimensions: 3 })

index('l2_index').using('hnsw', table.embedding.op('vector_l2_ops'))\
index('ip_index').using('hnsw', table.embedding.op('vector_ip_ops'))\
index('cosine_index').using('hnsw', table.embedding.op('vector_cosine_ops'))\
])

#### L1 distance, Hamming distance and Jaccard distance - added in pg_vector 0.7.0 version

// CREATE INDEX ON items USING hnsw (embedding vector_l1_ops);
// CREATE INDEX ON items USING hnsw (embedding bit_hamming_ops);
// CREATE INDEX ON items USING hnsw (embedding bit_jaccard_ops);

const table = pgTable('table', {
embedding: vector({ dimensions: 3 })

index('l1_index').using('hnsw', table.embedding.op('vector_l1_ops'))\
index('hamming_index').using('hnsw', table.embedding.op('bit_hamming_ops'))\
index('bit_jaccard_index').using('hnsw', table.embedding.op('bit_jaccard_ops'))\
])

#### Helper Functions

For queries, you can use predefined functions for vectors or create custom ones using the SQL template operator.

You can also use the following helpers:

import { l2Distance, l1Distance, innerProduct,
cosineDistance, hammingDistance, jaccardDistance } from 'drizzle-orm'

If `pg_vector` has some other functions to use, you can replicate implementation from existing one we have. Here is how it can be done

export function l2Distance(
column: SQLWrapper | AnyColumn,

): SQL {

}

Name it as you wish and change the operator. This example allows for a numbers array, strings array, string, or even a select query. Feel free to create any other type you want or even contribute and submit a PR

#### Examples

Let’s take a few examples of `pg_vector` queries from the `pg_vector` docs and translate them to Drizzle

import { l2Distance } from 'drizzle-orm';

db.select().from(items).orderBy(l2Distance(items.embedding, [3,1,2]))

db.select({ distance: l2Distance(items.embedding, [3,1,2]) })

const subquery = db.select({ embedding: items.embedding }).from(items).where(eq(items.id, 1));
db.select().from(items).orderBy(l2Distance(items.embedding, subquery)).limit(5)

db.select({ innerProduct: sql`(${maxInnerProduct(items.embedding, [3,1,2])}) * -1` }).from(items)

// and more!

### `postgis`

There is no specific code to create an extension inside the Drizzle schema. We assume that if you are using postgis types, indexes, and queries, you have a PostgreSQL database with the `postgis` extension installed.

If you are using the `introspect` or `push` commands with the PostGIS extension and don’t want PostGIS tables to be included, you can use `extensionsFilters` to ignore all the PostGIS tables

#### Column Types

**`geometry`**

Store your geometry data with the rest of your data

For more info please refer to the official PostGIS docs **docs.**

const items = pgTable('items', {
geo: geometry('geo', { type: 'point' }),
geoObj: geometry('geo_obj', { type: 'point', mode: 'xy' }),
geoSrid: geometry('geo_options', { type: 'point', mode: 'xy', srid: 4000 }),
});

**mode**

Type `geometry` has 2 modes for mappings from the database: `tuple` and `xy`.

- `tuple` will be accepted for insert and mapped on select to a tuple. So, the database geometry will be typed as \[1,2\] with drizzle.
- `xy` will be accepted for insert and mapped on select to an object with x, y coordinates. So, the database geometry will be typed as `{ x: 1, y: 2 }` with drizzle

**type**

The current release has a predefined type: `point`, which is the `geometry(Point)` type in the PostgreSQL PostGIS extension. You can specify any string there if you want to use some other type

#### Indexes

With the available Drizzle indexes API, you should be able to write any indexes for PostGIS

**Examples**

// CREATE INDEX custom_idx ON table USING GIST (geom);

const table = pgTable('table', {
geo: geometry({ type: 'point' }),

index('custom_idx').using('gist', table.geo)\
])

---

# https://orm.drizzle.team/docs/data-querying

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Drizzle Queries + CRUD

This guide assumes familiarity with:

- How to define your schema - Schema Fundamentals
- How to connect to the database - Connection Fundamentals

Drizzle gives you a few ways for querying your database and it’s up to you to decide which one you’ll need in your next project.
It can be either SQL-like syntax or Relational Syntax. Let’s check them:

## Why SQL-like?

**If you know SQL, you know Drizzle.**

Other ORMs and data frameworks tend to deviate from or abstract away SQL, leading to a double learning curve: you need to learn both SQL and the framework’s API.

Drizzle is the opposite.
We embrace SQL and built Drizzle to be SQL-like at its core, so you have little to no learning curve and full access to the power of SQL.

// Access your data
await db
.select()
.from(posts)
.leftJoin(comments, eq(posts.id, comments.post_id))
.where(eq(posts.id, 10))
SELECT \*
FROM posts
LEFT JOIN comments ON posts.id = comments.post_id
WHERE posts.id = 10

With SQL-like syntax, you can replicate much of what you can do with pure SQL and know
exactly what Drizzle will do and what query will be generated. You can perform a wide range of queries,
including select, insert, update, delete, as well as using aliases, WITH clauses, subqueries, prepared statements,
and more. Let’s look at more examples

insert

update

delete

await db.insert(users).values({ email: 'user@gmail.com' })
INSERT INTO users (email) VALUES ('user@gmail.com')
await db.update(users)
.set({ email: 'user@gmail.com' })
.where(eq(users.id, 1))
UPDATE users
SET email = 'user@gmail.com'
WHERE users.id = 1
await db.delete(users).where(eq(users.id, 1))
DELETE FROM users WHERE users.id = 1

## Why not SQL-like?

We’re always striving for a perfectly balanced solution. While SQL-like queries cover 100% of your needs,
there are certain common scenarios where data can be queried more efficiently.

We’ve built the Queries API so you can fetch relational, nested data from the database in the most convenient
and performant way, without worrying about joins or data mapping.

**Drizzle always outputs exactly one SQL query**. Feel free to use it with serverless databases,
and never worry about performance or roundtrip costs!

const result = await db.query.users.findMany({
with: {
posts: true
},
});

## Advanced

With Drizzle, queries can be composed and partitioned in any way you want. You can compose filters
independently from the main query, separate subqueries or conditional statements, and much more.
Let’s check a few advanced examples:

#### Compose a WHERE statement and then use it in a query

async function getProductsBy({
name,
category,
maxPrice,
}: {
name?: string;
category?: string;
maxPrice?: string;
}) {
const filters: SQL[] = [];

if (name) filters.push(ilike(products.name, name));
if (category) filters.push(eq(products.category, category));
if (maxPrice) filters.push(lte(products.price, maxPrice));

return db
.select()
.from(products)
.where(and(...filters));
}

#### Separate subqueries into different variables, and then use them in the main query

const subquery = db
.select()
.from(internalStaff)
.leftJoin(customUser, eq(internalStaff.userId, customUser.id))
.as('internal_staff');

const mainQuery = await db
.select()
.from(ticket)
.leftJoin(subquery, eq(subquery.internal_staff.userId, ticket.staffId));

#### What’s next?

**Access your data**

Query Select Insert Update Delete Filters Joins sql\`\` operator

**Zero to Hero**

Migrations

---

# https://orm.drizzle.team/docs/migrations

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Drizzle migrations fundamentals

SQL databases require you to specify a **strict schema** of entities you’re going to store upfront
and if (when) you need to change the shape of those entities - you will need to do it via **schema migrations**.

There’re multiple production grade ways of managing database migrations.
Drizzle is designed to perfectly suits all of them, regardless of you going **database first** or **codebase first**.

**Database first** is when your database schema is a source of truth. You manage your database schema either directly on the database or
via database migration tools and then you pull your database schema to your codebase application level entities.

**Codebase first** is when database schema in your codebase is a source of truth and is under version control. You declare and manage your database schema in JavaScript/TypeScript
and then you apply that schema to the database itself either with Drizzle, directly or via external migration tools.

#### How can Drizzle help?

We’ve built **drizzle-kit** \- CLI app for managing migrations with Drizzle.

drizzle-kit migrate
drizzle-kit generate
drizzle-kit push
drizzle-kit pull

It is designed to let you choose how to approach migrations based on your current business demands.

It fits in both database and codebase first approaches, it lets you **push your schema** or **generate SQL migration** files or **pull the schema** from database.
It is perfect wether you work alone or in a team.

---

**Now let’s pick the best option for your project:**

Expand details

That’s a **database first** approach. You have your database schema as a **source of truth** and
Drizzle lets you pull database schema to TypeScript using `drizzle-kit pull` command.

┌────────────────────────┐ ┌─────────────────────────┐
│ │ <--- CREATE TABLE "users" (
┌──────────────────────────┐ │ │ "id" SERIAL PRIMARY KEY,
│ ~ drizzle-kit pull │ │ │ "name" TEXT,
└─┬────────────────────────┘ │ DATABASE │ "email" TEXT UNIQUE
│ │ │ );

┌ Generate Drizzle <----- │ │
│ schema TypeScript file └────────────────────────┘
│
v
import \* as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
email: p.text().unique(),
});

> I want Drizzle to “push” my schema directly to the database

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a **source of truth** and
Drizzle lets you push schema changes to the database using `drizzle-kit push` command.

That’s the best approach for rapid prototyping and we’ve seen dozens of teams
and solo developers successfully using it as a primary migrations flow in their production applications.

import \* as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
email: p.text().unique(), // <--- added column
});
Add column to `users` table
┌──────────────────────────┐
│ + email: text().unique() │
└─┬────────────────────────┘
│
v
┌──────────────────────────┐
│ ~ drizzle-kit push │
└─┬────────────────────────┘
│ ┌──────────────────────────┐

│ │
┌ Generate alternations based on diff <---- │ DATABASE │
│ │ │

│ └──────────────────────────┘
│
┌────────────────────────────────────┴──────────────┐
ALTER TABLE `users` ADD COLUMN `email` TEXT UNIQUE;

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you generate SQL migration files based on your schema changes with `drizzle-kit generate`
and then apply them to the database with `drizzle-kit migrate` commands.

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
email: p.text().unique(),
});
┌────────────────────────┐
│ $ drizzle-kit generate │
└─┬──────────────────────┘
│
└ 1. read previous migration folders 2. find diff between current and previous schema 3. prompt developer for renames if necessary
┌ 4. generate SQL migration and persist to file
│ ┌─┴───────────────────────────────────────┐
│ 📂 drizzle
│ └ 📂 20242409125510_premium_mister_fear
│ ├ 📜 snapshot.json
│ └ 📜 migration.sql
v
-- drizzle/20242409125510_premium_mister_fear/migration.sql

CREATE TABLE "users" (
"id" SERIAL PRIMARY KEY,
"name" TEXT,
"email" TEXT UNIQUE
);
┌───────────────────────┐
│ $ drizzle-kit migrate │
└─┬─────────────────────┘
│ ┌──────────────────────────┐
└ 1. read migration.sql files in migrations folder │ │

┌ 3. pick previously unapplied migrations <-------------- │ DATABASE │

│ │
└──────────────────────────┘
[✓] done!

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you generate SQL migration files based on your schema changes with `drizzle-kit generate` and then
you can apply them to the database during runtime of your application.

This approach is widely used for **monolithic** applications when you apply database migrations
during zero downtime deployment and rollback DDL changes if something fails.
This is also used in **serverless** deployments with migrations running in **custom resource** once during deployment process.

CREATE TABLE "users" (
"id" SERIAL PRIMARY KEY,
"name" TEXT,
"email" TEXT UNIQUE
);
// index.ts
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle(process.env.DATABASE_URL);

await migrate(db);
┌───────────────────────┐
│ npx tsx src/index.ts │
└─┬─────────────────────┘
│
├ 1. init database connection ┌──────────────────────────┐
└ 2. read migration.sql files in migrations folder │ │

┌ 4. pick previously unapplied migrations <-------------- │ DATABASE │

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you generate SQL migration files based on your schema changes with `drizzle-kit generate` and then
you can apply them to the database either directly or via external migration tools.

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
email: p.text().unique(),
});
┌────────────────────────┐
│ $ drizzle-kit generate │
└─┬──────────────────────┘
│
└ 1. read previous migration folders 2. find diff between current and previous scheama 3. prompt developer for renames if necessary
┌ 4. generate SQL migration and persist to file
│ ┌─┴───────────────────────────────────────┐
│ 📂 drizzle
│ └ 📂 20242409125510_premium_mister_fear
│ ├ 📜 snapshot.json
│ └ 📜 migration.sql
v
-- drizzle/20242409125510_premium_mister_fear/migration.sql

CREATE TABLE "users" (
"id" SERIAL PRIMARY KEY,
"name" TEXT,
"email" TEXT UNIQUE
);
┌───────────────────────────────────┐
│ (.\_.) now you run your migrations │
└─┬─────────────────────────────────┘
│
directly to the database
│ ┌────────────────────┐

│ │ │ Database │
or via external tools │ │ │
│ │ └────────────────────┘
│ ┌────────────────────┐ │
└──│ Bytebase ├────────────┘
├────────────────────┤
│ Liquibase │
├────────────────────┤
│ Atlas │
├────────────────────┤
│ etc… │
└────────────────────┘

[✓] done!

That’s a **codebase first** approach. You have your TypeScript Drizzle schema as a source of truth and
Drizzle lets you export SQL statements based on your schema changes with `drizzle-kit export` and then
you can apply them to the database via Atlas or other external SQL migration tools.

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
email: p.text().unique(),
});
┌────────────────────────┐
│ $ drizzle-kit export │
└─┬──────────────────────┘
│
└ 1. read your drizzle schema 2. generated SQL representation of your schema
┌ 3. outputs to console
│
│
v
CREATE TABLE "users" (
"id" SERIAL PRIMARY KEY,
"name" TEXT,
"email" TEXT UNIQUE
);
┌───────────────────────────────────┐
│ (.\_.) now you run your migrations │
└─┬─────────────────────────────────┘
│
via Atlas
│ ┌──────────────┐
│ ┌────────────────────┐ │ │

└────────────────────┘ │ │
└──────────────┘

---

# https://orm.drizzle.team/docs/drizzle-config-file)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started-postgresql)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/column-types/pg)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/indexes-constraints)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/views)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/schemas)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/sequences)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/extensions/pg)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/connect-overview)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/data-querying)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/migrations)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started-mysql

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

To use Drizzle with a MySQL database, you should use the `mysql2` driver

According to the **official website**,
`mysql2` is a MySQL client for Node.js with focus on performance.

Drizzle ORM natively supports `mysql2` with `drizzle-orm/mysql2` package.

#### Step 1 - Install packages

npm

yarn

pnpm

bun

npm i drizzle-orm mysql2
npm i -D drizzle-kit
yarn add drizzle-orm mysql2
yarn add -D drizzle-kit
pnpm add drizzle-orm mysql2
pnpm add -D drizzle-kit
bun add drizzle-orm mysql2
bun add -D drizzle-kit

#### Step 2 - Initialize the driver and make a query

mysql2

mysql with config

import { drizzle } from "drizzle-orm/mysql2";

const db = drizzle(process.env.DATABASE_URL);

const response = await db.select().from(...)
import { drizzle } from "drizzle-orm/mysql2";

// You can specify any property from the mysql2 connection options
const db = drizzle({ connection:{ uri: process.env.DATABASE_URL }});

const response = await db.select().from(...)

If you need to provide your existing driver:

Client connection

Pool connection

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
host: "host",
user: "user",
database: "database",
...
});

const db = drizzle({ client: connection });
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const poolConnection = mysql.createPool({
host: "host",
user: "user",
database: "database",
...
});

const db = drizzle({ client: poolConnection });

IMPORTANT

For the built in `migrate` function with DDL migrations we and drivers strongly encourage you to use single `client` connection.

For querying purposes feel free to use either `client` or `pool` based on your business demands.

#### What’s next?

**Manage schema**

Drizzle Schema PostgreSQL data types Indexes and Constraints Database Views Database Schemas Sequences Extensions

**Query data**

Relational Queries Select Insert Update Delete Filters Joins sql\`\` operator

---

# https://orm.drizzle.team/docs/get-started-sqlite

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle has native support for SQLite connections with the `libsql` and `better-sqlite3` drivers.

There are a few differences between the `libsql` and `better-sqlite3` drivers that we discovered while using both and integrating them with the Drizzle ORM. For example:

At the driver level, there may not be many differences between the two, but the main one is that `libSQL` can connect to both SQLite files and `Turso` remote databases. LibSQL is a fork of SQLite that offers a bit more functionality compared to standard SQLite, such as:

- More ALTER statements are available with the `libSQL` driver, allowing you to manage your schema more easily than with just `better-sqlite3`.
- You can configure the encryption at rest feature natively.
- A large set of extensions supported by the SQLite database is also supported by `libSQL`.

## libsql

#### Step 1 - Install packages

npm

yarn

pnpm

bun

npm i drizzle-orm @libsql/client
npm i -D drizzle-kit
yarn add drizzle-orm @libsql/client
yarn add -D drizzle-kit
pnpm add drizzle-orm @libsql/client
pnpm add -D drizzle-kit
bun add drizzle-orm @libsql/client
bun add -D drizzle-kit

#### Step 2 - Initialize the driver

Drizzle has native support for all @libsql/client driver variations:

|                          |                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@libsql/client`         | defaults to `node` import, automatically changes to `web` if `target` or `platform` is set for bundler, e.g. `esbuild --platform=browser` |
| `@libsql/client/node`    | `node` compatible module, supports `:memory:`, `file`, `wss`, `http` and `turso` connection protocols                                     |
| `@libsql/client/web`     | module for fullstack web frameworks like `next`, `nuxt`, `astro`, etc.                                                                    |
| `@libsql/client/http`    | module for `http` and `https` connection protocols                                                                                        |
| `@libsql/client/ws`      | module for `ws` and `wss` connection protocols                                                                                            |
| `@libsql/client/sqlite3` | module for `:memory:` and `file` connection protocols                                                                                     |
| `@libsql/client-wasm`    | Separate experimental package for WASM                                                                                                    |

default

node

web

http

web sockets

wasm

import { drizzle } from 'drizzle-orm/libsql';

const db = drizzle({ connection: {
url: process.env.DATABASE_URL,
authToken: process.env.DATABASE_AUTH_TOKEN
}});
import { drizzle } from 'drizzle-orm/libsql/node';

const db = drizzle({ connection: {
url: process.env.DATABASE_URL,
authToken: process.env.DATABASE_AUTH_TOKEN
}});
import { drizzle } from 'drizzle-orm/libsql/web';

const db = drizzle({ connection: {
url: process.env.DATABASE_URL,
authToken: process.env.DATABASE_AUTH_TOKEN
}});
import { drizzle } from 'drizzle-orm/libsql/http';

const db = drizzle({ connection: {
url: process.env.DATABASE_URL,
authToken: process.env.DATABASE_AUTH_TOKEN
}});
import { drizzle } from 'drizzle-orm/libsql/ws';

const db = drizzle({ connection: {
url: process.env.DATABASE_URL,
authToken: process.env.DATABASE_AUTH_TOKEN
}});
import { drizzle } from 'drizzle-orm/libsql/wasm';

const db = drizzle({ connection: {
url: process.env.DATABASE_URL,
authToken: process.env.DATABASE_AUTH_TOKEN
}});

#### Step 3 - make a query

libsql

libsql with config

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute('select 1');
import { drizzle } from 'drizzle-orm/libsql';

// You can specify any property from the libsql connection options
const db = drizzle({ connection: { url:'', authToken: '' }});

const result = await db.execute('select 1');

If you need a synchronous connection, you can use our additional connection API,
where you specify a driver connection and pass it to the Drizzle instance.

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
const db = drizzle(client);

## better-sqlite3

#### Step 1 - Install packages

npm i drizzle-orm better-sqlite3
npm i -D drizzle-kit @types/better-sqlite3
yarn add drizzle-orm better-sqlite3
yarn add -D drizzle-kit @types/better-sqlite3
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
bun add drizzle-orm better-sqlite3
bun add -D drizzle-kit @types/better-sqlite3

#### Step 2 - Initialize the driver and make a query

better-sqlite3

better-sqlite3 with config

import { drizzle } from 'drizzle-orm/better-sqlite3';

const result = await db.execute('select 1');
import { drizzle } from 'drizzle-orm/better-sqlite3';

// You can specify any property from the better-sqlite3 connection options
const db = drizzle({ connection: { source: process.env.DATABASE_URL }});

If you need to provide your existing driver:

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
const db = drizzle({ client: sqlite });

#### What’s next?

**Manage schema**

Drizzle Schema PostgreSQL data types Indexes and Constraints Database Views Database Schemas Sequences Extensions

**Query data**

Relational Queries Select Insert Update Delete Filters Joins sql\`\` operator

---

# https://orm.drizzle.team/docs/get-started-singlestore

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

To use Drizzle with a SingleStore database, you should use the `mysql2` driver

Drizzle ORM natively supports `mysql2` with `drizzle-orm/singlestore` package.

#### Step 1 - Install packages

npm

yarn

pnpm

bun

npm i drizzle-orm mysql2
npm i -D drizzle-kit
yarn add drizzle-orm mysql2
yarn add -D drizzle-kit
pnpm add drizzle-orm mysql2
pnpm add -D drizzle-kit
bun add drizzle-orm mysql2
bun add -D drizzle-kit

#### Step 2 - Initialize the driver and make a query

mysql2

mysql with config

import { drizzle } from "drizzle-orm/singlestore";

const db = drizzle(process.env.DATABASE_URL);

const response = await db.select().from(...)
import { drizzle } from "drizzle-orm/singlestore";

// You can specify any property from the mysql2 connection options
const db = drizzle({ connection:{ uri: process.env.DATABASE_URL }});

const response = await db.select().from(...)

If you need to provide your existing driver:

Client connection

Pool connection

import { drizzle } from "drizzle-orm/singlestore";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
host: "host",
user: "user",
database: "database",
...
});

const db = drizzle({ client: connection });
import { drizzle } from "drizzle-orm/singlestore";
import mysql from "mysql2/promise";

const poolConnection = mysql.createPool({
host: "host",
user: "user",
database: "database",
...
});

const db = drizzle({ client: poolConnection });

IMPORTANT

For the built in `migrate` function with DDL migrations we and drivers strongly encourage you to use single `client` connection.

For querying purposes feel free to use either `client` or `pool` based on your business demands.

#### Limitations

Currently, the SingleStore dialect has a set of limitations and features that do not work on the SingleStore database side:

- SingleStore’s serial column type only ensures the uniqueness of column values.
- `ORDER BY` and `LIMIT` cannot be chained together.
- Foreign keys are not supported (check).
- `INTERSECT ALL` and `EXCEPT ALL` operations are not supported by SingleStore.
- Nested transactions are not supported by SingleStore.
- SingleStore only supports one `isolationLevel`.
- The FSP option in `DATE`, `TIMESTAMP`, and `DATETIME` is not supported.
- The relational API is not supported and will be implemented once the SingleStore team develops all the necessary APIs for it.
- There may be more limitations because SingleStore is not 100% compatible with MySQL.

#### What’s next?

**Manage schema**

Drizzle Schema PostgreSQL data types Indexes and Constraints Database Views Database Schemas Sequences Extensions

**Query data**

Relational Queries Select Insert Update Delete Filters Joins sql\`\` operator

---

# https://orm.drizzle.team/docs/select)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/sql-schema-declaration)\*\*,

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/select)\*\*,

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/migrations)\*\*

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/rqb)\*\*.

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/rqb)\*\*

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started-postgresql)\*\*,

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started-mysql)\*\*,

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started-sqlite)\*\*

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started-singlestore)\*\*

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started-mysql)\*\*

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/conditional-filters-in-query

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Conditional filters in query

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite;
- Select statement;
- Filtering and Filter operators;

To pass a conditional filter in query you can use `.where()` method and logical operator like below:

import { ilike } from 'drizzle-orm';

const db = drizzle(...)

await db
.select()
.from(posts)
.where(term ? ilike(posts.title, term) : undefined);
};

await searchPosts();
await searchPosts('AI');
select _ from posts;
select _ from posts where title ilike 'AI';

To combine conditional filters you can use `and()` or `or()` operators like below:

import { and, gt, ilike, inArray } from 'drizzle-orm';

await db
.select()
.from(posts)
.where(
and(
term ? ilike(posts.title, term) : undefined,

),
);
};

await searchPosts();
await searchPosts('AI', ['Tech', 'Art', 'Science'], 200);
select _ from posts;
select _ from posts
where (
title ilike 'AI'
and category in ('Tech', 'Science', 'Art')

);

If you need to combine conditional filters in different part of the project you can create a variable, push filters and then use it in `.where()` method with `and()` or `or()` operators like below:

import { SQL, ... } from 'drizzle-orm';

await db
.select()
.from(posts)
.where(and(...filters));
};

const filters: SQL[] = [];
filters.push(ilike(posts.title, 'AI'));
filters.push(inArray(posts.category, ['Tech', 'Art', 'Science']));
filters.push(gt(posts.views, 200));

await searchPosts(filters);

Drizzle has useful and flexible API, which lets you create your custom solutions. This is how you can create a custom filter operator:

import { AnyColumn, ... } from 'drizzle-orm';

// length less than

return sql`length(${column}) < ${value}`;
};

await db
.select()
.from(posts)
.where(
and(
maxLen ? lenlt(posts.title, maxLen) : undefined,

await searchPosts(8);
await searchPosts(8, 200);
select \* from posts where length(title) < 8;

Drizzle filter operators are just SQL expressions under the hood. This is example of how `lt` operator is implemented in Drizzle:

return sql`${left} < ${bindIfParam(right, left)}`; // bindIfParam is internal magic function
};

---

# https://orm.drizzle.team/docs/guides/incrementing-a-value

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| SQL Increment value

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Update statement
- Filters and sql operator

To increment a column value you can use `update().set()` method like below:

import { eq, sql } from 'drizzle-orm';

const db = drizzle(...)

await db
.update(table)
.set({
counter: sql`${table.counter} + 1`,
})
.where(eq(table.id, 1));
update "table" set "counter" = "counter" + 1 where "id" = 1;

Drizzle has simple and flexible API, which lets you easily create custom solutions. This is how you do custom increment function:

import { AnyColumn } from 'drizzle-orm';

return sql`${column} + ${value}`;
};

await db
.update(table)
.set({
counter1: increment(table.counter1),
counter2: increment(table.counter2, 10),
})
.where(eq(table.id, 1));

---

# https://orm.drizzle.team/docs/guides/decrementing-a-value

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| SQL Decrement value

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Update statement
- Filters and sql operator

To decrement a column value you can use `update().set()` method like below:

import { eq, sql } from 'drizzle-orm';

const db = drizzle(...)

await db
.update(table)
.set({
counter: sql`${table.counter} - 1`,
})
.where(eq(table.id, 1));
update "table" set "counter" = "counter" - 1 where "id" = 1;

Drizzle has simple and flexible API, which lets you easily create custom solutions. This is how you do custom decrement function:

import { AnyColumn } from 'drizzle-orm';

return sql`${column} - ${value}`;
};

await db
.update(table)
.set({
counter1: decrement(table.counter1),
counter2: decrement(table.counter2, 10),
})
.where(eq(table.id, 1));

---

# https://orm.drizzle.team/docs/guides/include-or-exclude-columns

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Include or Exclude Columns in Query

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Select statement
- Get typed table columns
- Joins
- Relational queries
- Partial select with relational queries

Drizzle has flexible API for including or excluding columns in queries. To include all columns you can use `.select()` method like this:

index.ts

schema.ts

import { posts } from './schema';

const db = drizzle(...);

await db.select().from(posts);
// result type
type Result = {
id: number;
title: string;
content: string;
views: number;
}[];
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
title: text('title').notNull(),
content: text('content').notNull(),
views: integer('views').notNull().default(0),
});

To include specific columns you can use `.select()` method like this:

await db.select({ title: posts.title }).from(posts);
// result type
type Result = {
title: string;
}[];

To include all columns with extra columns you can use `getColumns()` utility function like this:

IMPORTANT

`getColumns` available starting from `drizzle-orm@1.0.0-beta.2`(read more here)

If you are on pre-1 version(like `0.45.1`) then use `getTableColumns`

import { getColumns, sql } from 'drizzle-orm';

await db
.select({
...getColumns(posts),

})
.from(posts);
// result type
type Result = {
id: number;
title: string;
content: string;
views: number;
titleLength: number;
}[];

To exclude columns you can use `getColumns()` utility function like this:

import { getColumns } from 'drizzle-orm';

const { content, ...rest } = getColumns(posts); // exclude "content" column

await db.select({ ...rest }).from(posts); // select all other columns
// result type
type Result = {
id: number;
title: string;
views: number;
}[];

This is how you can include or exclude columns with joins:

import { eq, getColumns } from 'drizzle-orm';
import { comments, posts, users } from './db/schema';

// exclude "userId" and "postId" columns from "comments"
const { userId, postId, ...rest } = getColumns(comments);

await db
.select({
postId: posts.id, // include "id" column from "posts"
comment: { ...rest }, // include all other columns
user: users, // equivalent to getColumns(users)
})
.from(posts)
.leftJoin(comments, eq(posts.id, comments.postId))
.leftJoin(users, eq(users.id, posts.userId));
// result type
type Result = {
postId: number;
comment: {
id: number;
content: string;
createdAt: Date;
} | null;
user: {
id: number;
name: string;
email: string;
} | null;
}[];
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
email: text('email').notNull(),
});

export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
title: text('title').notNull(),
content: text('content').notNull(),
views: integer('views').notNull().default(0),

});

export const comments = pgTable('comments', {
id: serial('id').primaryKey(),

content: text('content').notNull(),
createdAt: timestamp('created_at').notNull().defaultNow(),
});

Drizzle has useful relational queries API, that lets you easily include or exclude columns in queries. This is how you can include all columns:

import \* as schema from './schema';

const db = drizzle(..., { schema });

await db.query.posts.findMany();
// result type
type Result = {
id: number;
title: string;
content: string;
views: number;
}[]
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

This is how you can include specific columns using relational queries:

await db.query.posts.findMany({
columns: {
title: true,
},
});
// result type
type Result = {
title: string;
}[]

This is how you can include all columns with extra columns using relational queries:

import { sql } from 'drizzle-orm';

await db.query.posts.findMany({
extras: {

},
});
// result type
type Result = {
id: number;
title: string;
content: string;
views: number;
titleLength: number;
}[];

This is how you can exclude columns using relational queries:

await db.query.posts.findMany({
columns: {
content: false,
},
});
// result type
type Result = {
id: number;
title: string;
views: number;
}[]

This is how you can include or exclude columns with relations using relational queries:

await db.query.posts.findMany({
columns: {
id: true, // include "id" column
},
with: {
comments: {
columns: {
userId: false, // exclude "userId" column
postId: false, // exclude "postId" column
},
},
user: true, // include all columns from "users" table
},
});
// result type
type Result = {
id: number;
user: {
id: number;
name: string;
email: string;
};
comments: {
id: number;
content: string;
createdAt: Date;
}[];
}[]
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

posts: many(posts),
comments: many(comments),
}));

comments: many(comments),
user: one(users, { fields: [posts.userId], references: [users.id] }),
}));

post: one(posts, { fields: [comments.postId], references: [posts.id] }),
user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

This is how you can create custom solution for conditional select:

await db
.select({
id: posts.id,
...(withTitle && { title: posts.title }),
})
.from(posts);
};

await searchPosts();
await searchPosts(true);
// result type
type Result = {
id: number;
title?: string | undefined;
}[];
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

---

# https://orm.drizzle.team/docs/guides/toggling-a-boolean-field

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| SQL Toggle value

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Update statement
- Filters and not operator
- Boolean data type in MySQL and SQLite

To toggle a column value you can use `update().set()` method like below:

import { eq, not } from 'drizzle-orm';

const db = drizzle(...);

await db
.update(table)
.set({
isActive: not(table.isActive),
})
.where(eq(table.id, 1));
update "table" set "is_active" = not "is_active" where "id" = 1;

Please note that there is no boolean type in MySQL and SQLite.
MySQL uses tinyint(1).
SQLite uses integers 0 (false) and 1 (true).

---

# https://orm.drizzle.team/docs/guides/count-rows

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Count rows

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Select statement
- Filters and sql operator
- Aggregations and Aggregation helpers
- Joins

To count all rows in table you can use `count()` function or `sql` operator like below:

index.ts

schema.ts

import { count, sql } from 'drizzle-orm';
import { products } from './schema';

const db = drizzle(...);

await db.select({ count: count() }).from(products);

// Under the hood, the count() function casts its result to a number at runtime.
await db.select({ count: sql`count(*)`.mapWith(Number) }).from(products);
// result type
type Result = {
count: number;
}[];
select count(\*) from products;
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
discount: integer('discount'),
price: integer('price').notNull(),
});

To count rows where the specified column contains non-NULL values you can use `count()` function with a column:

await db.select({ count: count(products.discount) }).from(products);
// result type
type Result = {
count: number;
}[];
select count("discount") from products;

Drizzle has simple and flexible API, which lets you create your custom solutions. In PostgreSQL and MySQL `count()` function returns bigint, which is interpreted as string by their drivers, so it should be casted to integer:

import { AnyColumn, sql } from 'drizzle-orm';

if (column) {

} else {

}
};

await db.select({ count: customCount() }).from(products);
await db.select({ count: customCount(products.discount) }).from(products);
select cast(count(\*) as integer) from products;
select cast(count("discount") as integer) from products;

In SQLite, `count()` result returns as integer.

import { sql } from 'drizzle-orm';

select count(\*) from products;
select count("discount") from products;

IMPORTANT

Drizzle cannot perform any type casts based on the provided type generic, because that information is not available at runtime.

If you need to apply runtime transformations to the returned value, you can use the `.mapWith()` method.

To count rows that match a condition you can use `.where()` method:

import { count, gt } from 'drizzle-orm';

await db
.select({ count: count() })
.from(products)
.where(gt(products.price, 100));

This is how you can use `count()` function with joins and aggregations:

import { count, eq } from 'drizzle-orm';
import { countries, cities } from './schema';

// Count cities in each country
await db
.select({
country: countries.name,
citiesCount: count(cities.id),
})
.from(countries)
.leftJoin(cities, eq(countries.id, cities.countryId))
.groupBy(countries.id)
.orderBy(countries.name);
select countries.name, count("cities"."id") from countries
left join cities on countries.id = cities.country_id
group by countries.id
order by countries.name;
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const countries = pgTable('countries', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
});

export const cities = pgTable('cities', {
id: serial('id').primaryKey(),
name: text('name').notNull(),

});

---

# https://orm.drizzle.team/docs/guides/upsert

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Upsert Query

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Insert statement, onConflictDoUpdate method and onDuplicateKeyUpdate method
- Composite primary key
- sql operator

### PostgreSQL and SQLite

To implement an upsert query in PostgreSQL and SQLite (skip to MySQL) with Drizzle you can use `.onConflictDoUpdate()` method:

import { users } from './schema';

const db = drizzle(...);

await db
.insert(users)
.values({ id: 1, name: 'John' })
.onConflictDoUpdate({
target: users.id,
set: { name: 'Super John' },
});
insert into users ("id", "name") values (1, 'John')
on conflict ("id") do update set name = 'Super John';

To upsert multiple rows in one query in PostgreSQL and SQLite you can use `sql operator` and `excluded` keyword. `excluded` is a special reference that refer to the row that was proposed for insertion, but wasn’t inserted because of the conflict.

This is how you can do it:

index.ts

schema.ts

import { sql } from 'drizzle-orm';
import { users } from './schema';

const values = [\
{\
id: 1,\
lastLogin: new Date(),\
},\
{\
id: 2,\
lastLogin: new Date(Date.now() + 1000 * 60 * 60),\
},\
{\
id: 3,\
lastLogin: new Date(Date.now() + 1000 * 60 * 120),\
},\
];

await db
.insert(users)
.values(values)
.onConflictDoUpdate({
target: users.id,
set: { lastLogin: sql.raw(`excluded.${users.lastLogin.name}`) },
});
insert into users ("id", "last_login")
values
(1, '2024-03-15T22:29:06.679Z'),
(2, '2024-03-15T23:29:06.679Z'),
(3, '2024-03-16T00:29:06.679Z')
on conflict ("id") do update set last_login = excluded.last_login;
import { pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
lastLogin: timestamp('last_login', { mode: 'date' }).notNull(),
});

Drizzle has simple and flexible API, which lets you easily create custom solutions. This is how you do custom function for updating specific columns in multiple rows due to the conflict in PostgreSQL and SQLite:

IMPORTANT

`getColumns` available starting from `drizzle-orm@1.0.0-beta.2`(read more here)

If you are on pre-1 version(like `0.45.1`) then use `getTableColumns`

import { SQL, getColumns, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { users } from './schema';

const buildConflictUpdateColumns = <
T extends PgTable | SQLiteTable,

table: T,
columns: Q[],

const cls = getColumns(table);

const colName = cls[column].name;
acc[column] = sql.raw(`excluded.${colName}`);

return acc;

};

const values = [\
{\
id: 1,\
lastLogin: new Date(),\
active: true,\
},\
{\
id: 2,\
lastLogin: new Date(Date.now() + 1000 * 60 * 60),\
active: true,\
},\
{\
id: 3,\
lastLogin: new Date(Date.now() + 1000 * 60 * 120),\
active: true,\
},\
];

await db
.insert(users)
.values(values)
.onConflictDoUpdate({
target: users.id,
set: buildConflictUpdateColumns(users, ['lastLogin', 'active']),
});
insert into users ("id", "last_login", "active")
values
(1, '2024-03-16T15:44:41.141Z', true),
(2, '2024-03-16T16:44:41.141Z', true),
(3, '2024-03-16T17:44:41.141Z', true)
on conflict ("id") do update set last_login = excluded.last_login, active = excluded.active;
import { boolean, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
lastLogin: timestamp('last_login', { mode: 'date' }).notNull(),
active: boolean('active').notNull().default(false),
});

This is how you can implement an upsert query with multiple targets in PostgreSQL and SQLite:

import { sql } from 'drizzle-orm';
import { inventory } from './schema';

await db
.insert(inventory)
.values({ warehouseId: 1, productId: 1, quantity: 100 })
.onConflictDoUpdate({
target: [inventory.warehouseId, inventory.productId], // composite primary key
set: { quantity: sql`${inventory.quantity} + 100` }, // add 100 to the existing quantity
});
insert into inventory ("warehouse_id", "product_id", "quantity") values (1, 1, 100)
on conflict ("warehouse_id","product_id") do update set quantity = quantity + 100;

If you want to implement upsert query with `where` clause for `update` statement, you can use `setWhere` property in `onConflictDoUpdate` method:

import { or, sql } from 'drizzle-orm';
import { products } from './schema';

const data = {
id: 1,
title: 'Phone',
price: '999.99',
stock: 10,
lastUpdated: new Date(),
};

const excludedPrice = sql.raw(`excluded.${products.price.name}`);
const excludedStock = sql.raw(`excluded.${products.stock.name}`);

await db
.insert(products)
.values(data)
.onConflictDoUpdate({
target: products.id,
set: {
price: excludedPrice,
stock: excludedStock,
lastUpdated: sql.raw(`excluded.${products.lastUpdated.name}`)
},
setWhere: or(
sql`${products.stock} != ${excludedStock}`,
sql`${products.price} != ${excludedPrice}`
),
});
insert into products ("id", "title", "stock", "price", "last_updated")
values (1, 'Phone', 10, '999.99', '2024-04-29T21:56:55.563Z')
on conflict ("id") do update
set stock = excluded.stock, price = excluded.price, last_updated = excluded.last_updated
where (stock != excluded.stock or price != excluded.price);
import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
id: serial('id').primaryKey(),
title: text('title').notNull(),
stock: integer('stock').notNull(),
price: numeric('price', { precision: 10, scale: 2 }).notNull(),
lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});

If you want to update all columns except of specific one, you can leave the previous value like this:

const data = {
id: 1,
name: 'John',
email: 'john@email.com',
age: 29,
};

await db
.insert(users)
.values(data)
.onConflictDoUpdate({
target: users.id,
set: { ...data, email: sql`${users.email}` }, // leave email as it was
});
insert into users ("id", "name", "email", "age") values (1, 'John', 'john@email.com', 29)
on conflict ("id") do update set id = 1, name = 'John', email = email, age = 29;

### MySQL

To implement an upsert query in MySQL with Drizzle you can use `.onDuplicateKeyUpdate()` method. MySQL will automatically determine the conflict target based on the primary key and unique indexes, and will update the row if any unique index conflicts.

await db
.insert(users)
.values({ id: 1, name: 'John' })
.onDuplicateKeyUpdate({ set: { name: 'Super John' } });
insert into users (`id`, `first_name`) values (1, 'John')
on duplicate key update first_name = 'Super John';

To upsert multiple rows in one query in MySQL you can use `sql operator` and `values()` function. `values()` function refers to the value of column that would be inserted if duplicate-key conflict hadn’t occurred.

await db
.insert(users)
.values(values)
.onDuplicateKeyUpdate({
set: {
lastLogin: sql`values(${users.lastLogin})`,
},
});
insert into users (`id`, `last_login`)
values
(1, '2024-03-15 23:08:27.025'),
(2, '2024-03-15 00:08:27.025'),
(3, '2024-03-15 01:08:27.025')
on duplicate key update last_login = values(last_login);
import { mysqlTable, serial, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
id: serial('id').primaryKey(),
lastLogin: timestamp('last_login', { mode: 'date' }).notNull(),
});

Drizzle has simple and flexible API, which lets you easily create custom solutions. This is how you do custom function for updating specific columns in multiple rows due to the conflict in MySQL:

import { SQL, getColumns, sql } from 'drizzle-orm';
import { MySqlTable } from 'drizzle-orm/mysql-core';
import { users } from './schema';

acc[column] = sql`values(${cls[column]})`;
return acc;

await db
.insert(users)
.values(values)
.onDuplicateKeyUpdate({
set: buildConflictUpdateColumns(users, ['lastLogin', 'active']),
});
insert into users (`id`, `last_login`, `active`)
values
(1, '2024-03-16 15:23:28.013', true),
(2, '2024-03-16 16:23:28.013', true),
(3, '2024-03-16 17:23:28.013', true)
on duplicate key update last_login = values(last_login), active = values(active);
import { boolean, mysqlTable, serial, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
id: serial('id').primaryKey(),
lastLogin: timestamp('last_login', { mode: 'date' }).notNull(),
active: boolean('active').notNull().default(false),
});

await db
.insert(users)
.values(data)
.onDuplicateKeyUpdate({
set: { ...data, email: sql`${users.email}` }, // leave email as it was
});
insert into users (`id`, `name`, `email`, `age`) values (1, 'John', 'john@email.com', 29)
on duplicate key update id = 1, name = 'John', email = email, age = 29;

---

# https://orm.drizzle.team/docs/guides/limit-offset-pagination

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| SQL Limit/Offset pagination

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Select statement with order by clause and limit & offset clauses
- Relational queries with order by clause and limit & offset clauses
- Dynamic query building

This guide demonstrates how to implement `limit/offset` pagination in Drizzle:

index.ts

schema.ts

import { asc } from 'drizzle-orm';
import { users } from './schema';

const db = drizzle(...);

await db
.select()
.from(users)
.orderBy(asc(users.id)) // order by is mandatory
.limit(4) // the number of rows to return
.offset(4); // the number of rows to skip
select \* from users order by id asc limit 4 offset 4;
// 5-8 rows returned
[\
{\
id: 5,\
firstName: 'Beth',\
lastName: 'Davis',\
createdAt: 2024-03-11T20:51:46.787Z\
},\
{\
id: 6,\
firstName: 'Charlie',\
lastName: 'Miller',\
createdAt: 2024-03-11T21:15:46.787Z\
},\
{\
id: 7,\
firstName: 'Clara',\
lastName: 'Wilson',\
createdAt: 2024-03-11T21:33:46.787Z\
},\
{\
id: 8,\
firstName: 'David',\
lastName: 'Moore',\
createdAt: 2024-03-11T21:45:46.787Z\
}\
]
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
firstName: text('first_name').notNull(),
lastName: text('last_name').notNull(),
createdAt: timestamp('created_at').notNull().defaultNow(),
});
+----+------------+-----------+----------------------------+
| id | first_name | last_name | created_at |
+----+------------+-----------+----------------------------+
| 1 | Alice | Johnson | 2024-03-08 12:23:55.251797 |
+----+------------+-----------+----------------------------+
| 2 | Alex | Smith | 2024-03-08 12:25:55.182 |
+----+------------+-----------+----------------------------+
| 3 | Aaron | Williams | 2024-03-08 12:28:55.182 |
+----+------------+-----------+----------------------------+
| 4 | Brian | Brown | 2024-03-08 12:34:55.182 |
+----+------------+-----------+----------------------------+
| 5 | Beth | Davis | 2024-03-08 12:40:55.182 |
+----+------------+-----------+----------------------------+
| 6 | Charlie | Miller | 2024-03-08 13:04:55.182 |
+----+------------+-----------+----------------------------+
| 7 | Clara | Wilson | 2024-03-08 13:22:55.182 |
+----+------------+-----------+----------------------------+
| 8 | David | Moore | 2024-03-08 13:34:55.182 |
+----+------------+-----------+----------------------------+

Limit is the number of rows to return `(page size)` and offset is the number of rows to skip `((page number - 1) * page size)`.
For consistent pagination, ensure ordering by a unique column. Otherwise, the results can be inconsistent.

If you need to order by a non-unique column, you should also append a unique column to the ordering.

This is how you can implement `limit/offset` pagination with 2 columns:

await db
.select()
.from(users)
.orderBy(asc(users.firstName), asc(users.id)) // order by first_name (non-unique), id (pk)
.limit(pageSize)
.offset((page - 1) \* pageSize);
}

await getUsers();

Drizzle has useful relational queries API, that lets you easily implement `limit/offset` pagination:

import \* as schema from './db/schema';

const db = drizzle({ schema });

await db.query.users.findMany({

limit: pageSize,
offset: (page - 1) \* pageSize,
});
};

Drizzle has simple and flexible API, which lets you easily create custom solutions. This is how you can create custom function for pagination using `.$dynamic()` function:

import { SQL, asc } from 'drizzle-orm';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';

qb: T,
orderByColumn: PgColumn | SQL | SQL.Aliased,
page = 1,
pageSize = 3,
) {
return qb
.orderBy(orderByColumn)
.limit(pageSize)
.offset((page - 1) \* pageSize);
}

const query = db.select().from(users); // query that you want to execute with pagination

await withPagination(query.$dynamic(), asc(users.id));

You can improve performance of `limit/offset` pagination by using `deferred join` technique. This method performs the pagination on a subset of the data instead of the entire table.

To implement it you can do like this:

const sq = db
.select({ id: users.id })
.from(users)
.orderBy(users.id)
.limit(pageSize)
.offset((page - 1) \* pageSize)
.as('subquery');

await db.select().from(users).innerJoin(sq, eq(users.id, sq.id)).orderBy(users.id);
};

**Benefits** of `limit/offset` pagination: it’s simple to implement and pages are easily reachable, which means that you can navigate to any page without having to save the state of the previous pages.

**Drawbacks** of `limit/offset` pagination: degradation in query performance with increasing offset because database has to scan all rows before the offset to skip them, and inconsistency due to data shifts, which can lead to the same row being returned on different pages or rows being skipped.

This is how it works:

await db
.select()
.from(users)
.orderBy(asc(users.id))
.limit(pageSize)
.offset((page - 1) \* pageSize);
};

// user is browsing the first page
await getUsers();
// results for the first page
[\
{\
id: 1,\
firstName: 'Alice',\
lastName: 'Johnson',\
createdAt: 2024-03-10T17:17:06.148Z\
},\
{\
id: 2,\
firstName: 'Alex',\
lastName: 'Smith',\
createdAt: 2024-03-10T17:19:06.147Z\
},\
{\
id: 3,\
firstName: 'Aaron',\
lastName: 'Williams',\
createdAt: 2024-03-10T17:22:06.147Z\
}\
]
// while user is browsing the first page, a row with id 2 is deleted
await db.delete(users).where(eq(users.id, 2));

// user navigates to the second page
await getUsers(2);
// second page, row with id 3 was skipped
[\
{\
id: 5,\
firstName: 'Beth',\
lastName: 'Davis',\
createdAt: 2024-03-10T17:34:06.147Z\
},\
{\
id: 6,\
firstName: 'Charlie',\
lastName: 'Miller',\
createdAt: 2024-03-10T17:58:06.147Z\
},\
{\
id: 7,\
firstName: 'Clara',\
lastName: 'Wilson',\
createdAt: 2024-03-10T18:16:06.147Z\
}\
]

So, if your database experiences frequently insert and delete operations in real time or you need high performance to paginate large tables, you should consider using cursor-based pagination instead.

To learn more about `deferred join` technique you should follow these guides: Planetscale Pagination Guide and Efficient Pagination Guide by Aaron Francis.

---

# https://orm.drizzle.team/docs/guides/cursor-based-pagination

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| SQL Cursor-based pagination

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Select statement with order by clause
- Relational queries with order by clause
- Indices

This guide demonstrates how to implement `cursor-based` pagination in Drizzle:

index.ts

schema.ts

import { asc, gt } from 'drizzle-orm';
import { users } from './schema';

const db = drizzle(...);

await db
.select()
.from(users)
.where(cursor ? gt(users.id, cursor) : undefined) // if cursor is provided, get rows after it
.limit(pageSize) // the number of rows to return
.orderBy(asc(users.id)); // ordering
};

// pass the cursor of the last row of the previous page (id)
await nextUserPage(3);
select \* from users order by id asc limit 3;
// next page, 4-6 rows returned
[\
{\
id: 4,\
firstName: 'Brian',\
lastName: 'Brown',\
createdAt: 2024-03-08T12:34:55.182Z\
},\
{\
id: 5,\
firstName: 'Beth',\
lastName: 'Davis',\
createdAt: 2024-03-08T12:40:55.182Z\
},\
{\
id: 6,\
firstName: 'Charlie',\
lastName: 'Miller',\
createdAt: 2024-03-08T13:04:55.182Z\
}\
]
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
firstName: text('first_name').notNull(),
lastName: text('last_name').notNull(),
createdAt: timestamp('created_at').notNull().defaultNow(),
});
+----+------------+------------+----------------------------+
| id | first_name | last_name | created_at |
+----+------------+------------+----------------------------+
| 1 | Alice | Johnson | 2024-03-08 12:23:55.251797 |
+----+------------+------------+----------------------------+
| 2 | Alex | Smith | 2024-03-08 12:25:55.182 |
+----+------------+------------+----------------------------+
| 3 | Aaron | Williams | 2024-03-08 12:28:55.182 |
+----+------------+------------+----------------------------+
| 4 | Brian | Brown | 2024-03-08 12:34:55.182 |
+----+------------+------------+----------------------------+
| 5 | Beth | Davis | 2024-03-08 12:40:55.182 |
+----+------------+------------+----------------------------+
| 6 | Charlie | Miller | 2024-03-08 13:04:55.182 |
+----+------------+------------+----------------------------+
| 7 | Clara | Wilson | 2024-03-08 13:22:55.182 |
+----+------------+------------+----------------------------+
| 8 | David | Moore | 2024-03-08 13:34:55.182 |
+----+------------+------------+----------------------------+
| 9 | Aaron | Anderson | 2024-03-08 12:40:33.677235 |
+----+------------+------------+----------------------------+

If you need dynamic order by you can do like below:

await db
.select()
.from(users)
// cursor comparison
.where(cursor ? (order === 'asc' ? gt(users.id, cursor) : lt(users.id, cursor)) : undefined)
.limit(pageSize)
.orderBy(order === 'asc' ? asc(users.id) : desc(users.id));
};

await nextUserPage();
await nextUserPage('asc', 3);
// descending order
await nextUserPage('desc');
await nextUserPage('desc', 7);

The main idea of this pagination is to use cursor as a pointer to a specific row in a dataset, indicating the end of the previous page. For correct ordering and cursor comparison, cursor should be unique and sequential.

If you need to order by a non-unique and non-sequential column, you can use multiple columns for cursor. This is how you can do it:

import { and, asc, eq, gt, or } from 'drizzle-orm';

const nextUserPage = async (
cursor?: {
id: number;
firstName: string;
},
pageSize = 3,

await db
.select()
.from(users)
.where(
cursor
? or(
gt(users.firstName, cursor.firstName),
and(eq(users.firstName, cursor.firstName), gt(users.id, cursor.id)),
)
: undefined,
)
.limit(pageSize)
.orderBy(asc(users.firstName), asc(users.id));
};

// pass the cursor from previous page (id & firstName)
await nextUserPage({
id: 2,
firstName: 'Alex',
});
select \* from users

order by first_name asc, id asc limit 3;
// next page, 4-6 rows returned
[\
{\
id: 1,\
firstName: 'Alice',\
lastName: 'Johnson',\
createdAt: 2024-03-08T12:23:55.251Z\
},\
{\
id: 5,\
firstName: 'Beth',\
lastName: 'Davis',\
createdAt: 2024-03-08T12:40:55.182Z\
},\
{\
id: 4,\
firstName: 'Brian',\
lastName: 'Brown',\
createdAt: 2024-03-08T12:34:55.182Z\
}\
]

Make sure to create indices for the columns that you use for cursor to make query efficient.

import { index, ...imports } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
// columns declaration
},

index('first_name_index').on(t.firstName).asc(),\
index('first_name_and_id_index').on(t.firstName, t.id).asc(),\
]);
-- As of now drizzle-kit only supports index name and on() param, so you have to add order manually
CREATE INDEX IF NOT EXISTS "first_name_index" ON "users" ("first_name" ASC);
CREATE INDEX IF NOT EXISTS "first_name_and_id_index" ON "users" ("first_name" ASC,"id" ASC);

If you are using primary key which is not sequential (e.g. `UUIDv4`), you should add sequential column (e.g. `created_at` column) and use multiple cursor.
This is how you can do it:

const nextUserPage = async (
cursor?: {
id: string;
createdAt: Date;
},
pageSize = 3,

await db
.select()
.from(users)
.where(
// make sure to add indices for the columns that you use for cursor
cursor
? or(
gt(users.createdAt, cursor.createdAt),
and(eq(users.createdAt, cursor.createdAt), gt(users.id, cursor.id)),
)
: undefined,
)
.limit(pageSize)
.orderBy(asc(users.createdAt), asc(users.id));
};

// pass the cursor from previous page (id & createdAt)
await nextUserPage({
id: '66ed00a4-c020-4dfd-a1ca-5d2e4e54d174',
createdAt: new Date('2024-03-09T17:59:36.406Z'),
});

Drizzle has useful relational queries API, that lets you easily implement `cursor-based` pagination:

import \* as schema from './db/schema';

const db = drizzle(..., { schema });

await db.query.users.findMany({

limit: pageSize,
});
};

// next page, cursor of last row of the first page (id = 3)
await nextUserPage(3);

**Benefits** of `cursor-based` pagination: consistent query results, with no skipped or duplicated rows due to insert or delete operations, and greater efficiency compared to `limit/offset` pagination because it does not need to scan and skip previous rows to access the next page.

**Drawbacks** of `cursor-based` pagination: the inability to directly navigate to a specific page and complexity of implementation. Since you add more columns to the sort order, you’ll need to add more filters to the `where` clause for the cursor comparison to ensure consistent pagination.

So, if you need to directly navigate to a specific page or you need simpler implementation of pagination, you should consider using offset/limit pagination instead.

---

# https://orm.drizzle.team/docs/guides/timestamp-default-value

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| SQL Timestamp as a default value

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Learn about column data types for PostgreSQL, MySQL and SQLite
- sql operator

### PostgreSQL

To set current timestamp as a default value in PostgreSQL, you can use the `defaultNow()` method or `sql` operator with `now()` function which returns the current date and time with the time zone:

import { sql } from 'drizzle-orm';
import { timestamp, pgTable, serial } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
timestamp1: timestamp('timestamp1').notNull().defaultNow(),
timestamp2: timestamp('timestamp2', { mode: 'string' })
.notNull()
.default(sql`now()`),
});
CREATE TABLE IF NOT EXISTS "users" (
"id" serial PRIMARY KEY NOT NULL,
"timestamp1" timestamp DEFAULT now() NOT NULL,
"timestamp2" timestamp DEFAULT now() NOT NULL
);

The `mode` option defines how values are handled in the application. Values with `string` mode are treated as `string` in the application, but stored as timestamps in the database.

// Data stored in the database
+----+----------------------------+----------------------------+
| id | timestamp1 | timestamp2 |
+----+----------------------------+----------------------------+
| 1 | 2024-04-11 14:14:28.038697 | 2024-04-11 14:14:28.038697 |
+----+----------------------------+----------------------------+
// Data returned by the application
[\
{\
id: 1,\
timestamp1: 2024-04-11T14:14:28.038Z, // Date object\
timestamp2: '2024-04-11 14:14:28.038697' // string\
}\
]

To set unix timestamp as a default value in PostgreSQL, you can use the `sql` operator and `extract(epoch from now())` function which returns the number of seconds since `1970-01-01 00:00:00 UTC`:

import { sql } from 'drizzle-orm';
import { integer, pgTable, serial } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
id: serial('id').primaryKey(),
timestamp: integer('timestamp')
.notNull()
.default(sql`extract(epoch from now())`),
});
CREATE TABLE IF NOT EXISTS "users" (
"id" serial PRIMARY KEY NOT NULL,
"timestamp" integer DEFAULT extract(epoch from now()) NOT NULL
);
// Data stored in the database
+----+------------+
| id | timestamp |
+----+------------+
| 1 | 1712846784 |
+----+------------+
// Data returned by the application
[\
{\
id: 1,\
timestamp: 1712846784 // number\
}\
]

### MySQL

To set current timestamp as a default value in MySQL, you can use the `defaultNow()` method or `sql` operator with `now()` function which returns the current date and time `(YYYY-MM-DD HH-MM-SS)`:

import { sql } from 'drizzle-orm';
import { mysqlTable, serial, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
id: serial('id').primaryKey(),
timestamp1: timestamp('timestamp1').notNull().defaultNow(),
timestamp2: timestamp('timestamp2', { mode: 'string' })
.notNull()
.default(sql`now()`),
timestamp3: timestamp('timestamp3', { fsp: 3 }) // fractional seconds part
.notNull()
.default(sql`now(3)`),
});
CREATE TABLE `users` (
`id` serial AUTO_INCREMENT NOT NULL,
`timestamp1` timestamp NOT NULL DEFAULT now(),
`timestamp2` timestamp NOT NULL DEFAULT now(),
`timestamp3` timestamp(3) NOT NULL DEFAULT now(3),
CONSTRAINT `users_id` PRIMARY KEY(`id`)
);

`fsp` option defines the number of fractional seconds to include in the timestamp. The default value is `0`.
The `mode` option defines how values are handled in the application. Values with `string` mode are treated as `string` in the application, but stored as timestamps in the database.

// Data stored in the database
+----+---------------------+---------------------+-------------------------+
| id | timestamp1 | timestamp2 | timestamp3 |
+----+---------------------+---------------------+-------------------------+
| 1 | 2024-04-11 15:24:53 | 2024-04-11 15:24:53 | 2024-04-11 15:24:53.236 |
+----+---------------------+---------------------+-------------------------+
// Data returned by the application
[\
{\
id: 1,\
timestamp1: 2024-04-11T15:24:53.000Z, // Date object\
timestamp2: '2024-04-11 15:24:53', // string\
timestamp3: 2024-04-11T15:24:53.236Z // Date object\
}\
]

To set unix timestamp as a default value in MySQL, you can use the `sql` operator and `unix_timestamp()` function which returns the number of seconds since `1970-01-01 00:00:00 UTC`:

import { sql } from 'drizzle-orm';
import { mysqlTable, serial, int } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
id: serial('id').primaryKey(),
timestamp: int('timestamp')
.notNull()
.default(sql`(unix_timestamp())`),
});
CREATE TABLE `users` (
`id` serial AUTO_INCREMENT NOT NULL,
`timestamp` int NOT NULL DEFAULT (unix_timestamp()),
CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
// Data stored in the database
+----+------------+
| id | timestamp |
+----+------------+
| 1 | 1712847986 |
+----+------------+
// Data returned by the application
[\
{\
id: 1,\
timestamp: 1712847986 // number\
}\
]

### SQLite

To set current timestamp as a default value in SQLite, you can use `sql` operator with `current_timestamp` constant which returns text representation of the current UTC date and time `(YYYY-MM-DD HH:MM:SS)`:

import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
id: integer('id').primaryKey(),
timestamp: text('timestamp')
.notNull()
.default(sql`(current_timestamp)`),
});
CREATE TABLE `users` (
`id` integer PRIMARY KEY NOT NULL,
`timestamp` text DEFAULT (current_timestamp) NOT NULL
);
// Data stored in the database
+----+---------------------+
| id | timestamp |
+----+---------------------+
| 1 | 2024-04-11 15:40:43 |
+----+---------------------+
// Data returned by the application
[\
{\
id: 1,\
timestamp: '2024-04-11 15:40:43' // string\
}\
]

To set unix timestamp as a default value in SQLite, you can use the `sql` operator and `unixepoch()` function which returns the number of seconds since `1970-01-01 00:00:00 UTC`:

import { sql } from 'drizzle-orm';
import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
id: integer('id').primaryKey(),
timestamp1: integer('timestamp1', { mode: 'timestamp' })
.notNull()
.default(sql`(unixepoch())`),
timestamp2: integer('timestamp2', { mode: 'timestamp_ms' })
.notNull()
.default(sql`(unixepoch() * 1000)`),
timestamp3: integer('timestamp3', { mode: 'number' })
.notNull()
.default(sql`(unixepoch())`),
});
CREATE TABLE `users` (
`id` integer PRIMARY KEY NOT NULL,
`timestamp1` integer DEFAULT (unixepoch()) NOT NULL,
`timestamp2` integer DEFAULT (unixepoch() \* 1000) NOT NULL,
`timestamp3` integer DEFAULT (unixepoch()) NOT NULL
);

The `mode` option defines how values are handled in the application. In the application, values with `timestamp` and `timestamp_ms` modes are treated as `Date` objects, but stored as integers in the database.
The difference is that `timestamp` handles seconds, while `timestamp_ms` handles milliseconds.

// Data stored in the database
+------------+------------+---------------+------------+
| id | timestamp1 | timestamp2 | timestamp3 |
+------------+------------+---------------+------------+
| 1 | 1712835640 | 1712835640000 | 1712835640 |
+------------+------------+---------------+------------+
// Data returned by the application
[\
{\
id: 1,\
timestamp1: 2024-04-11T11:40:40.000Z, // Date object\
timestamp2: 2024-04-11T11:40:40.000Z, // Date object\
timestamp3: 1712835640 // number\
}\
]

---

# https://orm.drizzle.team/docs/guides/gel-ext-auth

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Gel auth extension

This guide assumes familiarity with:

- Get started with Gel
- Using drizzle-kit pull

#### Step 1 - Define Gel auth schema

In `dbschema/default.esdl` file add a Gel schema with an auth extension

using extension auth;

module default {
global current_user := (
assert_single((
select User { id, username, email }
filter .identity = global ext::auth::ClientTokenIdentity
))
);

type User {
required identity: ext::auth::Identity;
required username: str;
required email: str;
}
}

#### Step 2 - Push Gel schema to the database

Generate Gel migration file:

gel migration create

Apply Gel migrations to the database

gel migration apply

#### Step 3 - Setup Drizzle config file

**Drizzle config** \- a configuration file that is used by Drizzle Kit and contains all the information about your database connection, migration folder and schema files.

Create a `drizzle.config.ts` file in the root of your project and add the following content:

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
dialect: 'gel',
// Enable auth schema for drizzle-kit
schemaFilter: ['ext::auth', 'public']
});

#### Step 4 - Pull Gel types to Drizzle schema

Pull your database schema:

npm

yarn

pnpm

bun

npx drizzle-kit pull
yarn drizzle-kit pull
pnpm drizzle-kit pull
bunx drizzle-kit pull

Here is an example of the generated schema.ts file:

IMPORTANT

You’ll get more than just the `Identity` table from `ext::auth`. Drizzle will pull in all the
`auth` tables you can use. The example below showcases just one of them.

import { gelTable, uniqueIndex, uuid, text, gelSchema, timestamptz, foreignKey } from "drizzle-orm/gel-core"
import { sql } from "drizzle-orm"

export const extauth = gelSchema('ext::auth');

export const identityInExtauth = extauth.table('Identity', {
id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
createdAt: timestamptz('created_at').default(sql`(clock_timestamp())`).notNull(),
issuer: text().notNull(),
modifiedAt: timestamptz('modified_at').notNull(),
subject: text().notNull(),

uniqueIndex('6bc2dd19-bce4-5810-bb1b-7007afe97a11;schemaconstr').using(\
'btree',\
table.id.asc().nullsLast().op('uuid_ops'),\
),\
]);

export const user = gelTable('User', {
id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
email: text().notNull(),
identityId: uuid('identity_id').notNull(),
username: text().notNull(),

uniqueIndex('d504514c-26a7-11f0-b836-81aa188c0abe;schemaconstr').using(\
'btree',\
table.id.asc().nullsLast().op('uuid_ops'),\
),\
foreignKey({\
columns: [table.identityId],\
foreignColumns: [identityInExtauth.id],\
name: 'User_fk_identity',\
}),\
]);

🎉 Now you can use the `auth` tables in your queries!

---

# https://orm.drizzle.team/docs/guides/select-parent-rows-with-at-least-one-related-child-row

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Select parent rows with at least one related child row

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Select statement and select from subquery
- Inner join
- Filter operators and exists function

This guide demonstrates how to select parent rows with the condition of having at least one related child row. Below, there are examples of schema definitions and the corresponding database data:

import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
email: text('email').notNull(),
});

export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
title: text('title').notNull(),
content: text('content').notNull(),

});

users.db

posts.db

+----+------------+----------------------+
| id | name | email |
+----+------------+----------------------+
| 1 | John Doe | john_doe@email.com |
+----+------------+----------------------+
| 2 | Tom Brown | tom_brown@email.com |
+----+------------+----------------------+
| 3 | Nick Smith | nick_smith@email.com |
+----+------------+----------------------+
+----+--------+-----------------------------+---------+
| id | title | content | user_id |
+----+--------+-----------------------------+---------+
| 1 | Post 1 | This is the text of post 1 | 1 |
+----+--------+-----------------------------+---------+
| 2 | Post 2 | This is the text of post 2 | 1 |
+----+--------+-----------------------------+---------+
| 3 | Post 3 | This is the text of post 3 | 3 |
+----+--------+-----------------------------+---------+

To select parent rows with at least one related child row and retrieve child data you can use `.innerJoin()` method:

import { eq } from 'drizzle-orm';
import { users, posts } from './schema';

const db = drizzle(...);

await db
.select({
user: users,
post: posts,
})
.from(users)
.innerJoin(posts, eq(users.id, posts.userId));
.orderBy(users.id);
select users._, posts._ from users
inner join posts on users.id = posts.user_id
order by users.id;
// result data, there is no user with id 2 because he has no posts
[\
{\
user: { id: 1, name: 'John Doe', email: 'john_doe@email.com' },\
post: {\
id: 1,\
title: 'Post 1',\
content: 'This is the text of post 1',\
userId: 1\
}\
},\
{\
user: { id: 1, name: 'John Doe', email: 'john_doe@email.com' },\
post: {\
id: 2,\
title: 'Post 2',\
content: 'This is the text of post 2',\
userId: 1\
}\
},\
{\
user: { id: 3, name: 'Nick Smith', email: 'nick_smith@email.com' },\
post: {\
id: 3,\
title: 'Post 3',\
content: 'This is the text of post 3',\
userId: 3\
}\
}\
]

To only select parent rows with at least one related child row you can use subquery with `exists()` function like this:

import { eq, exists, sql } from 'drizzle-orm';

const sq = db
.select({ id: sql`1` })
.from(posts)
.where(eq(posts.userId, users.id));

await db.select().from(users).where(exists(sq));
select \* from users where exists (select 1 from posts where posts.user_id = users.id);
// result data, there is no user with id 2 because he has no posts
[\
{ id: 1, name: 'John Doe', email: 'john_doe@email.com' },\
{ id: 3, name: 'Nick Smith', email: 'nick_smith@email.com' }\
]

---

# https://orm.drizzle.team/docs/guides/empty-array-default-value

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Empty array as a default value

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Learn about column data types for PostgreSQL, MySQL and SQLite
- sql operator

### PostgreSQL

To set an empty array as a default value in PostgreSQL, you can use `sql` operator with `'{}'` or `ARRAY[]` syntax:

import { sql } from 'drizzle-orm';
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
tags1: text('tags1')
.array()
.notNull()
.default(sql`'{}'::text[]`),
tags2: text('tags2')
.array()
.notNull()
.default(sql`ARRAY[]::text[]`),
});
CREATE TABLE IF NOT EXISTS "users" (
"id" serial PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"tags1" text[] DEFAULT '{}'::text[] NOT NULL,
"tags2" text[] DEFAULT ARRAY[]::text[] NOT NULL
);

### MySQL

MySQL doesn’t have an array data type, but you can use `json` data type for the same purpose. To set an empty array as a default value in MySQL, you can use `JSON_ARRAY()` function or `sql` operator with `('[]')` syntax:

import { sql } from 'drizzle-orm';
import { json, mysqlTable, serial, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
id: serial('id').primaryKey(),
name: varchar('name', { length: 255 }).notNull(),

tags2: json('tags2')

.notNull()
.default(sql`('[]')`), // the same as default([])
tags3: json('tags3')

.notNull()
.default(sql`(JSON_ARRAY())`),
});
CREATE TABLE `users` (
`id` serial AUTO_INCREMENT NOT NULL,
`name` varchar(255) NOT NULL,
`tags1` json NOT NULL DEFAULT ('[]'),
`tags2` json NOT NULL DEFAULT ('[]'),
`tags3` json NOT NULL DEFAULT (JSON_ARRAY()),
CONSTRAINT `users_id` PRIMARY KEY(`id`)
);

The `mode` option defines how values are handled in the application. With `json` mode, values are treated as JSON object literal.

### SQLite

SQLite doesn’t have an array data type, but you can use `text` data type for the same purpose. To set an empty array as a default value in SQLite, you can use `json_array()` function or `sql` operator with `'[]'` syntax:

import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
id: integer('id').primaryKey(),
tags1: text('tags1', { mode: 'json' })
.notNull()

.default(sql`(json_array())`),
tags2: text('tags2', { mode: 'json' })
.notNull()

.default(sql`'[]'`),
});
CREATE TABLE `users` (
`id` integer PRIMARY KEY NOT NULL,
`tags1` text DEFAULT (json_array()) NOT NULL,
`tags2` text DEFAULT '[]' NOT NULL
);

---

# https://orm.drizzle.team/docs/guides/update-many-with-different-value

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Update many with different values for each row

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Update statement
- Filters and sql operator

To implement update many with different values for each row within 1 request you can use `sql` operator with `case` statement and `.update().set()` methods like this:

import { SQL, inArray, sql } from 'drizzle-orm';
import { users } from './schema';

const db = drizzle(...);

const inputs = [\
{\
id: 1,\
city: 'New York',\
},\
{\
id: 2,\
city: 'Los Angeles',\
},\
{\
id: 3,\
city: 'Chicago',\
},\
];

// You have to be sure that inputs array is not empty
if (inputs.length === 0) {
return;
}

const sqlChunks: SQL[] = [];
const ids: number[] = [];

sqlChunks.push(sql`(case`);

for (const input of inputs) {
sqlChunks.push(sql`when ${users.id} = ${input.id} then ${input.city}`);
ids.push(input.id);
}

sqlChunks.push(sql`end)`);

const finalSql: SQL = sql.join(sqlChunks, sql.raw(' '));

await db.update(users).set({ city: finalSql }).where(inArray(users.id, ids));
update users set "city" =
(case when id = 1 then 'New York' when id = 2 then 'Los Angeles' when id = 3 then 'Chicago' end)
where id in (1, 2, 3)

---

# https://orm.drizzle.team/docs/guides/unique-case-insensitive-email

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Unique and Case-Insensitive Email Handling

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL and SQLite
- Indexes
- Insert statement and Select method
- sql operator
- You should have `drizzle-orm@0.31.0` and `drizzle-kit@0.22.0` or higher.

### PostgreSQL

To implement a unique and case-insensitive `email` handling in PostgreSQL with Drizzle, you can create a unique index on the lowercased `email` column. This way, you can ensure that the `email` is unique regardless of the case.

Drizzle has simple and flexible API, which lets you easily create such an index using SQL-like syntax:

schema.ts

migration.sql

import { SQL, sql } from 'drizzle-orm';
import { AnyPgColumn, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable(
'users',
{
id: serial('id').primaryKey(),
name: text('name').notNull(),
email: text('email').notNull(),
},

// uniqueIndex('emailUniqueIndex').on(sql`lower(${table.email})`),\
uniqueIndex('emailUniqueIndex').on(lower(table.email)),\
],
);

// custom lower function
export function lower(email: AnyPgColumn): SQL {
return sql`lower(${email})`;
}
CREATE TABLE IF NOT EXISTS "users" (
"id" serial PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"email" text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "emailUniqueIndex" ON "users" USING btree (lower("email"));

This is how you can select user by `email` with `lower` function:

import { eq } from 'drizzle-orm';
import { lower, users } from './schema';

const db = drizzle(...);

return await db
.select()
.from(users)
.where(eq(lower(users.email), email.toLowerCase()));
};
select \* from "users" where lower(email) = 'john@email.com';

### MySQL

In MySQL, the default collation setting for string comparison is case-insensitive, which means that when performing operations like searching or comparing strings in SQL queries, the case of the characters does not affect the results. However, because collation settings can vary and may be configured to be case-sensitive, we will explicitly ensure that the `email` is unique regardless of case by creating a unique index on the lowercased `email` column.

import { SQL, sql } from 'drizzle-orm';
import { AnyMySqlColumn, mysqlTable, serial, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable(
'users',
{
id: serial('id').primaryKey(),
name: varchar('name', { length: 255 }).notNull(),
email: varchar('email', { length: 255 }).notNull(),
},

// uniqueIndex('emailUniqueIndex').on(sql`(lower(${table.email}))`),\
uniqueIndex('emailUniqueIndex').on(lower(table.email)),\
]
);

// custom lower function
export function lower(email: AnyMySqlColumn): SQL {
return sql`(lower(${email}))`;
}
CREATE TABLE `users` (
`id` serial AUTO_INCREMENT NOT NULL,
`name` varchar(255) NOT NULL,
`email` varchar(255) NOT NULL,
CONSTRAINT `users_id` PRIMARY KEY(`id`),
CONSTRAINT `emailUniqueIndex` UNIQUE((lower(`email`)))
);

IMPORTANT

Functional indexes are supported in MySQL starting from version `8.0.13`. For the correct syntax, the expression should be enclosed in parentheses, for example, `(lower(column))`.

return await db
.select()
.from(users)
.where(eq(lower(users.email), email.toLowerCase()));
};
select \* from `users` where lower(email) = 'john@email.com';

### SQLite

To implement a unique and case-insensitive `email` handling in SQLite with Drizzle, you can create a unique index on the lowercased `email` column. This way, you can ensure that the `email` is unique regardless of the case.

import { SQL, sql } from 'drizzle-orm';
import { AnySQLiteColumn, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
'users',
{
id: integer('id').primaryKey(),
name: text('name').notNull(),
email: text('email').notNull(),
},

// uniqueIndex('emailUniqueIndex').on(sql`lower(${table.email})`),\
uniqueIndex('emailUniqueIndex').on(lower(table.email)),\
]
);

// custom lower function
export function lower(email: AnySQLiteColumn): SQL {
return sql`lower(${email})`;
}
CREATE TABLE `users` (
`id` integer PRIMARY KEY NOT NULL,
`name` text NOT NULL,
`email` text NOT NULL
);

CREATE UNIQUE INDEX `emailUniqueIndex` ON `users` (lower(`email`));

---

# https://orm.drizzle.team/docs/guides/vector-similarity-search

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Vector similarity search with pgvector extension

This guide assumes familiarity with:

- Get started with PostgreSQL
- Select statement
- Indexes
- sql operator
- pgvector extension
- Drizzle kit
- You should have installed the `openai` package for generating embeddings.

npm

yarn

pnpm

bun

npm i openai
yarn add openai
pnpm add openai
bun add openai

- You should have `drizzle-orm@0.31.0` and `drizzle-kit@0.22.0` or higher.

To implement vector similarity search in PostgreSQL with Drizzle ORM, you can use the `pgvector` extension. This extension provides a set of functions to work with vectors and perform similarity search.

As for now, Drizzle doesn’t create extension automatically, so you need to create it manually. Create an empty migration file and add SQL query:

npx drizzle-kit generate --custom
CREATE EXTENSION vector;

To perform similarity search, you need to create a table with a vector column and an `HNSW` or `IVFFlat` index on this column for better performance:

schema.ts

migration.sql

import { index, pgTable, serial, text, vector } from 'drizzle-orm/pg-core';

export const guides = pgTable(
'guides',
{
id: serial('id').primaryKey(),
title: text('title').notNull(),
description: text('description').notNull(),
url: text('url').notNull(),
embedding: vector('embedding', { dimensions: 1536 }),
},

index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),\
]
);
CREATE TABLE IF NOT EXISTS "guides" (
"id" serial PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"description" text NOT NULL,
"url" text NOT NULL,
"embedding" vector(1536)
);

CREATE INDEX IF NOT EXISTS "embeddingIndex" ON "guides" USING hnsw (embedding vector_cosine_ops);

The `embedding` column is used to store vector embeddings of the guide descriptions. Vector embedding is just a representation of some data. It converts different types of data into a common format (vectors) that language models can process. This allows us to perform mathematical operations, such as measuring the distance between two vectors, to determine how similar or different two data items are.

In this example we will use `OpenAI` model to generate embeddings for the description:

import OpenAI from 'openai';

const openai = new OpenAI({
apiKey: process.env['OPENAI_API_KEY'],
});

const input = value.replaceAll('\n', ' ');

const { data } = await openai.embeddings.create({
model: 'text-embedding-ada-002',
input,
});

return data[0].embedding;
};

To search for similar guides by embedding, you can use `gt` and `sql` operators with `cosineDistance` function to calculate the similarity between the `embedding` column and the generated embedding:

import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { generateEmbedding } from './embedding';
import { guides } from './schema';

const db = drizzle(...);

const embedding = await generateEmbedding(description);

const similarGuides = await db
.select({ name: guides.title, url: guides.url, similarity })
.from(guides)
.where(gt(similarity, 0.5))

.limit(4);

return similarGuides;
};
const description = 'Guides on using Drizzle ORM with different platforms';

const similarGuides = await findSimilarGuides(description);
[\
{\
name: 'Drizzle with Turso',\
url: '/docs/tutorials/drizzle-with-turso',\
similarity: 0.8642314333984994\
},\
{\
name: 'Drizzle with Supabase Database',\
url: '/docs/tutorials/drizzle-with-supabase',\
similarity: 0.8593631126014918\
},\
{\
name: 'Drizzle with Neon Postgres',\
url: '/docs/tutorials/drizzle-with-neon',\
similarity: 0.8541051184461372\
},\
{\
name: 'Drizzle with Vercel Edge Functions',\
url: '/docs/tutorials/drizzle-with-vercel-edge-functions',\
similarity: 0.8481551084241092\
}\
]

---

# https://orm.drizzle.team/docs/guides/postgresql-full-text-search

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| PostgreSQL full-text search

This guide assumes familiarity with:

- Get started with PostgreSQL
- Select statement
- Indexes
- sql operator
- You should have `drizzle-orm@0.31.0` and `drizzle-kit@0.22.0` or higher.

This guide demonstrates how to implement full-text search in PostgreSQL with Drizzle ORM. Full-text search is a technique used to search for text within a document or a set of documents. A document is the unit of searching in a full text search system. PostgreSQL provides a set of functions to work with full-text search, such as `to_tsvector` and `to_tsquery`:

The `to_tsvector` function parses a textual document into tokens, reduces the tokens to lexemes, and returns a `tsvector` which lists the lexemes together with their positions in the document:

import { sql } from 'drizzle-orm';

const db = drizzle(...);

await db.execute(
sql`select to_tsvector('english', 'Guide to PostgreSQL full-text search with Drizzle ORM')`,
);
[\
{\
to_tsvector: "'drizzl':9 'full':5 'full-text':4\
'guid':1 'orm':10 'postgresql':3 'search':7 'text':6"\
}\
]

The `to_tsquery` function converts a keyword to normalized tokens and returns a `tsquery` that matches the lexemes in a `tsvector`. The `@@` operator is used for direct matches:

await db.execute(
sql`select to_tsvector('english', 'Guide to PostgreSQL full-text search with Drizzle ORM')
@@ to_tsquery('english', 'Drizzle') as match`,
);
[ { match: true } ]

As for now, Drizzle doesn’t support `tsvector` type natively, so you need to convert your data in the `text` column on the fly. To enhance the performance, you can create a `GIN` index on your column like this:

schema.ts

migration.sql

db_data

import { index, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const posts = pgTable(
'posts',
{
id: serial('id').primaryKey(),
title: text('title').notNull(),
},

index('title_search_index').using('gin', sql`to_tsvector('english', ${table.title})`),\
]
);
CREATE TABLE IF NOT EXISTS "posts" (
"id" serial PRIMARY KEY NOT NULL,
"title" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "title_search_index" ON "posts"
USING gin (to_tsvector('english', "title"));
[\
{ id: 1, title: 'Planning Your First Trip to Europe' },\
{ id: 2, title: "Cultural Insights: Exploring Asia's Heritage" },\
{ id: 3, title: 'Top 5 Destinations for a Family Trip' },\
{ id: 4, title: 'Essential Hiking Gear for Mountain Enthusiasts' },\
{ id: 5, title: 'Trip Planning: Choosing Your Next Destination' },\
{ id: 6, title: 'Discovering Hidden Culinary Gems in Italy' },\
{ id: 7, title: 'The Ultimate Road Trip Guide for Explorers' },\
];

To implement full-text search in PostgreSQL with Drizzle ORM, you can use the `to_tsvector` and `to_tsquery` functions with `sql` operator:

import { sql } from 'drizzle-orm';
import { posts } from './schema';

const title = 'trip';

await db
.select()
.from(posts)
.where(sql`to_tsvector('english', ${posts.title}) @@ to_tsquery('english', ${title})`);
[\
{ id: 1, title: 'Planning Your First Trip to Europe' },\
{ id: 3, title: 'Top 5 Destinations for a Family Trip' },\
{ id: 5, title: 'Trip Planning: Choosing Your Next Destination' },\
{ id: 7, title: 'The Ultimate Road Trip Guide for Explorers' }\
]

To match by any of the keywords, you can use the `|` operator:

const title = 'Europe | Asia';

await db
.select()
.from(posts)
.where(sql`to_tsvector('english', ${posts.title}) @@ to_tsquery('english', ${title})`);
[\
{ id: 1, title: 'Planning Your First Trip to Europe' },\
{ id: 2, title: "Cultural Insights: Exploring Asia's Heritage" }\
]

To match multiple keywords, you can use the `plainto_tsquery` function:

// 'discover & Italy'
const title = 'discover Italy';

await db
.select()
.from(posts)
.where(sql`to_tsvector('english', ${posts.title}) @@ plainto_tsquery('english', ${title})`);
select \* from posts
where to_tsvector('english', title) @@ plainto_tsquery('english', 'discover Italy');
[ { id: 6, title: 'Discovering Hidden Culinary Gems in Italy' } ]

To match a phrase, you can use the `phraseto_tsquery` function:

// if you query by "trip family", it will not return any result

const title = 'family trip';

await db
.select()
.from(posts)
.where(sql`to_tsvector('english', ${posts.title}) @@ phraseto_tsquery('english', ${title})`);
select \* from posts
where to_tsvector('english', title) @@ phraseto_tsquery('english', 'family trip');
[ { id: 3, title: 'Top 5 Destinations for a Family Trip' } ]

You can also use `websearch_to_tsquery` function which is a simplified version of `to_tsquery` with an alternative syntax, similar to the one used by web search engines:

// 'family | first & trip & europ | asia'
const title = 'family or first trip Europe or Asia';

await db
.select()
.from(posts)
.where(sql`to_tsvector('english', ${posts.title}) @@ websearch_to_tsquery('english', ${title})`);
select \* from posts
where to_tsvector('english', title)
@@ websearch_to_tsquery('english', 'family or first trip Europe or Asia');
[\
{ id: 1, title: 'Planning Your First Trip to Europe' },\
{ id: 2, title: "Cultural Insights: Exploring Asia's Heritage" },\
{ id: 3, title: 'Top 5 Destinations for a Family Trip' }\
]

To implement full-text search on multiple columns, you can create index on multiple columns and concatenate the columns with `to_tsvector` function:

import { sql } from 'drizzle-orm';
import { index, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const posts = pgTable(
'posts',
{
id: serial('id').primaryKey(),
title: text('title').notNull(),
description: text('description').notNull(),
},

index('search_index').using(\
'gin',\
sql`(\
setweight(to_tsvector('english', ${table.title}), 'A') ||\
setweight(to_tsvector('english', ${table.description}), 'B')\
)`,\
),\
],
);
CREATE TABLE IF NOT EXISTS "posts" (
"id" serial PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"description" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "search_index" ON "posts"
USING gin ((setweight(to_tsvector('english', "title"), 'A') ||
setweight(to_tsvector('english', "description"), 'B')));
[\
{\
id: 1,\
title: 'Planning Your First Trip to Europe',\
description:\
'Get essential tips on budgeting, sightseeing, and cultural etiquette for your inaugural European adventure.',\
},\
{\
id: 2,\
title: "Cultural Insights: Exploring Asia's Heritage",\
description:\
'Dive deep into the rich history and traditions of Asia through immersive experiences and local interactions.',\
},\
{\
id: 3,\
title: 'Top 5 Destinations for a Family Trip',\
description:\
'Discover family-friendly destinations that offer fun, education, and relaxation for all ages.',\
},\
{\
id: 4,\
title: 'Essential Hiking Gear for Mountain Enthusiasts',\
description:\
'Equip yourself with the latest and most reliable gear for your next mountain hiking expedition.',\
},\
{\
id: 5,\
title: 'Trip Planning: Choosing Your Next Destination',\
description:\
'Learn how to select destinations that align with your travel goals, whether for leisure, adventure, or cultural exploration.',\
},\
{\
id: 6,\
title: 'Discovering Hidden Culinary Gems in Italy',\
description:\
"Unearth Italy's lesser-known eateries and food markets that offer authentic and traditional flavors.",\
},\
{\
id: 7,\
title: 'The Ultimate Road Trip Guide for Explorers',\
description:\
'Plan your next great road trip with tips on route planning, packing, and discovering off-the-beaten-path attractions.',\
},\
];

The `setweight` function is used to label the entries of a tsvector with a given weight, where a weight is one of the letters A, B, C, or D. This is typically used to mark entries coming from different parts of a document, such as title versus body.

This is how you can query on multiple columns:

const title = 'plan';

await db.select().from(posts)
.where(sql`(
setweight(to_tsvector('english', ${posts.title}), 'A') ||
setweight(to_tsvector('english', ${posts.description}), 'B'))
@@ to_tsquery('english', ${title}
)`
);
[\
{\
id: 1,\
title: 'Planning Your First Trip to Europe',\
description: 'Get essential tips on budgeting, sightseeing, and cultural etiquette for your inaugural European adventure.'\
},\
{\
id: 5,\
title: 'Trip Planning: Choosing Your Next Destination',\
description: 'Learn how to select destinations that align with your travel goals, whether for leisure, adventure, or cultural exploration.'\
},\
{\
id: 7,\
title: 'The Ultimate Road Trip Guide for Explorers',\
description: 'Plan your next great road trip with tips on route planning, packing, and discovering off-the-beaten-path attractions.'\
}\
]

To rank the search results, you can use the `ts_rank` or `ts_rank_cd` functions and `orderBy` method:

IMPORTANT

`getColumns` available starting from `drizzle-orm@1.0.0-beta.2`(read more here)

If you are on pre-1 version(like `0.45.1`) then use `getTableColumns`

import { desc, getColumns, sql } from 'drizzle-orm';

const search = 'culture | Europe | Italy | adventure';

const matchQuery = sql`(
setweight(to_tsvector('english', ${posts.title}), 'A') ||
setweight(to_tsvector('english', ${posts.description}), 'B')), to_tsquery('english', ${search})`;

await db
.select({
...getColumns(posts),
rank: sql`ts_rank(${matchQuery})`,
rankCd: sql`ts_rank_cd(${matchQuery})`,
})
.from(posts)
.where(
sql`(
setweight(to_tsvector('english', ${posts.title}), 'A') ||
setweight(to_tsvector('english', ${posts.description}), 'B')
) @@ to_tsquery('english', ${search})`,
)

[\
{\
id: 1,\
title: 'Planning Your First Trip to Europe',\
description: 'Get essential tips on budgeting, sightseeing, and cultural etiquette for your inaugural European adventure.',\
rank: 0.2735672,\
rankCd: 1.8\
},\
{\
id: 6,\
title: 'Discovering Hidden Culinary Gems in Italy',\
description: "Unearth Italy's lesser-known eateries and food markets that offer authentic and traditional flavors.",\
rank: 0.16717994,\
rankCd: 1.4\
},\
{\
id: 2,\
title: "Cultural Insights: Exploring Asia's Heritage",\
description: 'Dive deep into the rich history and traditions of Asia through immersive experiences and local interactions.',\
rank: 0.15198177,\
rankCd: 1\
},\
{\
id: 5,\
title: 'Trip Planning: Choosing Your Next Destination',\
description: 'Learn how to select destinations that align with your travel goals, whether for leisure, adventure, or cultural exploration.',\
rank: 0.12158542,\
rankCd: 0.8\
}\
]

The `ts_rank` function focuses on the frequency of query terms throughout the document. The `ts_rank_cd` function focuses on the proximity of query terms within the document.

---

# https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Cloudflare D1 HTTP API with Drizzle Kit

This guide assumes familiarity with:

- Drizzle Kit
- Drizzle Studio
- Drizzle Chrome Extension
- You should have installed `drizzle-kit@0.21.3` or higher
- You should have Cloudflare account, deployed D1 database and token with D1 edit permissions

To use Drizzle kit with Cloudflare D1 HTTP API, you need to configure the `drizzle.config.ts` file like this:

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
schema: './src/schema.ts',
out: './migrations',
dialect: 'sqlite',
driver: 'd1-http',
dbCredentials: {
accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
token: process.env.CLOUDFLARE_D1_TOKEN!,
},
});

You can find `accountId`, `databaseId` and `token` in Cloudflare dashboard.

2. To get `databaseId` open D1 database you want to connect to and copy **Database ID**.

After you have configured `drizzle.config.ts` file, Drizzle Kit lets you run `migrate`, `push`, `introspect` and `studio` commands using Cloudflare D1 HTTP API.

You can also use Drizzle Chrome Extension to browse Cloudflare D1 database directly in their admin panel.

---

# https://orm.drizzle.team/docs/guides/point-datatype-psql

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Point datatype in PostgreSQL

This guide assumes familiarity with:

- Get started with PostgreSQL
- Point datatype
- Filtering in select statement
- sql operator

PostgreSQL has a special datatype to store geometric data called `point`. It is used to represent a point in a two-dimensional space. The point datatype is represented as a pair of `(x, y)` coordinates.
The point expects to receive longitude first, followed by latitude.

import { sql } from 'drizzle-orm';

const db = drizzle(...);

await db.execute(
sql`select point(-90.9, 18.7)`,
);
[\
{\
point: '(-90.9,18.7)'\
}\
]

This is how you can create table with `point` datatype in Drizzle:

import { pgTable, point, serial, text } from 'drizzle-orm/pg-core';

export const stores = pgTable('stores', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
location: point('location', { mode: 'xy' }).notNull(),
});

This is how you can insert point data into the table in Drizzle:

// mode: 'xy'
await db.insert(stores).values({
name: 'Test',
location: { x: -90.9, y: 18.7 },
});

// mode: 'tuple'
await db.insert(stores).values({
name: 'Test',
location: [-90.9, 18.7],
});

// sql raw
await db.insert(stores).values({
name: 'Test',
location: sql`point(-90.9, 18.7)`,
});

IMPORTANT

`getColumns` available starting from `drizzle-orm@1.0.0-beta.2`(read more here)

If you are on pre-1 version(like `0.45.1`) then use `getTableColumns`

import { getColumns, sql } from 'drizzle-orm';
import { stores } from './schema';

const point = {
x: -73.935_242,
y: 40.730_61,
};

await db
.select({
...getColumns(stores),
distance: sql`round((${sqlDistance})::numeric, 2)`,
})
.from(stores)
.orderBy(sqlDistance)
.limit(1);

limit 1;

To filter rows to include only those where a `point` type `location` falls within a specified rectangular boundary defined by two diagonal points you can user `<@` operator. It checks if the first object is contained in or on the second object:

const point = {
x1: -88,
x2: -73,
y1: 40,
y2: 43,
};

await db
.select()
.from(stores)
.where(
sql`${stores.location} <@ box(point(${point.x1}, ${point.y1}), point(${point.x2}, ${point.y2}))`
);
select \* from stores where location <@ box(point(-88, 40), point(-73, 43));

---

# https://orm.drizzle.team/docs/guides/postgis-geometry-point

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| PostGIS geometry point

This guide assumes familiarity with:

- Get started with PostgreSQL
- Postgis extension
- Indexes
- Filtering in select statement
- sql operator

`PostGIS` extends the capabilities of the PostgreSQL relational database by adding support for storing, indexing, and querying geospatial data.

As for now, Drizzle doesn’t create extension automatically, so you need to create it manually. Create an empty migration file and add SQL query:

npx drizzle-kit generate --custom
CREATE EXTENSION postgis;

This is how you can create table with `geometry` datatype and spatial index in Drizzle:

schema.ts

migration.sql

import { geometry, index, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const stores = pgTable(
'stores',
{
id: serial('id').primaryKey(),
name: text('name').notNull(),
location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
},

index('spatial_index').using('gist', t.location),\
]
);
CREATE TABLE IF NOT EXISTS "stores" (
"id" serial PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"location" geometry(point) NOT NULL
);

CREATE INDEX IF NOT EXISTS "spatial_index" ON "stores" USING gist ("location");

This is how you can insert `geometry` data into the table in Drizzle. `ST_MakePoint()` in PostGIS creates a geometric object of type `point` using the specified coordinates.
`ST_SetSRID()` sets the `SRID` (unique identifier associated with a specific coordinate system, tolerance, and resolution) on a geometry to a particular integer value:

// mode: 'xy'
await db.insert(stores).values({
name: 'Test',
location: { x: -90.9, y: 18.7 },
});

// mode: 'tuple'
await db.insert(stores).values({
name: 'Test',
location: [-90.9, 18.7],
});

// sql raw
await db.insert(stores).values({
name: 'Test',
location: sql`ST_SetSRID(ST_MakePoint(-90.9, 18.7), 4326)`,
});

IMPORTANT

`getColumns` available starting from `drizzle-orm@1.0.0-beta.2`(read more here)

If you are on pre-1 version(like `0.45.1`) then use `getTableColumns`

import { getColumns, sql } from 'drizzle-orm';
import { stores } from './schema';

const point = {
x: -73.935_242,
y: 40.730_61,
};

const sqlPoint = sql`ST_SetSRID(ST_MakePoint(${point.x}, ${point.y}), 4326)`;

await db
.select({
...getColumns(stores),
distance: sql`ST_Distance(${stores.location}, ${sqlPoint})`,
})
.from(stores)

.limit(1);
select \*, ST_Distance(location, ST_SetSRID(ST_MakePoint(-73.935_242, 40.730_61), 4326))

limit 1;

To filter stores located within a specified rectangular area, you can use `ST_MakeEnvelope()` and `ST_Within()` functions. `ST_MakeEnvelope()` creates a rectangular Polygon from the minimum and maximum values for X and Y. `ST_Within()` Returns TRUE if geometry A is within geometry B.

const point = {
x1: -88,
x2: -73,
y1: 40,
y2: 43,
};

await db
.select()
.from(stores)
.where(
sql`ST_Within(
${stores.location}, ST_MakeEnvelope(${point.x1}, ${point.y1}, ${point.x2}, ${point.y2}, 4326)
)`,
);
select \* from stores where ST_Within(location, ST_MakeEnvelope(-88, 40, -73, 43, 4326));

---

# https://orm.drizzle.team/docs/guides/postgresql-local-setup

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| How to setup PostgreSQL locally

This guide assumes familiarity with:

- Install latest Docker Desktop. Follow the instructions for your operating system.

#### Pull the PostgreSQL image

Pull the latest PostgreSQL image from Docker Hub. In your terminal, run `docker pull postgres` to pull the latest Postgres version from Docker Hub:

docker pull postgres

Alternatively, you can pull preferred version with a specific tag:

docker pull postgres:15

When postgres image is downloaded, you can check it in `Images` tab in Docker Desktop or by running `docker images`:

docker images
REPOSITORY TAG IMAGE ID CREATED SIZE
postgres latest 75282fa229a1 6 weeks ago 453MB

#### Start a Postgres instance

To start a new PostgreSQL container, run the following command:

docker run --name drizzle-postgres -e POSTGRES_PASSWORD=mypassword -d -p 5432:5432 postgres

1. The `--name` option assigns the container the name `drizzle-postgres`.
2. The `-e POSTGRES_PASSWORD=` option sets the `POSTGRES_PASSWORD` environment variable with the specified value.
3. The `-d` flag runs the container in detached mode (in the background).
4. The `-p` option maps port `5432` on the container to port `5432` on your host machine, allowing PostgreSQL to be accessed from your host system through this port.
5. The `postgres` argument specifies the image to use for the container. You can also specify other versions like `postgres:15`.

You can also specify other parameters like:

2. The `-e POSTGRES_DB=` option sets the `POSTGRES_DB` environment variable with the specified value. Defaults to the `POSTGRES_USER` value when is empty.

To check if the container is running, check `Containers` tab in Docker Desktop or use the `docker ps` command:

CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES

#### Configure database url

To connect to the PostgreSQL database, you need to provide the database URL. The URL format is:

You should replace placeholders with your actual values. For example, for created container the url will be:

postgres://postgres:mypassword@localhost:5432/postgres

Now you can connect to the database using the URL in your application.

---

# https://orm.drizzle.team/docs/guides/mysql-local-setup

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| How to setup MySQL locally

This guide assumes familiarity with:

- Install latest Docker Desktop. Follow the instructions for your operating system.

#### Pull the MySQL image

Pull the latest MySQL image from Docker Hub. In your terminal, run `docker pull mysql` to pull the latest MySQL version from Docker Hub:

docker pull mysql

Alternatively, you can pull preferred version with a specific tag:

docker pull mysql:8.2

When MySQL image is downloaded, you can check it in `Images` tab in Docker Desktop or by running `docker images`:

docker images
REPOSITORY TAG IMAGE ID CREATED SIZE
mysql latest 4e8a34aea708 2 months ago 609MB

#### Start a MySQL instance

To start a new MySQL container, run the following command:

docker run --name drizzle-mysql -e MYSQL_ROOT_PASSWORD=mypassword -d -p 3306:3306 mysql

1. The `--name` option assigns the container the name `drizzle-mysql`.
2. The `-e MYSQL_ROOT_PASSWORD=` option sets the `MYSQL_ROOT_PASSWORD` environment variable with the specified value. This is password for the root user.
3. The `-d` flag runs the container in detached mode (in the background).
4. The `-p` option maps port `3306` on the container to port `3306` on your host machine, allowing MySQL to be accessed from your host system through this port.
5. The `mysql` argument specifies the image to use for the container. You can also specify other versions like `mysql:8.2`.

You can also specify other parameters like:

1. `-e MYSQL_DATABASE=` to create a new database when the container is created. Default is `mysql`.
2. `-e MYSQL_USER=` and `-e MYSQL_PASSWORD=` to create a new user with a password when the container is created. But you still need to specify `MYSQL_ROOT_PASSWORD` for `root` user.

To check if the container is running, check `Containers` tab in Docker Desktop or use the `docker ps` command:

CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES

#### Configure database url

To connect to the MySQL database, you need to provide the database URL. The URL format is:

You should replace placeholders with your actual values. For example, for created container the url will be:

mysql://root:mypassword@localhost:3306/mysql

Now you can connect to the database using the URL in your application.

---

# https://orm.drizzle.team/docs/guides/seeding-with-partially-exposed-tables

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Seeding Partially Exposed Tables with Foreign Key

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL or SQLite
- Get familiar with Drizzle Seed

## Example 1

Let’s assume you are trying to seed your database using the seeding script and schema shown below.

index.ts

schema.ts

import { bloodPressure } from './schema.ts';

async function main() {
const db = drizzle(...);
await seed(db, { bloodPressure });
}
main();
import { serial, pgTable, integer, doublePrecision } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
id: serial("id").primaryKey(),
});

export const bloodPressure = pgTable("bloodPressure", {
bloodPressureId: serial().primaryKey(),
pressure: doublePrecision(),

})

If the `bloodPressure` table has a not-null constraint on the `userId` column, running the seeding script will cause an error.

Error: Column 'userId' has not null constraint,
and you didn't specify a table for foreign key on column 'userId' in 'bloodPressure' table.

What does it mean?

This means we can’t fill the `userId` column with Null values due to the not-null constraint on that column.
Additionally, you didn’t expose the `users` table to the `seed` function schema, so we can’t generate `users.id` to populate the `userId` column with these values.

At this point, you have several options to resolve the error:

- You can remove the not-null constraint from the `userId` column;
- You can expose `users` table to `seed` function schema

await seed(db, { bloodPressure, users });

- You can refine the `userId` column generator;

## Example 2

By running the seeding script above you will see a warning

Column 'userId' in 'bloodPressure' table will be filled with Null values
because you specified neither a table for foreign key on column 'userId'
nor a function for 'userId' column in refinements.

This means you neither provided the `users` table to the `seed` function schema nor refined the `userId` column generator.
As a result, the `userId` column will be filled with Null values.

Then you will have two choices:

- If you’re okay with filling the `userId` column with Null values, you can ignore the warning;

- Otherwise, you can refine the `userId` column generator.

## Refining the `userId` column generator

Doing so requires the `users` table to already have IDs such as 1 and 2 in the database.

async function main() {
const db = drizzle(...);

bloodPressure: {
columns: {
userId: funcs.valuesFromArray({ values: [1, 2] })
}
}
}));
}
main();

---

# https://orm.drizzle.team/docs/guides/seeding-using-with-option

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Seeding using 'with' option

PostgreSQL

MySQL

SQLite

This guide assumes familiarity with:

- Get started with PostgreSQL, MySQL or SQLite
- Get familiar with One-to-many Relation
- Get familiar with Drizzle Seed

Warning

Using `with` implies tables to have a one-to-many relationship.

Therefore, if `one` user has `many` posts, you can use `with` as follows:

users: {
count: 2,
with: {
posts: 3,
},
},

## Example 1

index.ts

schema.ts

import { users, posts } from './schema.ts';

async function main() {
const db = drizzle(...);

users: {
count: 2,
with: {
posts: 3,
},
},
}));
}
main();
import { serial, pgTable, integer, text } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name'),
});

export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
content: text('content'),
authorId: integer('author_id').notNull(),
});

Running the seeding script above will cause an error.

Error: "posts" table doesn't have a reference to "users" table or
you didn't include your one-to-many relation in the seed function schema.
You can't specify "posts" as parameter in users.with object.

You will have several options to resolve an error:

- You can add reference to the `authorId` column in `posts` table in your schema

users: {
count: 2,
with: {
posts: 3,
},
},
}));
}
main();

// Running the seeding script above will fill you database with values shown below
`users`

| id  | name      |
| --- | --------- |
| 1   | 'Melanny' |
| 2   | 'Elvera'  |

`posts`

| id  | content               | author_id |
| --- | --------------------- | --------- |
| 1   | 'tf02gUXb0LZIdEg6SL'  | 2         |
| 2   | 'j15YdT7Sma'          | 2         |
| 3   | 'LwwvWtLLAZzIpk'      | 1         |
| 4   | 'mgyUnBKSrQw'         | 1         |
| 5   | 'CjAJByKIqilHcPjkvEw' | 2         |
| 6   | 'S5g0NzXs'            | 1         |

import { serial, pgTable, integer, text } from "drizzle-orm/pg-core";

export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
content: text('content'),

});

- You can add one-to-many relation to your schema and include it in the seed function schema

import { users, posts, postsRelations } from './schema.ts';

| id  | content               | author_id |
| --- | --------------------- | --------- |
| 1   | 'tf02gUXb0LZIdEg6SL'  | 2         |
| 2   | 'j15YdT7Sma'          | 2         |
| 3   | 'LwwvWtLLAZzIpk'      | 1         |
| 4   | 'mgyUnBKSrQw'         | 1         |
| 5   | 'CjAJByKIqilHcPjkvEw' | 2         |
| 6   | 'S5g0NzXs'            | 1         |

import { serial, pgTable, integer, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

author: one(users, {
fields: [posts.authorId],
references: [users.id],
}),
}));

## Example 2

posts: {
count: 2,
with: {
users: 3,
},
},
}));
}
main();
import { serial, pgTable, integer, text } from "drizzle-orm/pg-core";

Why?

You have a `posts` table referencing a `users` table in your schema,

.
.
.
export const posts = pgTable('posts', {
id: serial('id').primaryKey(),
content: text('content'),

or in other words, you have one-to-many relation where `one` user can have `many` posts.

However, in your seeding script, you’re attempting to generate 3 (`many`) users for `one` post.

posts: {
count: 2,
with: {
users: 3,
},
},

To resolve the error, you can modify your seeding script as follows:

| id  | content               | author_id |
| --- | --------------------- | --------- |
| 1   | 'tf02gUXb0LZIdEg6SL'  | 2         |
| 2   | 'j15YdT7Sma'          | 2         |
| 3   | 'LwwvWtLLAZzIpk'      | 1         |
| 4   | 'mgyUnBKSrQw'         | 1         |
| 5   | 'CjAJByKIqilHcPjkvEw' | 2         |
| 6   | 'S5g0NzXs'            | 1         |

## Example 3

import { users } from './schema.ts';

users: {
count: 2,
with: {
users: 3,
},
},
}));
}
main();
import { serial, pgTable, integer, text } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name'),

Error: "users" table has self reference.
You can't specify "users" as parameter in users.with object.

You have a `users` table referencing a `users` table in your schema,

.
.
.
export const users = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name'),

or in other words, you have one-to-one relation where `one` user can have only `one` user.

However, in your seeding script, you’re attempting to generate 3 (`many`) users for `one` user, which is impossible.

users: {
count: 2,
with: {
users: 3,
},
},

---

# https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle \| Full-text search with Generated Columns

This guide assumes familiarity with:

- Get started with PostgreSQL
- Select statement
- Indexes
- sql operator
- Full-text search
- Generated columns

This guide demonstrates how to implement full-text search in PostgreSQL with Drizzle and generated columns. A generated column is a special column that is always computed from other columns. It is useful because you don’t have to compute the value of the column every time you query the table:

schema.ts

migration.sql

import { SQL, sql } from 'drizzle-orm';
import { index, pgTable, serial, text, customType } from 'drizzle-orm/pg-core';

export const tsvector = customType<{
data: string;

dataType() {
return `tsvector`;
},
});

export const posts = pgTable(
'posts',
{
id: serial('id').primaryKey(),
title: text('title').notNull(),
body: text('body').notNull(),
bodySearch: tsvector('body_search')
.notNull()

},

index('idx_body_search').using('gin', t.bodySearch),\
]
);
CREATE TABLE "posts" (
"id" serial PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"body" text NOT NULL,
"body_search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "posts"."body")) STORED NOT NULL
);

CREATE INDEX "idx_body_search" ON "posts" USING gin ("body_search");

When you insert a row into a table, the value of a generated column is computed from an expression that you provide when you create the column:

import { posts } from './schema';

const db = drizzle(...);

const body = "Golden leaves cover the quiet streets as a crisp breeze fills the air, bringing the scent of rain and the promise of change"

await db.insert(posts).values({
body,
title: "The Beauty of Autumn",
}
).returning();
[\
{\
id: 1,\
title: 'The Beauty of Autumn',\
body: 'Golden leaves cover the quiet streets as a crisp breeze fills the air, bringing the scent of rain and the promise of change',\
bodySearch: "'air':13 'breez':10 'bring':14 'chang':23 'cover':3 'crisp':9 'fill':11 'golden':1 'leav':2 'promis':21 'quiet':5 'rain':18 'scent':16 'street':6"\
}\
]

This is how you can implement full-text search with generated columns in PostgreSQL with Drizzle ORM. The `@@` operator is used for direct matches:

const searchParam = "bring";

await db
.select()
.from(posts)
.where(sql`${posts.bodySearch} @@ to_tsquery('english', ${searchParam})`);
select \* from posts where body_search @@ to_tsquery('english', 'bring');

This is more advanced schema with a generated column. The `search` column is generated from the `title` and `body` columns and `setweight()` function is used to assign different weights to the columns for full-text search.
This is typically used to mark entries coming from different parts of a document, such as title versus body.

export const posts = pgTable(
'posts',
{
id: serial('id').primaryKey(),
title: text('title').notNull(),
body: text('body').notNull(),
search: tsvector('search')
.notNull()
.generatedAlwaysAs(

||
setweight(to_tsvector('english', ${posts.body}), 'B')`,
),
},

index('idx_search').using('gin', t.search),\
],
);
CREATE TABLE "posts" (
"id" serial PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"body" text NOT NULL,
"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', "posts"."title"), 'A')
||
setweight(to_tsvector('english', "posts"."body"), 'B')) STORED NOT NULL
);

CREATE INDEX "idx_search" ON "posts" USING gin ("search");

This is how you can query the table with full-text search:

const search = 'travel';

await db
.select()
.from(posts)
.where(sql`${posts.search} @@ to_tsquery('english', ${search})`);
select \* from posts where search @@ to_tsquery('english', 'travel');

---

# https://orm.drizzle.team/docs/guides/conditional-filters-in-query)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/incrementing-a-value)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/decrementing-a-value)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/include-or-exclude-columns)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/toggling-a-boolean-field)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/count-rows)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/upsert)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/limit-offset-pagination)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/cursor-based-pagination)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/timestamp-default-value)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/gel-ext-auth)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/select-parent-rows-with-at-least-one-related-child-row)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/empty-array-default-value)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/update-many-with-different-value)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/unique-case-insensitive-email)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/vector-similarity-search)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/postgresql-full-text-search)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/point-datatype-psql)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/postgis-geometry-point)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/postgresql-local-setup)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/mysql-local-setup)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/seeding-with-partially-exposed-tables)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/seeding-using-with-option)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/get-started

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# Get started with Drizzle

New database

Existing database

PostgreSQL

PostgreSQL Neon Vercel Postgres Supabase Xata PGLite Nile Bun Logo\\
\\
Bun Logo\\
Bun SQL Effect PlanetScale Postgres

Gel

MySQL

MySQL PlanetScale TiDB SingleStore

SQLite

image/svg+xml\\
\\
\\
image/svg+xml\\
\\
SQLite Turso Cloud SQLite Cloud Turso Database Cloudflare D1 Bun Logo\\
\\
Bun Logo\\
Bun SQLite Cloudflare Durable Objects

MSSQL

![\\
\\

MSSQL](https://orm.drizzle.team/docs/get-started/mssql-new)

CockroachDB

CockroachDB](https://orm.drizzle.team/docs/get-started/cockroach-new)

Native SQLite

Expo SQLite ![\\
\\

OP SQLite](https://orm.drizzle.team/docs/get-started/op-sqlite-new)

---

# https://orm.drizzle.team/docs/drizzle-kit-generate

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# `drizzle-kit generate`

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here
- Drizzle Kit overview and config file

`drizzle-kit generate` lets you generate SQL migrations based on your Drizzle schema upon declaration or on subsequent schema changes.

How it works under the hood?

Drizzle Kit `generate` command triggers a sequence of events:

1. It will read through your Drizzle schema file(s) and compose a json snapshot of your schema
2. It will read through your previous migrations folders and compare current json snapshot to the most recent one
3. Based on json differences it will generate SQL migrations
4. Save `migration.sql` and `snapshot.json` in migration folder under current timestamp

import \* as p from "./drizzle-orm/pg-core";

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
email: p.text().unique(),
};
┌────────────────────────┐
│ $ drizzle-kit generate │
└─┬──────────────────────┘
│
└ 1. read previous migration folders 2. find diff between current and previous schema 3. prompt developer for renames if necessary
┌ 4. generate SQL migration and persist to file
│ ┌─┴───────────────────────────────────────┐
│ 📂 drizzle
│ └ 📂 20242409125510_premium_mister_fear
│ ├ 📜 migration.sql
│ └ 📜 snapshot.json
v
-- drizzle/20242409125510_premium_mister_fear/migration.sql

CREATE TABLE "users" (
"id" SERIAL PRIMARY KEY,
"name" TEXT,
"email" TEXT UNIQUE
);

It’s designed to cover code first approach of managing Drizzle migrations.
You can apply generated migrations using `drizzle-kit migrate`, using drizzle-orm’s `migrate()`,
using external migration tools like bytebase or running migrations yourself directly on the database.

`drizzle-kit generate` command requires you to provide both `dialect` and `schema` path options,
you can set them either via drizzle.config.ts config file or via CLI options

With config file

As CLI options

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
});
npx drizzle-kit generate
npx drizzle-kit generate --dialect=postgresql --schema=./src/schema.ts

### Schema files path

You can have a single `schema.ts` file or as many schema files as you want spread out across the project.
Drizzle Kit requires you to specify path(s) to them as a glob via `schema` configuration option.

Example 1

Example 2

Example 3

Example 4

├ 📂 drizzle
├ 📂 src
│ ├ ...
│ ├ 📜 index.ts
│ └ 📜 schema.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/schema.ts",
});

├ 📂 drizzle
├ 📂 src
│ ├ 📂 user
│ │ ├ 📜 handler.ts
│ │ └ 📜 schema.ts
│ ├ 📂 posts
│ │ ├ 📜 handler.ts
│ │ └ 📜 schema.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/\*\*/schema.ts",
//or
schema: ["./src/user/schema.ts", "./src/posts/schema.ts"]
});

├ 📂 drizzle
├ 📂 src
│ ├ 📂 schema
│ │ ├ 📜 user.ts
│ │ ├ 📜 post.ts
│ │ └ 📜 comment.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/schema/\*",
});

├ 📂 drizzle
├ 📂 src
│ ├ 📜 userById.ts
│ ├ 📜 userByEmail.ts
│ ├ 📜 listUsers.ts
│ ├ 📜 user.sql.ts
│ ├ 📜 postById.ts
│ ├ 📜 listPosts.ts
│ └ 📜 post.sql.ts
│ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/\*_/_.sql.ts", // Dax's favourite
});

### Custom migration file name

You can set custom migration file names by providing `--name` CLI option

npx drizzle-kit generate --name=init

│ └ 📂 20242409125510_init
│ ├ 📜 snapshot.json
│ └ 📜 migration.sql
├ 📂 src
└ …

### Multiple configuration files in one project

You can have multiple config files in the project, it’s very useful when you have multiple database stages or multiple databases or different databases on the same project:

npm

yarn

pnpm

bun

npx drizzle-kit generate --config=drizzle-dev.config.ts
npx drizzle-kit generate --config=drizzle-prod.config.ts
yarn drizzle-kit generate --config=drizzle-dev.config.ts
yarn drizzle-kit generate --config=drizzle-prod.config.ts
pnpm drizzle-kit generate --config=drizzle-dev.config.ts
pnpm drizzle-kit generate --config=drizzle-prod.config.ts
bunx drizzle-kit generate --config=drizzle-dev.config.ts
bunx drizzle-kit generate --config=drizzle-prod.config.ts

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

### Custom migrations

You can generate empty migration files to write your own custom SQL migrations
for DDL alternations currently not supported by Drizzle Kit or data seeding. Extended docs on custom migrations - see here

drizzle-kit generate --custom --name=seed-users

│ ├ 📂 20242409125510_init
│ └ 📂 20242409125510_seed-users
├ 📂 src
└ …
-- ./drizzle/20242409125510_seed/migration.sql

INSERT INTO "users" ("name") VALUES('Dan');
INSERT INTO "users" ("name") VALUES('Andrew');
INSERT INTO "users" ("name") VALUES('Dandrew');

### Ignore conflicts

IMPORTANT

`--ignore-conflicts` available starting from `drizzle-orm@1.0.0-beta.16`

In case you need `generate` command to skip commutativity checks and bypass it, you can use `--ignore-conflicts`. If there is a situation you want to use it, then
there is a big chance that `drizzle-kit` didn’t check migrations right and it’s a bug. Please report us your case, so we can fix it

drizzle-kit generate --ignore-conflicts

### Extended list of available configurations

`drizzle-kit generate` has a list of cli-only options

|          |                                         |
| -------- | --------------------------------------- |
| `custom` | generate empty SQL for custom migration |
| `name`   | generate migration with custom name     |

npx drizzle-kit generate --name=init
npx drizzle-kit generate --name=seed_users --custom
yarn drizzle-kit generate --name=init
yarn drizzle-kit generate --name=seed_users --custom
pnpm drizzle-kit generate --name=init
pnpm drizzle-kit generate --name=seed_users --custom
bunx drizzle-kit generate --name=init
bunx drizzle-kit generate --name=seed_users --custom

---

We recommend configuring `drizzle-kit` through drizzle.config.ts file,
yet you can provide all configuration options through CLI if necessary, e.g. in CI/CD pipelines, etc.

|               |            |                                                                                              |
| ------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `dialect`     | `required` | Database dialect, one of `postgresql``mysql``sqlite``turso``singlestore``mssql``cockroachdb` |
| `schema`      | `required` | Path to typescript schema file(s) or folder(s) with multiple schema files                    |
| `out`         |            | Migrations output folder, default is `./drizzle`                                             |
| `config`      |            | Configuration file path, default is `drizzle.config.ts`                                      |
| `breakpoints` |            | SQL statements breakpoints, default is `true`                                                |

### Extended example

Example of how to create a custom postgresql migration file named `0001_seed-users.sql`
with Drizzle schema located in `./src/schema.ts` and migrations folder named `./migrations` instead of default `./drizzle`.

We will also place drizzle config file in the `configs` folder.

Let’s create config file:

├ 📂 configs
│ └ 📜 drizzle.config.ts
├ 📂 src
└ …
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
out: "./migrations",
});

Now let’s run

npx drizzle-kit generate --config=./configs/drizzle.config.ts --name=seed-users --custom

And it will successfully generate

├ 📂 migrations
│ ├ 📂 20242409125510_init
│ └ 📂 20242409125510_seed-users
└ …
-- ./drizzle/20242409125510_seed-users/migration.sql

---

# https://orm.drizzle.team/docs/drizzle-kit-migrate

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# `drizzle-kit migrate`

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here
- Drizzle Kit overview and config file
- `drizzle-kit generate` command - read here

`drizzle-kit migrate` lets you apply SQL migrations generated by `drizzle-kit generate`.
It’s designed to cover code first(option 3) approach of managing Drizzle migrations.

How it works under the hood?

Drizzle Kit `migrate` command triggers a sequence of events:

1. Reads through migration folder and read all `.sql` migration files
2. Connects to the database and fetches entries from drizzle migrations log table
3. Based on previously applied migrations it will decide which new migrations to run
4. Runs SQL migrations and logs applied migrations to drizzle migrations table

├ 📂 drizzle
│ ├ 📂 20242409125510_premium_mister_fear
│ └ 📂 20242409135510_delicate_professor_xavie
└ …
┌───────────────────────┐
│ $ drizzle-kit migrate │
└─┬─────────────────────┘
│ ┌──────────────────────────┐
└ 1. reads migration.sql files in migrations folder │ │

┌ 3. pick previously unapplied migrations <-------------- │ DATABASE │

│ │
└──────────────────────────┘
[✓] done!

`drizzle-kit migrate` command requires you to specify both `dialect` and database connection credentials,
you can provide them either via drizzle.config.ts config file or via CLI options

With config file

As CLI options

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname"
},
});
npx drizzle-kit migrate
npx drizzle-kit migrate --dialect=postgresql --url=postgresql://user:password@host:port/dbname

### Applied migrations log in the database

Upon running migrations Drizzle Kit will persist records about successfully applied migrations in your database.
It will store them in migrations log table named `__drizzle_migrations`.

You can customise both **table** and **schema**(PostgreSQL only) of that table via drizzle config file:

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname"
},
migrations: {
table: 'my-migrations-table', // `__drizzle_migrations` by default
schema: 'public', // used in PostgreSQL only, `drizzle` by default
},
});

### Ignore conflicts

IMPORTANT

`--ignore-conflicts` available starting from `drizzle-orm@1.0.0-beta.16`

In case you need `migrate` command to skip commutativity checks and bypass it, you can use `--ignore-conflicts`. If there is a situation you want to use it, then
there is a big chance that `drizzle-kit` didn’t check migrations right and it’s a bug. Please report us your case, so we can fix it

drizzle-kit migrate --ignore-conflicts

### Multiple configuration files in one project

You can have multiple config files in the project, it’s very useful when you have multiple database stages or multiple databases on the same project:

npm

yarn

pnpm

bun

npx drizzle-kit migrate --config=drizzle-dev.config.ts
npx drizzle-kit migrate --config=drizzle-prod.config.ts
yarn drizzle-kit migrate --config=drizzle-dev.config.ts
yarn drizzle-kit migrate --config=drizzle-prod.config.ts
pnpm drizzle-kit migrate --config=drizzle-dev.config.ts
pnpm drizzle-kit migrate --config=drizzle-prod.config.ts
bunx drizzle-kit migrate --config=drizzle-dev.config.ts
bunx drizzle-kit migrate --config=drizzle-prod.config.ts

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

### Extended example

Let’s generate SQL migration and apply it to our database using `drizzle-kit generate` and `drizzle-kit migrate` commands

├ 📂 src
│ ├ 📜 schema.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ …

drizzle.config.ts

src/schema.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname"
},
migrations: {
table: 'journal',
schema: 'drizzle',
},
});
import \* as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
})

Now let’s run

npx drizzle-kit generate --name=init

it will generate

├ 📂 migrations
│ ├ 📂 20242409125510_init
└ …
-- ./drizzle/0000_init.sql

CREATE TABLE "users"(
id serial primary key,
name text
)

npx drizzle-kit migrate

and our SQL migration is now successfully applied to the database ✅

---

# https://orm.drizzle.team/docs/drizzle-kit-pull

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# `drizzle-kit pull`

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here
- Drizzle Kit overview and config file docs

`drizzle-kit pull` lets you literally pull(introspect) your existing database schema and generate `schema.ts` drizzle schema file,
it is designed to cover database first approach of Drizzle migrations.

How it works under the hood?

When you run Drizzle Kit `pull` command it will:

1. Pull database schema(DDL) from your existing database
2. Generate `schema.ts` drizzle schema file and save it to `out` folder

┌────────────────────────┐ ┌─────────────────────────┐
│ │ <--- CREATE TABLE "users" (
┌──────────────────────────┐ │ │ "id" SERIAL PRIMARY KEY,
│ ~ drizzle-kit pull │ │ │ "name" TEXT,
└─┬────────────────────────┘ │ DATABASE │ "email" TEXT UNIQUE
│ │ │ );

┌ Generate Drizzle <----- │ │
│ schema TypeScript file └────────────────────────┘
│
v
import \* as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
email: p.text().unique(),
};

It is a great approach if you need to manage database schema outside of your TypeScript project or
you’re using database, which is managed by somebody else.

---

`drizzle-kit pull` requires you to specify `dialect` and either
database connection `url` or `user:password@host:port/db` params, you can provide them
either via drizzle.config.ts config file or via CLI options:

With config file

With CLI options

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname",
},
});
npx drizzle-kit pull
npx drizzle-kit pull --dialect=postgresql --url=postgresql://user:password@host:port/dbname

### Multiple configuration files in one project

You can have multiple config files in the project, it’s very useful when you have multiple database stages or multiple databases or different databases on the same project:

npm

yarn

pnpm

bun

npx drizzle-kit pull --config=drizzle-dev.config.ts
npx drizzle-kit pull --config=drizzle-prod.config.ts
yarn drizzle-kit pull --config=drizzle-dev.config.ts
yarn drizzle-kit pull --config=drizzle-prod.config.ts
pnpm drizzle-kit pull --config=drizzle-dev.config.ts
pnpm drizzle-kit pull --config=drizzle-prod.config.ts
bunx drizzle-kit pull --config=drizzle-dev.config.ts
bunx drizzle-kit pull --config=drizzle-prod.config.ts

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

### Specifying database driver

IMPORTANT

**Expo SQLite** and **OP SQLite** are on-device(per-user) databases, there’s no way to `pull` database schema from there.

For embedded databases Drizzle provides **embedded migrations** \- check out our get started guide.

Drizzle Kit does not come with a pre-bundled database driver,
it will automatically pick available database driver from your current project based on the `dialect` \- see discussion.

Mostly all drivers of the same dialect share the same set of connection params,
as for exceptions like `aws-data-api`, `pglight` and `d1-http` \- you will have to explicitely specify `driver` param.

AWS Data API

PGLite

Cloudflare D1 HTTP

import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
driver: "aws-data-api",
dbCredentials: {
database: "database",
resourceArn: "resourceArn",
secretArn: "secretArn",
},
};
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
driver: "pglite",
dbCredentials: {
// inmemory
url: ":memory:"

// or database folder
url: "./database/"
},
};
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "sqlite",
driver: "d1-http",
dbCredentials: {
accountId: "accountId",
databaseId: "databaseId",
token: "token",
},
};

### Initial pull

WARNING

This feature is available on `1.0.0-beta.2` and higher.

npm i drizzle-orm@beta
npm i drizzle-kit@beta -D
yarn add drizzle-orm@beta
yarn add drizzle-kit@beta -D
pnpm add drizzle-orm@beta
pnpm add drizzle-kit@beta -D
bun add drizzle-orm@beta
bun add drizzle-kit@beta -D

You can use the `--init` flag to mark the pulled schema as an applied migration in your database,
so that all subsequent migrations are diffed against the initial one

npx drizzle-kit push --init

### Including tables, schemas and extensions

`drizzle-kit push` will by default manage all tables in `public` schema.
You can configure list of tables, schemas and extensions via `tablesFilters`, `schemaFilter` and `extensionFilters` options.

|                     |                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `tablesFilter`      | `glob` based table names filter, e.g. `["users", "user_info"]` or `"user*"`. Default is `"*"`    |
| `schemaFilter`      | `glob` based schema names filter, e.g. `["public", "drizzle"]` or `"drizzle*"`. Default is `"*"` |
| `extensionsFilters` | List of installed database extensions, e.g. `["postgis"]`. Default is `[]`                       |

Let’s configure drizzle-kit to only operate with **all tables** in **public** schema
and let drizzle-kit know that there’s a **postgis** extension installed,
which creates it’s own tables in public schema, so drizzle can ignore them.

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname",
},
extensionsFilters: ["postgis"],
schemaFilter: ["public"],
tablesFilter: ["*"],
});
npx drizzle-kit push

### Extended list of configurations

We recommend configuring `drizzle-kit` through drizzle.config.ts file,
yet you can provide all configuration options through CLI if necessary, e.g. in CI/CD pipelines, etc.

|                     |            |                                                                                              |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `dialect`           | `required` | Database dialect, one of `postgresql``mysql``sqlite``turso``singlestore``mssql``cockroachdb` |
| `driver`            |            | Drivers exceptions `aws-data-api``d1-http``pglight`                                          |
| `out`               |            | Migrations output folder path, default is `./drizzle`                                        |
| `url`               |            | Database connection string                                                                   |
| `user`              |            | Database user                                                                                |
| `password`          |            | Database password                                                                            |
| `host`              |            | Host                                                                                         |
| `port`              |            | Port                                                                                         |
| `database`          |            | Database name                                                                                |
| `config`            |            | Configuration file path, default is `drizzle.config.ts`                                      |
| `introspect-casing` |            | Strategy for JS keys creation in columns, tables, etc. `preserve``camel`                     |
| `tablesFilter`      |            | Table name filter                                                                            |
| `schemaFilter`      |            | Schema name filter. Default: `["public"]`                                                    |
| `extensionsFilters` |            | Database extensions internal database filters                                                |

npx drizzle-kit pull --dialect=postgresql --url=postgresql://user:password@host:port/dbname
npx drizzle-kit pull --dialect=postgresql --driver=pglite url=database/
npx drizzle-kit pull --dialect=postgresql --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname
yarn drizzle-kit pull --dialect=postgresql --url=postgresql://user:password@host:port/dbname
yarn drizzle-kit pull --dialect=postgresql --driver=pglite url=database/
yarn drizzle-kit pull --dialect=postgresql --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname
pnpm drizzle-kit pull --dialect=postgresql --url=postgresql://user:password@host:port/dbname
pnpm drizzle-kit pull --dialect=postgresql --driver=pglite url=database/
pnpm drizzle-kit pull --dialect=postgresql --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname
bunx drizzle-kit pull --dialect=postgresql --url=postgresql://user:password@host:port/dbname
bunx drizzle-kit pull --dialect=postgresql --driver=pglite url=database/
bunx drizzle-kit pull --dialect=postgresql --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname

---

# https://orm.drizzle.team/docs/drizzle-kit-push

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# `drizzle-kit push`

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here
- Drizzle Kit overview and config file docs

`drizzle-kit push` lets you literally push your schema and subsequent schema changes directly to the
database while omitting SQL files generation, it’s designed to cover code first
approach of Drizzle migrations.

How it works under the hood?

When you run Drizzle Kit `push` command it will:

1. Read through your Drizzle schema file(s) and compose a json snapshot of your schema
2. Pull(introspect) database schema
3. Based on differences between those two it will generate SQL migrations
4. Apply SQL migrations to the database

import \* as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
};
┌─────────────────────┐
│ ~ drizzle-kit push │
└─┬───────────────────┘
│ ┌──────────────────────────┐

│ │
┌ Generate alternations based on diff <---- │ DATABASE │
│ │ │

│ └──────────────────────────┘
│
┌────────────────────────────────────┴────────────────┐
create table users(id serial primary key, name text);

It’s the best approach for rapid prototyping and we’ve seen dozens of teams
and solo developers successfully using it as a primary migrations flow in their production applications.
It pairs exceptionally well with blue/green deployment strategy and serverless databases like
Planetscale, Neon, Turso and others.

---

`drizzle-kit push` requires you to specify `dialect`, path to the `schema` file(s) and either
database connection `url` or `user:password@host:port/db` params, you can provide them
either via drizzle.config.ts config file or via CLI options:

With config file

With CLI options

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname",
},
});
npx drizzle-kit push
npx drizzle-kit push --dialect=postgresql --schema=./src/schema.ts --url=postgresql://user:password@host:port/dbname

### Schema files path

You can have a single `schema.ts` file or as many schema files as you want spread out across the project.
Drizzle Kit requires you to specify path(s) to them as a glob via `schema` configuration option.

Example 1

Example 2

Example 3

Example 4

├ 📂 drizzle
├ 📂 src
│ ├ ...
│ ├ 📜 index.ts
│ └ 📜 schema.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/schema.ts",
});

├ 📂 drizzle
├ 📂 src
│ ├ 📂 user
│ │ ├ 📜 handler.ts
│ │ └ 📜 schema.ts
│ ├ 📂 posts
│ │ ├ 📜 handler.ts
│ │ └ 📜 schema.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/\*\*/schema.ts",
//or
schema: ["./src/user/schema.ts", "./src/posts/schema.ts"]
});

├ 📂 drizzle
├ 📂 src
│ ├ 📂 schema
│ │ ├ 📜 user.ts
│ │ ├ 📜 post.ts
│ │ └ 📜 comment.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/schema/\*",
});

├ 📂 drizzle
├ 📂 src
│ ├ 📜 userById.ts
│ ├ 📜 userByEmail.ts
│ ├ 📜 listUsers.ts
│ ├ 📜 user.sql.ts
│ ├ 📜 postById.ts
│ ├ 📜 listPosts.ts
│ └ 📜 post.sql.ts
│ 📜 index.ts
├ 📜 drizzle.config.ts
└ 📜 package.json
import { defineConfig } from "drizzle-kit";

export default defineConfig({
schema: "./src/\*_/_.sql.ts", // Dax's favourite
});

### Multiple configuration files in one project

You can have multiple config files in the project, it’s very useful when you have multiple database stages or multiple databases or different databases on the same project:

npm

yarn

pnpm

bun

npx drizzle-kit push --config=drizzle-dev.config.ts
npx drizzle-kit push --config=drizzle-prod.config.ts
yarn drizzle-kit push --config=drizzle-dev.config.ts
yarn drizzle-kit push --config=drizzle-prod.config.ts
pnpm drizzle-kit push --config=drizzle-dev.config.ts
pnpm drizzle-kit push --config=drizzle-prod.config.ts
bunx drizzle-kit push --config=drizzle-dev.config.ts
bunx drizzle-kit push --config=drizzle-prod.config.ts

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

### Specifying database driver

IMPORTANT

**Expo SQLite** and **OP SQLite** are on-device(per-user) databases, there’s no way to `push` migrations there.

For embedded databases Drizzle provides **embedded migrations** \- check out our get started guide.

Drizzle Kit does not come with a pre-bundled database driver,
it will automatically pick available database driver from your current project based on the `dialect` \- see discussion.

Mostly all drivers of the same dialect share the same set of connection params,
as for exceptions like `aws-data-api`, `pglight` and `d1-http` \- you will have to explicitly specify `driver` param.

AWS Data API

PGLite

Cloudflare D1 HTTP

import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
driver: "aws-data-api",
dbCredentials: {
database: "database",
resourceArn: "resourceArn",
secretArn: "secretArn",
},
});
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
driver: "pglite",
dbCredentials: {
// inmemory
url: ":memory:"

// or database folder
url: "./database/"
},
});
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "sqlite",
schema: "./src/schema.ts",
driver: "d1-http",
dbCredentials: {
accountId: "accountId",
databaseId: "databaseId",
token: "token",
},
});

### Including tables, schemas and extensions

`drizzle-kit push` will by default manage all tables in `public` schema.
You can configure list of tables, schemas and extensions via `tablesFilters`, `schemaFilter` and `extensionFilters` options.

|                     |                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `tablesFilter`      | `glob` based table names filter, e.g. `["users", "user_info"]` or `"user*"`. Default is `"*"` |
| `schemaFilter`      | Schema names filter, e.g. `["public", "drizzle"]`. Default is `["public"]`                    |
| `extensionsFilters` | List of installed database extensions, e.g. `["postgis"]`. Default is `[]`                    |

Let’s configure drizzle-kit to only operate with **all tables** in **public** schema
and let drizzle-kit know that there’s a **postgis** extension installed,
which creates it’s own tables in public schema, so drizzle can ignore them.

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname",
},
extensionsFilters: ["postgis"],
schemaFilter: ["public"],
tablesFilter: ["*"],
});
npx drizzle-kit push

### Extended list of configurations

`drizzle-kit push` has a list of cli-only options

|           |                                                         |
| --------- | ------------------------------------------------------- |
| `verbose` | print all SQL statements prior to execution             |
| `strict`  | always ask for approval before executing SQL statements |
| `force`   | auto-accept all data-loss statements                    |

npx drizzle-kit push --strict --verbose --force
yarn drizzle-kit push --strict --verbose --force
pnpm drizzle-kit push --strict --verbose --force
bunx drizzle-kit push --strict --verbose --force

We recommend configuring `drizzle-kit` through drizzle.config.ts file,
yet you can provide all configuration options through CLI if necessary, e.g. in CI/CD pipelines, etc.

|                     |            |                                                                                              |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `dialect`           | `required` | Database dialect, one of `postgresql``mysql``sqlite``turso``singlestore``mssql``cockroachdb` |
| `schema`            | `required` | Path to typescript schema file(s) or folder(s) with multiple schema files                    |
| `driver`            |            | Drivers exceptions `aws-data-api``d1-http``pglight`                                          |
| `tablesFilter`      |            | Table name filter                                                                            |
| `schemaFilter`      |            | Schema name filter. Default: `["public"]`                                                    |
| `extensionsFilters` |            | Database extensions internal database filters                                                |
| `url`               |            | Database connection string                                                                   |
| `user`              |            | Database user                                                                                |
| `password`          |            | Database password                                                                            |
| `host`              |            | Host                                                                                         |
| `port`              |            | Port                                                                                         |
| `database`          |            | Database name                                                                                |
| `config`            |            | Configuration file path, default=`drizzle.config.ts`                                         |

npx drizzle-kit push dialect=postgresql schema=src/schema.ts url=postgresql://user:password@host:port/dbname
npx drizzle-kit push dialect=postgresql schema=src/schema.ts driver=pglite url=database/
npx drizzle-kit push dialect=postgresql schema=src/schema.ts --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname
yarn drizzle-kit push dialect=postgresql schema=src/schema.ts url=postgresql://user:password@host:port/dbname
yarn drizzle-kit push dialect=postgresql schema=src/schema.ts driver=pglite url=database/
yarn drizzle-kit push dialect=postgresql schema=src/schema.ts --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname
pnpm drizzle-kit push dialect=postgresql schema=src/schema.ts url=postgresql://user:password@host:port/dbname
pnpm drizzle-kit push dialect=postgresql schema=src/schema.ts driver=pglite url=database/
pnpm drizzle-kit push dialect=postgresql schema=src/schema.ts --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname
bunx drizzle-kit push dialect=postgresql schema=src/schema.ts url=postgresql://user:password@host:port/dbname
bunx drizzle-kit push dialect=postgresql schema=src/schema.ts driver=pglite url=database/
bunx drizzle-kit push dialect=postgresql schema=src/schema.ts --tablesFilter=‘user*’ --extensionsFilters=postgis url=postgresql://user:password@host:port/dbname

### Extended example

Let’s declare drizzle schema in the project and push it to the database via `drizzle-kit push` command

│ ├ 📜 schema.ts
│ └ 📜 index.ts
├ 📜 drizzle.config.ts
└ …

drizzle.config.ts

src/schema.ts

export default defineConfig({
dialect: "postgresql",
schema: "./src/schema.ts",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname"
},
});
import \* as p from "drizzle-orm/pg-core";

export const users = p.pgTable("users", {
id: p.serial().primaryKey(),
name: p.text(),
})

Now let’s run

npx drizzle-kit push

it will pull existing(empty) schema from the database and generate SQL migration and apply it under the hood

CREATE TABLE "users"(
id serial primary key,
name text
)

DONE ✅

---

# https://orm.drizzle.team/docs/drizzle-kit-studio

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# `drizzle-kit studio`

This guide assumes familiarity with:

- Drizzle Kit overview and config file
- Drizzle Studio, our database browser - read here

`drizzle-kit studio` command spins up a server for Drizzle Studio hosted on local.drizzle.studio.
It requires you to specify database connection credentials via drizzle.config.ts config file.

By default it will start a Drizzle Studio server on `127.0.0.1:4983`

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
dbCredentials: {
url: "postgresql://user:password@host:port/dbname"
},
});
npx drizzle-kit migrate

### Configuring `host` and `port`

By default Drizzle Studio server starts on `127.0.0.1:4983`,
you can config `host` and `port` via CLI options

npm

yarn

pnpm

bun

npx drizzle-kit studio --port=3000
npx drizzle-kit studio --host=0.0.0.0
npx drizzle-kit studio --host=0.0.0.0 --port=3000
yarn drizzle-kit studio --port=3000
yarn drizzle-kit studio --host=0.0.0.0
yarn drizzle-kit studio --host=0.0.0.0 --port=3000
pnpm drizzle-kit studio --port=3000
pnpm drizzle-kit studio --host=0.0.0.0
pnpm drizzle-kit studio --host=0.0.0.0 --port=3000
bunx drizzle-kit studio --port=3000
bunx drizzle-kit studio --host=0.0.0.0
bunx drizzle-kit studio --host=0.0.0.0 --port=3000

### Logging

You can enable logging of every SQL statement by providing `verbose` flag

npx drizzle-kit studio --verbose
yarn drizzle-kit studio --verbose
pnpm drizzle-kit studio --verbose
bunx drizzle-kit studio --verbose

### Safari and Brave support

Safari and Brave block access to localhost by default.
You need to install mkcert and generate self-signed certificate:

1. Follow the mkcert installation steps
2. Run `mkcert -install`
3. Restart your `drizzle-kit studio`

### Embeddable version of Drizzle Studio

While hosted version of Drizzle Studio for local development is free forever and meant to just enrich Drizzle ecosystem,
we have a B2B offering of an embeddable version of Drizzle Studio for businesses.

**Drizzle Studio component** \- is a pre-bundled framework agnostic web component of Drizzle Studio
which you can embed into your UI `React``Vue``Svelte``VanillaJS` etc.

That is an extremely powerful UI element that can elevate your offering
if you provide Database as a SaaS or a data centric SaaS solutions based
on SQL or for private non-customer facing in-house usage.

Database platforms using Drizzle Studio:

- Turso, our first customers since Oct 2023!
- Neon, launch post
- Hydra

Data centric platforms using Drizzle Studio:

- Nuxt Hub, Sébastien Chopin’s launch post
- Deco.cx

You can read a detailed overview here and
if you’re interested - hit us in DMs on Twitter or in Discord #drizzle-studio channel.

### Drizzle Studio chrome extension

Drizzle Studio chrome extension
lets you browse your PlanetScale,
Cloudflare and Vercel Postgres
serverless databases directly in their vendor admin panels!

### Limitations

Our hosted version Drizzle Studio is meant to be used for local development and not meant to be used on remote (VPS, etc).

If you want to deploy Drizzle Studio to your VPS - we have an alpha version of Drizzle Studio Gateway,
hit us in DMs on Twitter or in Discord #drizzle-studio channel.

### Is it open source?

No. Drizzle ORM and Drizzle Kit are fully open sourced, while Studio is not.

Drizzle Studio for local development is free to use forever to enrich Drizzle ecosystem,
open sourcing one would’ve break our ability to provide B2B offerings and monetise it, unfortunately.

---

# https://orm.drizzle.team/docs/drizzle-kit-check

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# `drizzle-kit check`

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here
- Drizzle Kit overview and config file
- `drizzle-kit generate` command - read here

`drizzle-kit check` command lets you check consistency of your generated SQL migrations history.

That’s extremely useful when you have multiple developers working on the project and
altering database schema on different branches - read more about migrations for teams.

---

`drizzle-kit check` command requires you to specify both `dialect` and database connection credentials,
you can provide them either via drizzle.config.ts config file or via CLI options

With config file

As CLI options

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
});
npx drizzle-kit check
npx drizzle-kit check --dialect=postgresql

### Multiple configuration files in one project

You can have multiple config files in the project, it’s very useful when you have multiple database stages or multiple databases on the same project:

npm

yarn

pnpm

bun

npx drizzle-kit check --config=drizzle-dev.config.ts
npx drizzle-kit check --config=drizzle-prod.config.ts
yarn drizzle-kit check --config=drizzle-dev.config.ts
yarn drizzle-kit check --config=drizzle-prod.config.ts
pnpm drizzle-kit check --config=drizzle-dev.config.ts
pnpm drizzle-kit check --config=drizzle-prod.config.ts
bunx drizzle-kit check --config=drizzle-dev.config.ts
bunx drizzle-kit check --config=drizzle-prod.config.ts

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

### Extended list of configurations

We recommend configuring `drizzle-kit` through drizzle.config.ts file,
yet you can provide all configuration options through CLI if necessary, e.g. in CI/CD pipelines, etc.

|           |            |                                                                         |
| --------- | ---------- | ----------------------------------------------------------------------- |
| `dialect` | `required` | Database dialect you are using. Can be `postgresql`,`mysql` or `sqlite` |
| `out`     |            | Migrations folder, default=`./drizzle`                                  |
| `config`  |            | Configuration file path, default=`drizzle.config.ts`                    |

npx drizzle-kit check --dialect=postgresql
npx drizzle-kit check --dialect=postgresql --out=./migrations-folder
yarn drizzle-kit check --dialect=postgresql
yarn drizzle-kit check --dialect=postgresql --out=./migrations-folder
pnpm drizzle-kit check --dialect=postgresql
pnpm drizzle-kit check --dialect=postgresql --out=./migrations-folder
bunx drizzle-kit check --dialect=postgresql
bunx drizzle-kit check --dialect=postgresql --out=./migrations-folder

---

# https://orm.drizzle.team/docs/drizzle-kit-up

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

# `drizzle-kit up`

This guide assumes familiarity with:

- Get started with Drizzle and `drizzle-kit` \- read here
- Drizzle schema fundamentals - read here
- Database connection basics - read here
- Drizzle migrations fundamentals - read here
- Drizzle Kit overview and config file
- `drizzle-kit generate` command - read here

`drizzle-kit up` command lets you upgrade drizzle schema snapshots to a newer version.
It’s required whenever we introduce breaking changes to the json snapshots of the schema and upgrade the internal version.

---

`drizzle-kit up` command requires you to specify both `dialect` and database connection credentials,
you can provide them either via drizzle.config.ts config file or via CLI options

With config file

As CLI options

// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
});
npx drizzle-kit up
npx drizzle-kit up --dialect=postgresql

### Multiple configuration files in one project

You can have multiple config files in the project, it’s very useful when you have multiple database stages or multiple databases on the same project:

npm

yarn

pnpm

bun

npx drizzle-kit migrate --config=drizzle-dev.config.ts
npx drizzle-kit migrate --config=drizzle-prod.config.ts
yarn drizzle-kit migrate --config=drizzle-dev.config.ts
yarn drizzle-kit migrate --config=drizzle-prod.config.ts
pnpm drizzle-kit migrate --config=drizzle-dev.config.ts
pnpm drizzle-kit migrate --config=drizzle-prod.config.ts
bunx drizzle-kit migrate --config=drizzle-dev.config.ts
bunx drizzle-kit migrate --config=drizzle-prod.config.ts

├ 📂 src
├ 📜 .env
├ 📜 drizzle-dev.config.ts
├ 📜 drizzle-prod.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

### Extended list of configurations

We recommend configuring `drizzle-kit` through drizzle.config.ts file,
yet you can provide all configuration options through CLI if necessary, e.g. in CI/CD pipelines, etc.

|           |            |                                                                         |
| --------- | ---------- | ----------------------------------------------------------------------- |
| `dialect` | `required` | Database dialect you are using. Can be `postgresql`,`mysql` or `sqlite` |
| `out`     |            | Migrations folder, default=`./drizzle`                                  |
| `config`  |            | Configuration file path, default=`drizzle.config.ts`                    |

npx drizzle-kit up --dialect=postgresql
npx drizzle-kit up --dialect=postgresql --out=./migrations-folder
yarn drizzle-kit up --dialect=postgresql
yarn drizzle-kit up --dialect=postgresql --out=./migrations-folder
pnpm drizzle-kit up --dialect=postgresql
pnpm drizzle-kit up --dialect=postgresql --out=./migrations-folder
bunx drizzle-kit up --dialect=postgresql
bunx drizzle-kit up --dialect=postgresql --out=./migrations-folder

---

# https://orm.drizzle.team/docs/get-started)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-generate)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-generate).

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-migrate)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-migrate).

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-pull)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-push)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-studio)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-check)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/drizzle-kit-up)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle ORM and Drizzle Kit v1.0.0-beta.2 release

# New Features

## MSSQL dialect

Drizzle now supports MSSQL in `drizzle-orm`, `drizzle-kit` and `drizzle-seed` packages. It support most of the columns, query builder capabilities, migration strategies, etc.

The only feature that is not yet supported is `RQBv2`

// Make sure to install the 'mssql' package
import { drizzle } from 'drizzle-orm/node-mssql';

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute('select 1');
// Make sure to install the 'pg' package
import { drizzle } from 'drizzle-orm/node-mssql';

// You can specify any property from the mssql connection options
const db = drizzle({
connection: {
connectionString: process.env.DATABASE_URL,
ssl: true
}
});

const result = await db.execute('select 1');

## CockroachDB dialect

// Make sure to install the 'pg' package
import { drizzle } from 'drizzle-orm/cockroach';

const result = await db.execute('select 1');
// Make sure to install the 'pg' package
import { drizzle } from 'drizzle-orm/cockroach';

// You can specify any property from the node-postgres connection options
const db = drizzle({
connection: {
connectionString: process.env.DATABASE_URL,
ssl: true
}
});

## Relational Query Parts

In a case you need to separate relations config into several parts you can use `defineRelationsPart` helpers

import { defineRelations, defineRelationsPart } from 'drizzle-orm';
import \* as schema from "./schema";

users: {
invitee: r.one.users({
from: r.users.invitedBy,
to: r.users.id,
}),
posts: r.many.posts(),
}
}));

posts: {
author: r.one.users({
from: r.posts.authorId,
to: r.users.id,
}),
}
}));

and then you can provide it to the db instance

const db = drizzle(process.env.DB_URL, { relations: { ...relations, ...part } })

We’ve updated the migrations folder structure by:

- removing journal.json
- grouping SQL files and snapshots into separate migration folders
- removing the `drizzle-kit drop` command

These changes eliminate potential Git conflicts with the journal file and simplify the process of dropping or fixing conflicted migrations

To migrate previous folders to a new format you would need to run

drizzle-kit up

## Full `drizzle-kit` rewrite

Architecture rewrite to close major kit and migration issues. We’ve completed a set of valuable and necessary updates to help us iterate faster, improve test coverage, and enhance overall stability.

Summary of work completed:

- Migrated from database snapshots to database DDL snapshots
- Reworked the entire architecture for detecting and applying diffs
- Added significant improvements for defaults, expressions, and types detection
- Reduced schema introspection time from 10 seconds to under 1 second by minimizing database calls and query complexity
- Added query hints and explain support for push
- Expanded test coverage - each test case now runs up to 6 different scenarios (e.g., push+push, pull+generate, etc.)

## Added `drizzle-kit pull --init`

This flag will create a drizzle migration table in the database and will mark first pulled migration as applied, so you can contrinue iterating from there

## `schemaFilter` behavior update

`drizzle-kit` will start managing all the schemas defined in your code. If you want to filter them, you can use `schemaFilter`
Previously, only the public schema was managed unless you explicitly added more schemas to `schemaFilter`.

It now also supports glob patterns, allowing you to filter schemas in any way you like

## `.enableRLS()` deprecation

Previously to mark PostgreSQL table with RLS enabled you would need to:

// OLD syntax
pgTable('name', {}).enableRLS()

We moved this option to a different place

pgTable.withRLS('users', {});

## Alias directly on columns

You can now add `as` alias to the column in a simple way:

const query = db
.select({ age: users.age.as('ageOfUser'), id: users.id.as('userId') })
.from(users)
.orderBy(asc(users.id.as('userId')));

## MySQL new column types

We’ve added a few more MySQL column types:

- blob:
- tinyblob:
- mediumblob:
- longblob:

## More Updates and Fixes

- Fixed pg-native Pool detection in node-postgres transactions
- Allowed subqueries in select fields

- Fixed `$onUpdate` not handling `SQL` values (fixes #2388, tests implemented by L-Mario564 in #2911)
- Fixed `pg` mappers not handling `Date` instances in `bun-sql:postgresql` driver responses for `date`, `timestamp` types (fixes #4493)

- [\[BUG\]: Drizzle-kit pulls postgres functions as Typescript methods](https://github.com/drizzle-team/drizzle-orm/issues/4916)

- [\[BUG\]: When setting the casing to snake_case, the constraint name for unique fields isn’t converted](https://github.com/drizzle-team/drizzle-orm/issues/4800)

- [\[BUG\]: `drizzle-kit push` append `DROP SCHEMA` at the end for other schema name](https://github.com/drizzle-team/drizzle-orm/issues/4796)

- [\[BUG\]: `drizzle-kit push` incorrectly tries to drop composite unique constraint despite no changes made](https://github.com/drizzle-team/drizzle-orm/issues/4789)

- [\[BUG\]: MySQL enum defaults with value ‘0’ are ignored during introspection](https://github.com/drizzle-team/drizzle-orm/issues/4786)

- [\[BUG\]: drizzle-kit / Amazon Aurora DSQL : `drizzle-kit push` tries to drop the primary key index on reapply without changes](https://github.com/drizzle-team/drizzle-orm/issues/4779)

- [\[BUG\]: `drizzle-kit check` wrongly tries to use AWS Data API](https://github.com/drizzle-team/drizzle-orm/issues/4775)

- [\[BUG\]: bunx drizzle-kit push Freezes at “Reading config file” in Version ^0.31.4](https://github.com/drizzle-team/drizzle-orm/issues/4771)

- [\[BUG\]: Introspect generated files don’t show columns in Views as arrays](https://github.com/drizzle-team/drizzle-orm/issues/4764)

- [\[BUG\]: drizzle kit wrong schema with default string](https://github.com/drizzle-team/drizzle-orm/issues/4760)

- [\[BUG\]: drizzle-kit pull fails to wrap gen_random_uuid() with sql function call resulting in syntax errors](https://github.com/drizzle-team/drizzle-orm/issues/4730)

- [\[BUG\]: `drizzle-kit introspect` empty `''` mysqlEnum nad default introspect error](https://github.com/drizzle-team/drizzle-orm/issues/4713)

- [\[BUG\]: CHECK constraints with operator functions generate invalid SQL with parameterized values](https://github.com/drizzle-team/drizzle-orm/issues/4661)

- [\[BUG\]: tinyint, bigint doesn’t include when run drizzle-kit pull](https://github.com/drizzle-team/drizzle-orm/issues/4653)

- [\[BUG\]:drizzle-kit pull missing one ’ letter column with default empty text](https://github.com/drizzle-team/drizzle-orm/issues/4644)

- [\[BUG\]: Unable to create composite foreign key: order of SQL statements \[Postgres\]](https://github.com/drizzle-team/drizzle-orm/issues/4638)

- [\[BUG\]: drizzle-kit MySQL Serializer doesn’t see PKs and CHECK constraints](https://github.com/drizzle-team/drizzle-orm/issues/4602)

- [\[BUG\]: unique key names for multiple columns doesn’t respect casing configuration](https://github.com/drizzle-team/drizzle-orm/issues/4541)

- [\[BUG\]: `drizzle-kit push` fails if the target postgres database has a `jsonb` column with a default value](https://github.com/drizzle-team/drizzle-orm/issues/4529)

- [\[BUG\]: `drizzle-kit generate` generates out of order/ incorrect migrations](https://github.com/drizzle-team/drizzle-orm/issues/4456)

- [\[BUG\]: `with:` columns resulting in `any` values](https://github.com/drizzle-team/drizzle-orm/issues/4432)

- [\[BUG\]: Drizzle not pulling foreign key names using introspect command in ts + mysql](https://github.com/drizzle-team/drizzle-orm/issues/4415)

- [\[BUG\]: Invalid SQL query generated for MySQL when using “with” feature](https://github.com/drizzle-team/drizzle-orm/issues/4412)

- [\[BUG\]: with Relation in findMany Returns Flattened Array Instead of Key-Value Object](https://github.com/drizzle-team/drizzle-orm/issues/4409)

- [\[BUG\]: drizzle-orm@beta query object is empty in NuxtHub project](https://github.com/drizzle-team/drizzle-orm/issues/4390)

- [\[BUG\]: Big int precision loss when data fetched with json_agg](https://github.com/drizzle-team/drizzle-orm/issues/4380)

- [\[BUG\]: Incorrect column types when using `with` for table created with helper function](https://github.com/drizzle-team/drizzle-orm/issues/4358)

- [\[BUG\]: drizzle-orm@beta SQLite error in queries w/ `with`](https://github.com/drizzle-team/drizzle-orm/issues/4357)

- [\[BUG\]: Identifier is too long (should not exceed 63 characters)](https://github.com/drizzle-team/drizzle-orm/issues/4238)

- [\[BUG\]: Unable to create MySQL foreign string keys](https://github.com/drizzle-team/drizzle-orm/issues/4221)

- [\[BUG\]: Drizzle type inferrence doesn’t work properly with many tables](https://github.com/drizzle-team/drizzle-orm/issues/4199)

- findFirst Date returned as string

- [\[BUG\]: Can’t drop a foreign key in Turso dialect](https://github.com/drizzle-team/drizzle-orm/issues/4167)

- [\[BUG\]: wrong table name generated in `$count` sub-expression](https://github.com/drizzle-team/drizzle-orm/issues/4164)

- [\[BUG\]:Unknown column in where](https://github.com/drizzle-team/drizzle-orm/issues/4159)

- [\[BUG\]: drizzle-kit generate when dropping table attempts to delete already deleted constraint](https://github.com/drizzle-team/drizzle-orm/issues/4155)

- [\[BUG\]: Incomplete inferred result type in query API when using optional columns](https://github.com/drizzle-team/drizzle-orm/issues/4153)

- SQLite columns are not marked as unique, instead a unique index has been created

- [\[BUG\]:Introspect does not pull foreign key names when `on delete` and `on update` are set to other than `no action`](https://github.com/drizzle-team/drizzle-orm/issues/4115)

- [\[BUG\]: `drizzle-kit pull` made a broken schema as TypeScript. (looks forget to import `tinyint` from drizzle-orm/mysql-core)](https://github.com/drizzle-team/drizzle-orm/issues/4110)

- [\[BUG\]: Drizzle Relational Query not filtering well](https://github.com/drizzle-team/drizzle-orm/issues/4080)

- [\[BUG\]:Inconsistent behavior in many-to-many relations with junction table: identical patterns yield different results](https://github.com/drizzle-team/drizzle-orm/issues/3937)

- [\[BUG\]:Error Typescript for query where in relation (version “drizzle-orm”: “^0.38.3”)](https://github.com/drizzle-team/drizzle-orm/issues/3911)

- [\[BUG\]: findFirst not return undefined or null when not data is found.](https://github.com/drizzle-team/drizzle-orm/issues/3872)

- [\[DOCS\]: Nullable Relation](https://github.com/drizzle-team/drizzle-orm/issues/3855)

- [\[BUG\]: Type error when performing filter select according to docs](https://github.com/drizzle-team/drizzle-orm/issues/3804)

- [\[BUG\]: Incorrect Non-Nullable Type Inference for One-to-One Related Entities](https://github.com/drizzle-team/drizzle-orm/issues/3799)

- [\[BUG\]: Allow specifying relationName for one-to-one relationships on the side without field definitions](https://github.com/drizzle-team/drizzle-orm/issues/3763)

- [\[BUG\]: Custom types not working when insert with onConflictDoUpdate in Sqlite](https://github.com/drizzle-team/drizzle-orm/issues/3730)

- [\[FEATURE\]: Scopes API](https://github.com/drizzle-team/drizzle-orm/issues/3646)

- [\[BUG\]: Column name conversion not working when using `sql.js`](https://github.com/drizzle-team/drizzle-orm/issues/3642)

- [\[BUG\]: Drizzle-kit no longer supporting the special characters in enum values (MySQL)](https://github.com/drizzle-team/drizzle-orm/issues/3613)

- [\[BUG\]:drizzle-kit pull returns .with(securityInvoker”:“on”)](https://github.com/drizzle-team/drizzle-orm/issues/3585)

- [\[BUG\]: db.query creates slow (?) queries in related queries](https://github.com/drizzle-team/drizzle-orm/issues/3581)

- [\[BUG\]:push creates duplicate statements for unique column index](https://github.com/drizzle-team/drizzle-orm/issues/3574)

- [\[BUG\]: findMany (and likely others) building an invalid query when other tables are referenced in the where clause](https://github.com/drizzle-team/drizzle-orm/issues/3573)

- [\[BUG\]: $count() generates the wrong Postgres subquery](https://github.com/drizzle-team/drizzle-orm/issues/3564)

- [\[BUG\]:drizzle-kit pull generate wrong schema.ts](https://github.com/drizzle-team/drizzle-orm/issues/3559)

- [\[BUG\]: Instrospect doesn’t put `.primaryKey()` in my tables](https://github.com/drizzle-team/drizzle-orm/issues/3552)

- [\[BUG\]: extras in findMany count relations is not working](https://github.com/drizzle-team/drizzle-orm/issues/3546)

- [\[BUG\]: TypeError: Cannot read properties of undefined (reading ‘columns’)](https://github.com/drizzle-team/drizzle-orm/issues/3539)

- [\[BUG\]: `pgEnum` generates faulty migrations](https://github.com/drizzle-team/drizzle-orm/issues/3514)

- MYSQL Introspect: Warning: Can’t parse bit(1) from database

- Certain Postgres types are not handled by `introspect:pg`

- BUG `drizzle-kit push:mysql` with Two Primary Keys

- push:mysql fails to drop a serial column and replace with another column type

- db push just hangs, verbose doesn’t show any details

- Drizzle Studio giving error due to `CURRENT_TIMESTAMP` in schema

- [\[Mysql\] Drizzle kit generates invalid SQL syntax for `onUpdateNow` when an `fsp` is provided to timestamp](https://github.com/drizzle-team/drizzle-orm/issues/3373)

- drizzle-kit push with PostGIS geometry column type

- [\[BUG\]: Mysql new .unique().notNull(), `add constraint` is put before `add column`, throwing error.](https://github.com/drizzle-team/drizzle-orm/issues/3329)

- Double quotes on defaults

- There are three cases where drizzle-kit’s introspect:mysql does not work.

- MySQL & PostgreSQL: not detecting all new cascades

- [\[BUG\]:array of enum occurs error when drizzle-kit pushing](https://github.com/drizzle-team/drizzle-orm/issues/3278)

- [\[BUG\]:Deep nested queries](https://github.com/drizzle-team/drizzle-orm/issues/3277)

- [\[BUG\]: `findMany`/`findFirst` incorrectly substituting table names in sql operator](https://github.com/drizzle-team/drizzle-orm/issues/3268)

- [\[BUG\]: Incorrect bigint value retrieval using findMany with relations (postgresql)](https://github.com/drizzle-team/drizzle-orm/issues/3267)

- [\[BUG\]: bit type goes to postgresql as a string](https://github.com/drizzle-team/drizzle-orm/issues/3254)

- [\[BUG\]: Foreign key name length](https://github.com/drizzle-team/drizzle-orm/issues/3244)

- [\[BUG\]: “unix_timestamp is not defined”](https://github.com/drizzle-team/drizzle-orm/issues/3237)

- [\[BUG\]: Pressing `escape` while in the `push` confirmation dialog runs the push](https://github.com/drizzle-team/drizzle-orm/issues/3230)

- [\[BUG\]: arrayContains, arrayContained, arrayOverlaps aren’t there in queries find callbacks](https://github.com/drizzle-team/drizzle-orm/issues/3169)

- [\[BUG\]: Query extras resolve table names incorrectly](https://github.com/drizzle-team/drizzle-orm/issues/3110)

- [\[BUG\]: UUID Error on push, but no issue via generate / migrate](https://github.com/drizzle-team/drizzle-orm/issues/3090)

- [\[BUG\]: default value in migration generates invalid sql.ts file](https://github.com/drizzle-team/drizzle-orm/issues/3087)

- [\[BUG\]: drizzle-kit triggers a \_ZodError when uniqueIndex is used together with sql lower](https://github.com/drizzle-team/drizzle-orm/issues/3062)

- [\[BUG\]: drizzle-kit introspect TypeError: Cannot read properties of null (reading ‘camelCase’)](https://github.com/drizzle-team/drizzle-orm/issues/3046)

- [\[BUG\]: Types aren’t correctly inferred for nested `with: { where }` clauses](https://github.com/drizzle-team/drizzle-orm/issues/3045)

- [\[BUG\]: drizzle-kit introspection does not import “bigint” type when introspecting a MySql database.](https://github.com/drizzle-team/drizzle-orm/issues/2988)

- [\[BUG\]: findFirst and findMany queries using the ‘with’ statement can’t parse the models if the related table has a geomtery column](https://github.com/drizzle-team/drizzle-orm/issues/2961)

- [\[FEATURE\]: API for to ‘flatten’ response shapes when querying data from complex schemas and their relations.](https://github.com/drizzle-team/drizzle-orm/issues/2933)

- [\[FEATURE\]: Add `where` in one-to-one querying](https://github.com/drizzle-team/drizzle-orm/issues/2903)

- [\[DOCUMENTATION\]: Typo in the code](https://github.com/drizzle-team/drizzle-orm/issues/2840)

- [\[BUG\]: migrations do not work - table already exists - ER_TABLE_EXISTS_ERROR - mysql](https://github.com/drizzle-team/drizzle-orm/issues/2815)

- [\[BUG\]: pg geometry is preventing migration](https://github.com/drizzle-team/drizzle-orm/issues/2806)

- [\[BUG\]: Do statement double dollar sign not escaping cases where you want a ”$” as a value](https://github.com/drizzle-team/drizzle-orm/issues/2710)

- [\[BUG\]: Drizzle Query Returns Different Result Than Select](https://github.com/drizzle-team/drizzle-orm/issues/2703)

- [\[BUG\]: drizzle-orm imported operators `eq`, `lt`, etc. unable to recognize left hand “table.column” param while callback syntax works](https://github.com/drizzle-team/drizzle-orm/issues/2698)

- [\[BUG\]: PG Numeric inferred as string, but is numeric at runtime](https://github.com/drizzle-team/drizzle-orm/issues/2681)

- [\[BUG\]: Geometry type ignores SRID option](https://github.com/drizzle-team/drizzle-orm/issues/2675)

- [\[FEATURE\]: Drizzle relations with materialized views](https://github.com/drizzle-team/drizzle-orm/issues/2653)

- [\[BUG\]: MySQL generatedAlwaysAs with notNull](https://github.com/drizzle-team/drizzle-orm/issues/2616)

- [\[BUG\]: Unique key reconciliation with upstream schema is inconsistent](https://github.com/drizzle-team/drizzle-orm/issues/2599)

- [\[BUG\]: Aggregated results from many-to-one relations doesn’t return timestamp using postgres DB](https://github.com/drizzle-team/drizzle-orm/issues/2555)

- [\[BUG\]: Issues with nested conditions & placeholders in SQLite query](https://github.com/drizzle-team/drizzle-orm/issues/2529)

- [\[BUG\]: Postgis `geometry` query select fails when using `with`](https://github.com/drizzle-team/drizzle-orm/issues/2526)

- [\[BUG\]: Geometry config type doesn’t appear to affect the output sql](https://github.com/drizzle-team/drizzle-orm/issues/2454)

- [\[BUG\]: relation query API default alias is different than regular alias](https://github.com/drizzle-team/drizzle-orm/issues/2431)

- [\[BUG\]: Unable to provide sql value in $onUpdate](https://github.com/drizzle-team/drizzle-orm/issues/2388)

- [\[BUG\]: Typing issue when using tables with the same name across different schemas](https://github.com/drizzle-team/drizzle-orm/issues/2387)

- Support nested orderBy

- [\[BUG\]: Timestamp formatted differently if fetched as relation rather than directly](https://github.com/drizzle-team/drizzle-orm/issues/2282)

- [\[FEATURE\]: Allow for hardcoded values in relations](https://github.com/drizzle-team/drizzle-orm/issues/2268)

- [\[BUG\]: Adding new column and unique key on the new column generates invalid migration file](https://github.com/drizzle-team/drizzle-orm/issues/2236)

- [\[BUG\]: encoding issue with non-ASCII characters](https://github.com/drizzle-team/drizzle-orm/issues/2235)

- [\[BUG\]: Query API does not include schema name when including child relations](https://github.com/drizzle-team/drizzle-orm/issues/2194)

- [\[BUG\]: Planetscale got packets out of order for ‘serial’ type on push](https://github.com/drizzle-team/drizzle-orm/issues/2180)

- [\[BUG\]: Postgres customType generate invalid SQL.](https://github.com/drizzle-team/drizzle-orm/issues/2087)

- [\[BUG\]: Deeply nested queries fail due to table name length](https://github.com/drizzle-team/drizzle-orm/issues/2066)

- [\[BUG\]: on cascade delete issue with multiple foreign keys and migrations](https://github.com/drizzle-team/drizzle-orm/issues/2018)

- [\[DOCS\]: Relationships should have their own page](https://github.com/drizzle-team/drizzle-orm/issues/1913)

- [\[BUG\]: Schema name is not prepended to the table name when aliased const.](https://github.com/drizzle-team/drizzle-orm/issues/1903)

- [\[BUG\]: `Do not know how to serialize a BigInt` errors when using BigInt in `default(0n)` directive](https://github.com/drizzle-team/drizzle-orm/issues/1879)

- [\[BUG\]: Typescript doesn’t recognize One-To-One Relation](https://github.com/drizzle-team/drizzle-orm/issues/1869)

- [\[BUG\]: sql“ interpolates the wrong table name when used in extras](https://github.com/drizzle-team/drizzle-orm/issues/1815)

- [\[BUG\]: pg-native Pools don’t work with Transactions](https://github.com/drizzle-team/drizzle-orm/issues/1707)

- [\[BUG\]: Custom types not working in `with` queries](https://github.com/drizzle-team/drizzle-orm/issues/1572)

- [\[BUG\]: ERROR: operator does not exist](https://github.com/drizzle-team/drizzle-orm/issues/1570)

- [\[BUG\]:Property ‘notNull\` in the timstamp type](https://github.com/drizzle-team/drizzle-orm/issues/1535)

- [\[BUG\]: eq function is nor working in 0.29.0](https://github.com/drizzle-team/drizzle-orm/issues/1488)

- [\[BUG\]: does nesting with blocks has threshold with pg](https://github.com/drizzle-team/drizzle-orm/issues/1477)

- [\[FEATURE\]: infer possible undefined columns value if is a boolean (not specifically true or false)](https://github.com/drizzle-team/drizzle-orm/issues/1438)

- [\[BUG\]: ER_WRONG_AUTO_KEY - Drizzle Kit not detecting primary keys](https://github.com/drizzle-team/drizzle-orm/issues/1428)

- [\[BUG\]: Error: Multiple primary key defined](https://github.com/drizzle-team/drizzle-orm/issues/1413)

- [\[BUG\]: Unable to use orderBy clause on multiple relations when placed adjacently in a query (MySQL)](https://github.com/drizzle-team/drizzle-orm/issues/1396)

- [\[BUG\]: wrong typeHint when using relations (one and automatic limit: 1)](https://github.com/drizzle-team/drizzle-orm/issues/1368)

- [\[BUG\]: orderBy causes relational query to fail](https://github.com/drizzle-team/drizzle-orm/issues/1249)

- [\[BUG\]: `columns` partial select gives bad type with dynamic conditions](https://github.com/drizzle-team/drizzle-orm/issues/1163)

- [\[BUG\]: `mapWith` isn’t working on `extras` when doing relational queries with `findFirst` or `findMany`](https://github.com/drizzle-team/drizzle-orm/issues/1157)

- [\[BUG\]: `findFirst` and `findMany` isn’t correctly setting the table name when using sql directive](https://github.com/drizzle-team/drizzle-orm/issues/1149)

- [\[FEATURE\]: Add back filtering by nested relations in relational queries](https://github.com/drizzle-team/drizzle-orm/issues/1069)

- [\[FEATURE\]: Optional One-to-One Relation](https://github.com/drizzle-team/drizzle-orm/issues/1066)

- [\[FEATURE\]: Support Polymorphic Association](https://github.com/drizzle-team/drizzle-orm/issues/1051)

- [\[BUG\]: where clause on relational query overwrites the table name](https://github.com/drizzle-team/drizzle-orm/issues/975)

- [\[BUG\]: error: column “role” cannot be cast automatically to type user_role](https://github.com/drizzle-team/drizzle-orm/issues/930)

- [\[FEATURE\]: How much support for cockroachdb?](https://github.com/drizzle-team/drizzle-orm/issues/845)

- [\[BUG\]: Relations inferring incorrect table with non-default Postgres schema](https://github.com/drizzle-team/drizzle-orm/issues/830)

- [\[FEATURE\]: Filtered & ordered relationships](https://github.com/drizzle-team/drizzle-orm/issues/821)

- [\[BUG\]: Relational queries break customTypes with underlying DECIMAL dataTypes](https://github.com/drizzle-team/drizzle-orm/issues/820)

- [\[BUG\]: Column with custom type not working with `default()`](https://github.com/drizzle-team/drizzle-orm/issues/818)

- [\[BUG\]: Can’t use views with relations API](https://github.com/drizzle-team/drizzle-orm/issues/769)

- [\[FEATURE\]: Add extra conditions to the joins](https://github.com/drizzle-team/drizzle-orm/issues/756)

- [\[BUG\]: Drizzle is bloating indexes on MySQL](https://github.com/drizzle-team/drizzle-orm/issues/706)

- [\[BUG\]: Relational query on sqlite/d1 with order-by has issues](https://github.com/drizzle-team/drizzle-orm/issues/705)

- Allow referencing deeply nested properties in relational queries

- [\[FEATURE\]: Customizable many relations](https://github.com/drizzle-team/drizzle-orm/issues/674)

- [\[FEATURE\]: “through” relation queries](https://github.com/drizzle-team/drizzle-orm/issues/607)

- [\[FEATURE\]: MSSQL dialect](https://github.com/drizzle-team/drizzle-orm/issues/585)

- [\[BUG\]: planetscale - now() and current_timestamp() doesn’t work when FSP is specified for timestamp](https://github.com/drizzle-team/drizzle-orm/issues/472)

- [\[BUG\]: MySQL alter table fails where tablename is reserved word](https://github.com/drizzle-team/drizzle-orm/issues/364)

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-kit-v0232

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

Drizzle Kit v0.23.2 release

Aug 5, 2024

- Fixed a bug in PostgreSQL with push and introspect where the `schemaFilter` object was passed. It was detecting enums even in schemas that were not defined in the schemaFilter.
- Fixed the `drizzle-kit up` command to work as expected, starting from the sequences release.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0322

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.32.2 release

Aug 5, 2024

- Fix AWS Data API type hints bugs in RQB
- Fix set transactions in MySQL bug
- Add forwaring dependencies within useLiveQuery, fixes #2651
- Export additional types from SQLite package, like `AnySQLiteUpdate`

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0321

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.32.1 release

Jul 23, 2024

- Fix typings for indexes and allow creating indexes on 3+ columns mixing columns and expressions
- Added support for “limit 0” in all dialects - closes #2011
- Make inArray and notInArray accept empty list, closes #1295
- fix typo in lt typedoc
- fix wrong example in README.md

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0320

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.32.0 release

Jul 10, 2024

## New Features

### 🎉 MySQL `$returningId()` function

MySQL itself doesn’t have native support for `RETURNING` after using `INSERT`. There is only one way to do it for `primary keys` with `autoincrement` (or `serial`) types, where you can access `insertId` and `affectedRows` fields. We’ve prepared an automatic way for you to handle such cases with Drizzle and automatically receive all inserted IDs as separate objects

import { boolean, int, text, mysqlTable } from 'drizzle-orm/mysql-core';

const usersTable = mysqlTable('users', {
id: int('id').primaryKey(),
name: text('name').notNull(),
verified: boolean('verified').notNull().default(false),
});

const result = await db.insert(usersTable).values([{ name: 'John' }, { name: 'John1' }]).$returningId();
// ^? { id: number }[]

Also with Drizzle, you can specify a `primary key` with `$default` function that will generate custom primary keys at runtime. We will also return those generated keys for you in the `$returningId()` call

import { varchar, text, mysqlTable } from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

const usersTableDefFn = mysqlTable('users_default_fn', {
customId: varchar('id', { length: 256 }).primaryKey().$defaultFn(createId),
name: text('name').notNull(),
});

const result = await db.insert(usersTableDefFn).values([{ name: 'John' }, { name: 'John1' }]).$returningId();
// ^? { customId: string }[]

### 🎉 PostgreSQL Sequences

You can now specify sequences in Postgres within any schema you need and define all the available properties

##### **Example**

import { pgSchema, pgSequence } from "drizzle-orm/pg-core";

// No params specified
export const customSequence = pgSequence("name");

// Sequence with params
export const customSequence = pgSequence("name", {
startWith: 100,
maxValue: 10000,
minValue: 100,
cycle: true,
cache: 10,
increment: 2
});

// Sequence in custom schema
export const customSchema = pgSchema('custom_schema');

export const customSequence = customSchema.sequence("name");

### 🎉 PostgreSQL Identity Columns

Source: As mentioned, the `serial` type in Postgres is outdated and should be deprecated. Ideally, you should not use it. `Identity columns` are the recommended way to specify sequences in your schema, which is why we are introducing the `identity columns` feature

##### **Example**

import { pgTable, integer, text } from 'drizzle-orm/pg-core'

export const ingredients = pgTable("ingredients", {
id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
name: text("name").notNull(),
description: text("description"),
});

You can specify all properties available for sequences in the `.generatedAlwaysAsIdentity()` function. Additionally, you can specify custom names for these sequences

PostgreSQL docs reference.

### 🎉 PostgreSQL Generated Columns

You can now specify generated columns on any column supported by PostgreSQL to use with generated columns

import { SQL, sql } from "drizzle-orm";
import { customType, index, integer, pgTable, text } from "drizzle-orm/pg-core";

dataType() {
return "tsvector";
},
});

export const test = pgTable(
"test",
{
id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
content: text("content"),
contentSearch: tsVector("content_search", {
dimensions: 3,
}).generatedAlwaysAs(

),
},

idx: index("idx_content_search").using("gin", t.contentSearch),
})
);

In case you don’t need to reference any columns from your table, you can use just `sql` template or a `string`

export const users = pgTable("users", {
id: integer("id"),
name: text("name"),
generatedName: text("gen_name").generatedAlwaysAs(sql`hello world!`),
generatedName1: text("gen_name1").generatedAlwaysAs("hello world!"),
}),

### 🎉 MySQL Generated Columns

You can now specify generated columns on any column supported by MySQL to use with generated columns

You can specify both `stored` and `virtual` options, for more info you can check MySQL docs

Also MySQL has a few limitation for such columns usage, which is described here

Drizzle Kit will also have limitations for `push` command:

1. You can’t change the generated constraint expression and type using `push`. Drizzle-kit will ignore this change. To make it work, you would need to `drop the column`, `push`, and then `add a column with a new expression`. This was done due to the complex mapping from the database side, where the schema expression will be modified on the database side and, on introspection, we will get a different string. We can’t be sure if you changed this expression or if it was changed and formatted by the database. As long as these are generated columns and `push` is mostly used for prototyping on a local database, it should be fast to `drop` and `create` generated columns. Since these columns are `generated`, all the data will be restored

2. `generate` should have no limitations

##### **Example**

export const users = mysqlTable("users", {
id: int("id"),
id2: int("id2"),
name: text("name"),
generatedName: text("gen_name").generatedAlwaysAs(

{ mode: "stored" }
),
generatedName1: text("gen_name1").generatedAlwaysAs(

{ mode: "virtual" }
),
}),

In case you don’t need to reference any columns from your table, you can use just `sql` template or a `string` in `.generatedAlwaysAs()`

### 🎉 SQLite Generated Columns

You can now specify generated columns on any column supported by SQLite to use with generated columns

You can specify both `stored` and `virtual` options, for more info you can check SQLite docs

Also SQLite has a few limitation for such columns usage, which is described here

Drizzle Kit will also have limitations for `push` and `generate` command:

1. You can’t change the generated constraint expression with the stored type in an existing table. You would need to delete this table and create it again. This is due to SQLite limitations for such actions. We will handle this case in future releases (it will involve the creation of a new table with data migration).

2. You can’t add a `stored` generated expression to an existing column for the same reason as above. However, you can add a `virtual` expression to an existing column.

3. You can’t change a `stored` generated expression in an existing column for the same reason as above. However, you can change a `virtual` expression.

4. You can’t change the generated constraint type from `virtual` to `stored` for the same reason as above. However, you can change from `stored` to `virtual`.

## New Drizzle Kit features

### 🎉 Migrations support for all the new orm features

PostgreSQL sequences, identity columns and generated columns for all dialects

### 🎉 New flag `--force` for `drizzle-kit push`

You can auto-accept all data-loss statements using the push command. It’s only available in CLI parameters. Make sure you always use it if you are fine with running data-loss statements on your database

### 🎉 New `migrations` flag `prefix`

You can now customize migration file prefixes to make the format suitable for your migration tools:

- `index` is the default type and will result in `0001_name.sql` file names;
- `supabase` and `timestamp` are equal and will result in `20240627123900_name.sql` file names;
- `unix` will result in unix seconds prefixes `1719481298_name.sql` file names;
- `none` will omit the prefix completely;

##### **Example**: Supabase migrations format

import { defineConfig } from "drizzle-kit";

export default defineConfig({
dialect: "postgresql",
migrations: {
prefix: 'supabase'
}
});

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0313

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.31.3 release

Jul 8, 2024

### Bug fixed

- 🛠️ Fixed RQB behavior for tables with same names in different schemas
- 🛠️ Fixed \[BUG\]: Mismatched type hints when using RDS Data API - #2097

### New Prisma-Drizzle extension

import { PrismaClient } from '@prisma/client';
import { drizzle } from 'drizzle-orm/prisma/pg';
import { User } from './drizzle';

const prisma = new PrismaClient().$extends(drizzle());
const users = await prisma.$drizzle.select().from(User);

For more info, check docs: /docs/prisma

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0314

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.31.4 release

Jul 8, 2024

- Mark prisma clients package as optional - thanks @Cherry

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0312

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.31.2 release

Jun 7, 2024

- 🎉 Added support for TiDB Cloud Serverless driver:

import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';

const client = connect({ url: '...' });
const db = drizzle(client);
await db.select().from(...);

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0311

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.31.1 release

Jun 4, 2024

# New Features

As of `v0.31.1` Drizzle ORM now has native support for Expo SQLite Live Queries!
We’ve implemented a native `useLiveQuery` React Hook which observes necessary database changes and automatically re-runs database queries. It works with both SQL-like and Drizzle Queries:

import { useLiveQuery, drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { users } from './schema';
import { Text } from 'react-native';

const expo = openDatabaseSync('db.db', { enableChangeListener: true }); // <-- enable change listeners
const db = drizzle(expo);

// Re-renders automatically when data changes
const { data } = useLiveQuery(db.select().from(users));

// const { data, error, updatedAt } = useLiveQuery(db.query.users.findFirst());
// const { data, error, updatedAt } = useLiveQuery(db.query.users.findMany());

};

export default App;

We’ve intentionally not changed the API of ORM itself to stay with conventional React Hook API, so we have `useLiveQuery(databaseQuery)` as opposed to `db.select().from(users).useLive()` or `db.query.users.useFindMany()`

We’ve also decided to provide `data`, `error` and `updatedAt` fields as a result of hook for concise explicit error handling following practices of `React Query` and `Electric SQL`

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0310

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.31.0 release

May 31, 2024

### PostgreSQL indexes API was changed

The previous Drizzle+PostgreSQL indexes API was incorrect and was not aligned with the PostgreSQL documentation. The good thing is that it was not used in queries, and drizzle-kit didn’t support all properties for indexes. This means we can now change the API to the correct one and provide full support for it in drizzle-kit

Previous API

- No way to define SQL expressions inside `.on`.
- `.using` and `.on` in our case are the same thing, so the API is incorrect here.
- `.asc()`, `.desc()`, `.nullsFirst()`, and `.nullsLast()` should be specified for each column or expression on indexes, but not on an index itself.

// Index declaration reference
index('name')
.on(table.column1, table.column2, ...) or .onOnly(table.column1, table.column2, ...)
.concurrently()
.using(sql`) // sql expression
.asc() or .desc()
.nullsFirst() or .nullsLast()
.where(sql`) // sql expression

Current API

// First example, with `.on()`
index('name')
.on(table.column1.asc(), table.column2.nullsFirst(), ...) or .onOnly(table.column1.desc().nullsLast(), table.column2, ...)
.concurrently()
.where(sql``)
.with({ fillfactor: '70' })

// Second Example, with `.using()`
index('name')
.using('btree', table.column1.asc(), sql`lower(${table.column2})`, table.column1.op('text_ops'))
.where(sql``) // sql expression
.with({ fillfactor: '70' })

## New Features

You can now specify indexes for `pg_vector` and utilize `pg_vector` functions for querying, ordering, etc.

Let’s take a few examples of `pg_vector` indexes from the `pg_vector` docs and translate them to Drizzle

#### L2 distance, Inner product and Cosine distance

// CREATE INDEX ON items USING hnsw (embedding vector_l2_ops);
// CREATE INDEX ON items USING hnsw (embedding vector_ip_ops);
// CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);

const table = pgTable('items', {
embedding: vector('embedding', { dimensions: 3 })

l2: index('l2_index').using('hnsw', table.embedding.op('vector_l2_ops'))
ip: index('ip_index').using('hnsw', table.embedding.op('vector_ip_ops'))
cosine: index('cosine_index').using('hnsw', table.embedding.op('vector_cosine_ops'))
}))

#### L1 distance, Hamming distance and Jaccard distance - added in pg_vector 0.7.0 version

// CREATE INDEX ON items USING hnsw (embedding vector_l1_ops);
// CREATE INDEX ON items USING hnsw (embedding bit_hamming_ops);
// CREATE INDEX ON items USING hnsw (embedding bit_jaccard_ops);

const table = pgTable('table', {
embedding: vector('embedding', { dimensions: 3 })

l1: index('l1_index').using('hnsw', table.embedding.op('vector_l1_ops'))
hamming: index('hamming_index').using('hnsw', table.embedding.op('bit_hamming_ops'))
bit: index('bit_jaccard_index').using('hnsw', table.embedding.op('bit_jaccard_ops'))
}))

For queries, you can use predefined functions for vectors or create custom ones using the SQL template operator.

You can also use the following helpers:

import { l2Distance, l1Distance, innerProduct,
cosineDistance, hammingDistance, jaccardDistance } from 'drizzle-orm'

If `pg_vector` has some other functions to use, you can replicate implimentation from existing one we have. Here is how it can be done

export function l2Distance(
column: SQLWrapper | AnyColumn,

): SQL {

}

Name it as you wish and change the operator. This example allows for a numbers array, strings array, string, or even a select query. Feel free to create any other type you want or even contribute and submit a PR

#### Examples

Let’s take a few examples of `pg_vector` queries from the `pg_vector` docs and translate them to Drizzle

import { l2Distance } from 'drizzle-orm';

db.select().from(items).orderBy(l2Distance(items.embedding, [3,1,2]))

db.select({ distance: l2Distance(items.embedding, [3,1,2]) })

const subquery = db.select({ embedding: items.embedding }).from(items).where(eq(items.id, 1));
db.select().from(items).orderBy(l2Distance(items.embedding, subquery)).limit(5)

db.select({ innerProduct: sql`(${maxInnerProduct(items.embedding, [3,1,2])}) * -1` }).from(items)

// and more!

## 🎉 New PostgreSQL types: `point`, `line`

You can now use `point` and `line` from PostgreSQL Geometric Types

Type `point` has 2 modes for mappings from the database: `tuple` and `xy`.

- `tuple` will be accepted for insert and mapped on select to a tuple. So, the database Point(1,2) will be typed as \[1,2\] with drizzle.

- `xy` will be accepted for insert and mapped on select to an object with x, y coordinates. So, the database Point(1,2) will be typed as `{ x: 1, y: 2 }` with drizzle

const items = pgTable('items', {
point: point('point'),
pointObj: point('point_xy', { mode: 'xy' }),
});

Type `line` has 2 modes for mappings from the database: `tuple` and `abc`.

- `tuple` will be accepted for insert and mapped on select to a tuple. So, the database Line3 will be typed as \[1,2,3\] with drizzle.

- `abc` will be accepted for insert and mapped on select to an object with a, b, and c constants from the equation `Ax + By + C = 0`. So, the database Line3 will be typed as `{ a: 1, b: 2, c: 3 }` with drizzle.

const items = pgTable('items', {
line: line('line'),
lineObj: line('line_abc', { mode: 'abc' }),
});

`geometry` type from postgis extension:

const items = pgTable('items', {
geo: geometry('geo', { type: 'point' }),
geoObj: geometry('geo_obj', { type: 'point', mode: 'xy' }),
geoSrid: geometry('geo_options', { type: 'point', mode: 'xy', srid: 4000 }),
});

**mode**
Type `geometry` has 2 modes for mappings from the database: `tuple` and `xy`.

- `tuple` will be accepted for insert and mapped on select to a tuple. So, the database geometry will be typed as \[1,2\] with drizzle.
- `xy` will be accepted for insert and mapped on select to an object with x, y coordinates. So, the database geometry will be typed as `{ x: 1, y: 2 }` with drizzle

**type**

The current release has a predefined type: `point`, which is the `geometry(Point)` type in the PostgreSQL PostGIS extension. You can specify any string there if you want to use some other type

### 🎉 Support for new types

Drizzle Kit can now handle:

- `point` and `line` from PostgreSQL
- `vector` from the PostgreSQL `pg_vector` extension
- `geometry` from the PostgreSQL `PostGIS` extension

### 🎉 New param in drizzle.config - `extensionsFilters`

The PostGIS extension creates a few internal tables in the `public` schema. This means that if you have a database with the PostGIS extension and use `push` or `introspect`, all those tables will be included in `diff` operations. In this case, you would need to specify `tablesFilter`, find all tables created by the extension, and list them in this parameter.

We have addressed this issue so that you won’t need to take all these steps. Simply specify `extensionsFilters` with the name of the extension used, and Drizzle will skip all the necessary tables.

Currently, we only support the `postgis` option, but we plan to add more extensions if they create tables in the `public` schema.

The `postgis` option will skip the `geography_columns`, `geometry_columns`, and `spatial_ref_sys` tables

import { defineConfig } from 'drizzle-kit'

export default defaultConfig({
dialect: "postgresql",
extensionsFilters: ["postgis"],
})

## Improvements

### Update zod schemas for database credentials and write tests to all the positive/negative cases

- support full set of SSL params in kit config, provide types from node:tls connection

export default defaultConfig({
dialect: "postgresql",
dbCredentials: {
ssl: true, //"require" | "allow" | "prefer" | "verify-full" | options from node:tls
}
})
import { defineConfig } from 'drizzle-kit'

export default defaultConfig({
dialect: "mysql",
dbCredentials: {
ssl: "", // string | SslOptions (ssl options from mysql2 package)
}
})

### Normilized SQLite urls for `libsql` and `better-sqlite3` drivers

Those drivers have different file path patterns, and Drizzle Kit will accept both and create a proper file path format for each

### Updated MySQL and SQLite index-as-expression behavior

In this release MySQL and SQLite will properly map expressions into SQL query. Expressions won’t be escaped in string but columns will be

export const users = sqliteTable(
'users',
{
id: integer('id').primaryKey(),
email: text('email').notNull(),
},

emailUniqueIndex: uniqueIndex('emailUniqueIndex').on(sql`lower(${table.email})`),
}),
);
-- before
CREATE UNIQUE INDEX `emailUniqueIndex` ON `users` (`lower("users"."email")`);

-- now
CREATE UNIQUE INDEX `emailUniqueIndex` ON `users` (lower("email"));

## Bug Fixes

- \[BUG\]: multiple constraints not added (only the first one is generated) - #2341
- Drizzle Studio: Error: Connection terminated unexpectedly - #435
- Unable to run sqlite migrations local - #432
- error: unknown option ‘—config’ - #423

## How `push` and `generate` works for indexes

#### You should specify a name for your index manually if you have an index on at least one expression

Example

index().on(table.id, table.email) // will work well and name will be autogeneretaed
index('my_name').on(table.id, table.email) // will work well

// but

index().on(sql`lower(${table.email})`) // error
index('my_name').on(sql`lower(${table.email})`) // will work well

#### Push won’t generate statements if these fields(list below) were changed in an existing index:

- expressions inside `.on()` and `.using()`
- `.where()` statements
- operator classes `.op()` on columns

If you are using `push` workflows and want to change these fields in the index, you would need to:

- Comment out the index
- Push
- Uncomment the index and change those fields
- Push again

For the `generate` command, `drizzle-kit` will be triggered by any changes in the index for any property in the new drizzle indexes API, so there are no limitations here.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v03010

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.10 release

May 1, 2024

## New Features

#### Select all posts with views greater than 100

async function someFunction(views = 0) {
await db
.select()
.from(posts)

}

## Bug Fixes

- Fixed internal mappings for sessions `.all`, `.values`, `.execute` functions in AWS DataAPI

Read get started guide with AWS DataAPI in the documentation.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0309

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.9 release

Apr 22, 2024

## New Features

- Added `setWhere` and `targetWhere` fields to `.onConflictDoUpdate()` config in SQLite instead of single `where` field:

await db.insert(employees)
.values({ employeeId: 123, name: 'John Doe' })
.onConflictDoUpdate({
target: employees.employeeId,

set: { name: sql`excluded.name` }
});

await db.insert(employees)
.values({ employeeId: 123, name: 'John Doe' })
.onConflictDoUpdate({
target: employees.employeeId,
set: { name: 'John Doe' },

});

Read more about `.onConflictDoUpdate()` method here.

- 🛠️ Added schema information to Drizzle instances via `db._.fullSchema`

## Fixes

- Fixed migrator in AWS Data API

To get started with Drizzle and AWS Data API follow the documentation.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0308

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.8 release

Apr 11, 2024

## New Features

- Added custom schema support to enums in Postgres (fixes #669 via #2048):

import { pgSchema } from 'drizzle-orm/pg-core';

const mySchema = pgSchema('mySchema');
const colors = mySchema.enum('colors', ['red', 'green', 'blue']);

Learn more about Postgres schemas and enums.

## Fixes

- Changed D1 `migrate()` function to use batch API ( #2137)

To get started with Drizzle and D1 follow the documentation.

- Split `where` clause in Postgres `.onConflictDoUpdate` method into `setWhere` and `targetWhere` clauses, to support both `where` cases in `on conflict ...` clause (fixes #1628, #1302 via #2056).

await db.insert(employees)
.values({ employeeId: 123, name: 'John Doe' })
.onConflictDoUpdate({
target: employees.employeeId,

set: { name: sql`excluded.name` }
});

await db.insert(employees)
.values({ employeeId: 123, name: 'John Doe' })
.onConflictDoUpdate({
target: employees.employeeId,
set: { name: 'John Doe' },

});

Learn more about `.onConflictDoUpdate` method here.

- Fixed query generation for `where` clause in Postgres `.onConflictDoNothing` method, as it was placed in a wrong spot (fixes #1628 via #2056).

Learn more about `.onConflictDoNothing` method here.

- Fixed multiple issues with AWS Data API driver (fixes #1931, #1932, #1934, #1936 via #2119)
- Fix inserting and updating array values in AWS Data API (fixes #1912 via #1911)

To get started with Drizzle and AWS Data API follow the documentation.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0307

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.7 release

Apr 3, 2024

## Fixes

- Add mappings for `@vercel/postgres` package

Read more about Vercel Postgres here. To get started with Drizzle and Vercel Postgres follow the documentation.

- Fix interval mapping for `neon` drivers - #1542

Read more about Neon here. To get started with Drizzle and Neon follow the documentation.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0306

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.6 release

Mar 28, 2024

## New Features

### PGlite driver Support

PGlite is a WASM Postgres build packaged into a TypeScript client library that enables you to run Postgres in the browser, Node.js and Bun, with no need to install any other dependencies. It is only 2.6mb gzipped.

It can be used as an ephemeral in-memory database, or with persistence either to the file system (Node/Bun) or indexedDB (Browser).

Unlike previous “Postgres in the browser” projects, PGlite does not use a Linux virtual machine - it is simply Postgres in WASM.

Read get started with Drizzle and PGlite guide here.

Usage Example

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { users } from './schema';

// In-memory Postgres
const client = new PGlite();
const db = drizzle(client);

await db.select().from(users);

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0305

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.5 release

Mar 27, 2024

## New Features

### `$onUpdate` functionality for PostgreSQL, MySQL and SQLite

Adds a dynamic update value to the column.
The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.

const usersOnUpdate = pgTable('users_on_update', {
id: serial('id').primaryKey(),
name: text('name').notNull(),

});

## Fixes

- Insertions on columns with the smallserial datatype are not optional - #1848

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0304

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.4 release

Mar 19, 2024

## New Features

### 🎉 xata-http driver support

According their **official website**, Xata is a Postgres data platform with a focus on reliability, scalability, and developer experience. The Xata Postgres service is currently in beta, please see the Xata docs on how to enable it in your account.

Drizzle ORM natively supports both the `xata` driver with `drizzle-orm/xata` package and the **`postgres`** or **`pg`** drivers for accessing a Xata Postgres database.

The following example use the Xata generated client, which you obtain by running the xata init CLI command.

npm

yarn

pnpm

bun

npm i drizzle-orm @xata.io/client
npm i -D drizzle-kit
yarn add drizzle-orm @xata.io/client
yarn add -D drizzle-kit
pnpm add drizzle-orm @xata.io/client
pnpm add -D drizzle-kit
bun add drizzle-orm @xata.io/client
bun add -D drizzle-kit
import { drizzle } from 'drizzle-orm/xata-http';
import { getXataClient } from './xata'; // Generated client

const xata = getXataClient();
const db = drizzle(xata);

const result = await db.select().from(...);

You can also connect to Xata using `pg` or `postgres.js` drivers

To get started with Xata and Drizzle follow the documentation.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0303

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.3 release

Mar 19, 2024

## New Features

- Added raw query support (`db.execute(...)`) to batch API in Neon HTTP driver

To get started with Neon and Drizzle follow the documentation

## Fixes

- Fixed `@neondatabase/serverless` HTTP driver types issue ( #1945, neondatabase/serverless#66)
- Fixed sqlite-proxy driver `.run()` result

To get started with SQLite proxy driver and Drizzle follow the documentation

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0302

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.2 release

Mar 14, 2024

## Improvements

To get started with Turso and Drizzle follow the documentation

## Fixes

- \[Sqlite\] Fix findFirst query for bun:sqlite ( #1885)

To get started with Bun SQLite and Drizzle follow the documentation

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0301

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.1 release

Mar 8, 2024

## New Features

### 🎉 OP-SQLite driver Support

Usage Example

import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';

const opsqlite = open({
name: 'myDB',
});

const db = drizzle(opsqlite);

await db.select().from(users);

For more usage and setup details, please check our op-sqlite docs

## Fixes

- Migration hook fixed for Expo driver

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0300

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.30.0 release

Mar 7, 2024

## Breaking Changes

The Postgres timestamp mapping has been changed to align all drivers with the same behavior.

❗ We’ve modified the `postgres.js` driver instance to always return strings for dates, and then Drizzle will provide you with either strings of mapped dates, depending on the selected `mode`. The only issue you may encounter is that once you provide the \`postgres.js“ driver instance inside Drizzle, the behavior of this object will change for dates, which will always be strings.

We’ve made this change as a minor release, just as a warning, that:

- If you were using timestamps and were waiting for a specific response, the behavior will now be changed.
  When mapping to the driver, we will always use `.toISOString` for both timestamps with timezone and without timezone.

- If you were using the `postgres.js` driver outside of Drizzle, all `postgres.js` clients passed to Drizzle will have mutated behavior for dates. All dates will be strings in the response.

Parsers that were changed for `postgres.js`.

// Override postgres.js default date parsers:
for (const type of ['1184', '1082', '1083', '1114']) {
client.options.parsers[type as any] = transparentParser;
client.options.serializers[type as any] = transparentParser;
}

Ideally, as is the case with almost all other drivers, we should have the possibility to mutate mappings on a per-query basis, which means that the driver client won’t be mutated. We will be reaching out to the creator of the `postgres.js` library to inquire about the possibility of specifying per-query mapping interceptors and making this flow even better for all users.

If we’ve overlooked this capability and it is already available with \`postgres.js“, please ping us in our Discord!

A few more references for timestamps without and with timezones can be found in our docs

Check docs for getting started with `postgres.js` driver and Drizzle here

## Fixes

- timestamp with mode string is returned as Date object instead of string - ( #806)
- Dates are always dates ( #971)
- Inconsistencies when working with timestamps and corresponding datetime objects in javascript. ( #1176)
- timestamp columns showing string type, however actually returning a Date object. ( #1185)
- Wrong data type for postgres date colum ( #1407)
- invalid timestamp conversion when using PostgreSQL with TimeZone set to UTC ( #1587)
- Postgres insert into timestamp with time zone removes milliseconds ( #1061)
- update timestamp field (using AWS Data API) ( #1164)
- Invalid date from relational queries ( #895)

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0295

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.29.5 release

Mar 6, 2024

## New Features

### 🎉 WITH UPDATE, WITH DELETE, WITH INSERT

You can now use `WITH` statements with INSERT, UPDATE and DELETE statements

Usage examples

const averageAmount = db.$with('average_amount').as(
db.select({ value: sql`avg(${orders.amount})`.as('value') }).from(orders),
);

const result = await db
.with(averageAmount)
.delete(orders)
.where(gt(orders.amount, sql`(select * from ${averageAmount})`))
.returning({
id: orders.id,
});
with "average_amount" as (select avg("amount") as "value" from "orders")
delete from "orders"

returning "id";

For more examples for all statements, check docs:

- with insert docs
- with update docs
- with delete docs

### 🎉 Possibility to specify custom schema and custom name for migrations table

- **Custom table for migrations**

By default, all information about executed migrations will be stored in the database inside the `__drizzle_migrations` table,
and for PostgreSQL, inside the `drizzle` schema. However, you can configure where to store those records.

To add a custom table name for migrations stored inside your database, you should use the `migrationsTable` option

Usage example

await migrate(db, {
migrationsFolder: './drizzle',
migrationsTable: 'my_migrations',
});

To add a custom schema name for migrations stored inside your database, you should use the `migrationsSchema` option

await migrate(db, {
migrationsFolder: './drizzle',
migrationsSchema: 'custom',
});

### 🎉 SQLite Proxy bacth and Relational Queries support

You can find more information about SQLite proxy in docs.

- You can now use `.query.findFirst` and `.query.findMany` syntax with sqlite proxy driver

- SQLite Proxy supports batch requests, the same as it’s done for all other drivers. Check full docs

You will need to specify a specific callback for batch queries and handle requests to proxy server:

import { drizzle } from 'drizzle-orm/sqlite-proxy';

type ResponseType = { rows: any[][] | any[] }[];

const db = drizzle(

// single query logic
},
// new batch callback
async (
queries: {
sql: string;
params: any[];
method: 'all' | 'run' | 'get' | 'values';
}[],

try {
const result: ResponseType = await axios.post(
'http://localhost:3000/batch',
{ queries },
);

return result;
} catch (e: any) {
console.error('Error from sqlite proxy server:', e);
throw e;
}
},
);

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0294

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.29.4 release

Feb 22, 2024

## New Features

### 🎉 Neon HTTP Batch

For more info you can check Neon docs and Get started with Neon and Drizzle.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { usersTable } from './schema';

const sql = neon(process.env.DRIZZLE_DATABASE_URL!);
const db = drizzle(sql);

const batchResponse: BatchType = await db.batch([\
db.insert(usersTable).values({ id: 1, name: 'John' }).returning({\
id: usersTable.id,\
}),\
db.insert(usersTable).values({ id: 2, name: 'Dan' }),\
db.query.usersTable.findMany({}),\
db.query.usersTable.findFirst({}),\
]);
type BatchType = [\
{\
id: number;\
}[],\

{\
id: number;\
name: string;\
verified: number;\
invitedBy: number | null;\
}[],\
{\
id: number;\
name: string;\
verified: number;\
invitedBy: number | null;\
} | undefined,\
];

## Improvements

Thanks to the `database-js` and `PlanetScale` teams, we have updated the default behavior and instances of `database-js`.

As suggested by the `database-js` core team, you should use the `Client` instance instead of `connect()`:

import { Client } from '@planetscale/database';
import { drizzle } from 'drizzle-orm/planetscale-serverless';

// create the connection
const client = new Client({
host: process.env['DATABASE_HOST'],
username: process.env['DATABASE_USERNAME'],
password: process.env['DATABASE_PASSWORD'],
});

const db = drizzle(client);

> We suggest starting to change connections to PlanetScale now to prevent any runtime errors in the future.

Previously our docs stated to use `connect()` and only this function was can be passed to drizzle. In this realase we are adding support for `new Client()` and deprecating `connect()`, by suggesting from `database-js` team. In this release you will see a `warning` when trying to pass `connect()` function result:

**Warning text**

Warning: You need to pass an instance of Client:

import { Client } from "@planetscale/database";

const client = new Client({
host: process.env["DATABASE_HOST"],
username: process.env["DATABASE_USERNAME"],
password: process.env["DATABASE_PASSWORD"],
});

Starting from version 0.30.0, you will encounter an error if you attempt to use anything other than a Client instance.

Please make the necessary changes now to prevent any runtime errors in the future

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0293

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.29.3 release

Jan 2, 2024

## Fixes:

- Make expo peer dependencies optional ( #1714)

For more info you can check Expo docs and Get started with Expo SQLite and Drizzle.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0292

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.29.2 release

Dec 25, 2023

## Fixes:

- Added improvements to the planescale relational tests ( #1579)
- FIX: correct string escaping for empty PgArrays ( #1640)
- Fix wrong syntax for exists fn in sqlite ( #1647)
- Properly handle dates in AWS Data API
- Fix Hermes mixins constructor issue

## ESLint Drizzle Plugin, v0.2.3

npm i eslint-plugin-drizzle@0.2.3

🎉 \[ESLint\] Add support for functions and improve error messages

- Allowed Drizzle object to be or to be retrieved from a function, e.g.
- Added better context to the suggestion in the error message.

For more info you can check docs

## New Drivers

**🎉 Expo SQLite Driver is available**

For starting with Expo SQLite Driver, you need to install `expo-sqlite` and `drizzle-orm` packages.

npm install drizzle-orm expo-sqlite@next

Then, you can use it like this:

import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

const expoDb = openDatabaseSync("db.db");

const db = drizzle(expoDb);

await db.select().from(...)...

// or

db.select().from(...).then(...);

db.select().from(...).all();

If you want to use Drizzle Migrations, you need to update babel and metro configuration files.

1. Install `babel-plugin-inline-import` package.

npm install babel-plugin-inline-import

2. Update `babel.config.js` and `metro.config.js` files.

module.exports = function(api) {
api.cache(true);

return {
presets: ['babel-preset-expo'],

- plugins: [["inline-import", { "extensions": [".sql"] }]]
  };
  };
  const { getDefaultConfig } = require('expo/metro-config');

/\*_ @type {import('expo/metro-config').MetroConfig} _/
const config = getDefaultConfig(\_\_dirname);

+config.resolver.sourceExts.push('sql');

module.exports = config;

3. Create `drizzle.config.ts` file in your project root folder.

import type { Config } from 'drizzle-kit';

export default {
schema: './db/schema.ts',
out: './drizzle',
dialect: 'sqlite',
driver: 'expo',
} satisfies Config;

After creating schema file and drizzle.config.ts file, you can generate migrations like this:

npx drizzle-kit generate

Then you need to import `migrations.js` file in your `App.tsx` file from `./drizzle` folder and use hook `useMigrations` or `migrate` function.

import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './drizzle/migrations';

export default function App() {
const { success, error } = useMigrations(db, migrations);

if (error) {
return (

}

if (!success) {
return (

return ...your application component;
}

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0291

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.29.1 release

Nov 29, 2023

## Fixes

- Forward args correctly when using withReplica feature ( #1536)
- Fix selectDistinctOn not working with multiple columns ( #1466)

## New Features/Helpers

### Detailed JSDoc for all query builders in all dialects

You can now access more information, hints, documentation links, etc. while developing and using JSDoc right in your IDE. Previously, we had them only for filter expressions, but now you can see them for all parts of the Drizzle query builder

Here is a list of functions and equivalent using `sql` template:

count

await db.select({ value: count() }).from(users);
await db.select({ value: count(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`count('*'))`.mapWith(Number)
}).from(users);
await db.select({
value: sql`count(${users.id})`.mapWith(Number)
}).from(users);

countDistinct

await db.select({ value: countDistinct(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`count(${users.id})`.mapWith(Number)
}).from(users);

avg

await db.select({ value: avg(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`avg(${users.id})`.mapWith(String)
}).from(users);

avgDistinct

await db.select({ value: avgDistinct(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`avg(distinct ${users.id})`.mapWith(String)
}).from(users);

sum

await db.select({ value: sum(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`sum(${users.id})`.mapWith(String)
}).from(users);

sumDistinct

await db.select({ value: sumDistinct(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`sum(distinct ${users.id})`.mapWith(String)
}).from(users);

max

await db.select({ value: max(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`max(${expression})`.mapWith(users.id)
}).from(users);

min

await db.select({ value: min(users.id) }).from(users);

// It's equivalent to writing
await db.select({
value: sql`min(${users.id})`.mapWith(users.id)
}).from(users);

To find more information check docs: aggregation helpers

## New Packages

### Drizzle ESLint Plugin

For cases where it’s impossible to perform type checks for specific scenarios, or where it’s possible but error messages would be challenging to understand, we’ve decided to create an ESLint package with recommended rules. This package aims to assist developers in handling crucial scenarios during development. For more information you can check docs.

### Install

npm

yarn

pnpm

bun

npm i eslint eslint-plugin-drizzle
yarn add eslint eslint-plugin-drizzle
pnpm add eslint eslint-plugin-drizzle
bun add eslint eslint-plugin-drizzle

You can install those packages for typescript support in your IDE

npm i @typescript-eslint/eslint-plugin @typescript-eslint/parser
yarn add @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add @typescript-eslint/eslint-plugin @typescript-eslint/parser
bun add @typescript-eslint/eslint-plugin @typescript-eslint/parser

### Usage

Create a `.eslintrc.yml` file, add `drizzle` to the `plugins`, and specify the rules you want to use. You can find a list of all existing rules below

root: true
parser: '@typescript-eslint/parser'
parserOptions:
project: './tsconfig.json'
plugins:

- drizzle
  rules:
  'drizzle/enforce-delete-with-where': "error"
  'drizzle/enforce-update-with-where': "error"

#### All config

This plugin exports an all config that makes use of all rules (except for deprecated ones).

root: true
extends:

- "plugin:drizzle/all"
  parser: '@typescript-eslint/parser'
  parserOptions:
  project: './tsconfig.json'
  plugins:
- drizzle

At the moment, `all` is equivalent to `recommended`

root: true
extends:

- "plugin:drizzle/recommended"
  parser: '@typescript-eslint/parser'
  parserOptions:
  project: './tsconfig.json'
  plugins:
- drizzle

### Rules

**enforce-delete-with-where**: Enforce using `delete` with `the.where()` clause in the `.delete()` statement. Most of the time, you don’t need to delete all rows in the table and require some kind of `WHERE` statements.

Error Message:

Without `.where(...)` you will delete all the rows in a table. If you didn't want to do it, please use `db.delete(...).where(...)` instead. Otherwise you can ignore this rule here

Optionally, you can define a `drizzleObjectName` in the plugin options that accept a `string` or `string[]`. This is useful when you have objects or classes with a delete method that’s not from Drizzle. Such a `delete` method will trigger the ESLint rule. To avoid that, you can define the name of the Drizzle object that you use in your codebase (like db) so that the rule would only trigger if the delete method comes from this object:

Example, config 1:

"rules": {
"drizzle/enforce-delete-with-where": ["error"]
}
class MyClass {
public delete() {
return {}
}
}

const myClassObj = new MyClass();

myClassObj.delete()

const db = drizzle(...)

db.delete()

Example, config 2:

"rules": {
"drizzle/enforce-delete-with-where": ["error", { "drizzleObjectName": ["db"] }],
}
class MyClass {
public delete() {
return {}
}
}

**enforce-update-with-where**: Enforce using `update` with `the.where()` clause in the `.update()` statement. Most of the time, you don’t need to update all rows in the table and require some kind of `WHERE` statements.

Without `.where(...)` you will update all the rows in a table. If you didn't want to do it, please use `db.update(...).set(...).where(...)` instead. Otherwise you can ignore this rule here

Optionally, you can define a `drizzleObjectName` in the plugin options that accept a `string` or `string[]`. This is useful when you have objects or classes with a delete method that’s not from Drizzle. Such as `update` method will trigger the ESLint rule. To avoid that, you can define the name of the Drizzle object that you use in your codebase (like db) so that the rule would only trigger if the delete method comes from this object:

"rules": {
"drizzle/enforce-update-with-where": ["error"]
}
class MyClass {
public update() {
return {}
}
}

myClassObj.update()

db.update()

"rules": {
"drizzle/enforce-update-with-where": ["error", { "drizzleObjectName": ["db"] }],
}
class MyClass {
public update() {
return {}
}
}

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0290

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.29.0 release

## New Features

### 🎉 MySQL `unsigned` option for bigint

You can now specify `bigint unsigned` type

const table = mysqlTable('table', {
id: bigint('id', { mode: 'number', unsigned: true }),
});

Read more in docs

### 🎉 Improved query builder types

Starting from `0.29.0` by default, as all the query builders in Drizzle try to conform to SQL as much as possible, you can only invoke most of the methods once. For example, in a SELECT statement there might only be one WHERE clause, so you can only invoke .where() once:

const query = db
.select()
.from(users)
.where(eq(users.id, 1))
.where(eq(users.name, 'John')); // ❌ Type error - where() can only be invoked once

This behavior is useful for conventional query building, i.e. when you create the whole query at once. However, it becomes a problem when you want to build a query dynamically, i.e. if you have a shared function that takes a query builder and enhances it. To solve this problem, Drizzle provides a special ‘dynamic’ mode for query builders, which removes the restriction of invoking methods only once. To enable it, you need to call .$dynamic() on a query builder.

Let’s see how it works by implementing a simple withPagination function that adds LIMIT and OFFSET clauses to a query based on the provided page number and an optional page size:

qb: T,
page: number,
pageSize: number = 10,
) {
return qb.limit(pageSize).offset(page \* pageSize);
}

const query = db.select().from(users).where(eq(users.id, 1));
withPagination(query, 1); // ❌ Type error - the query builder is not in dynamic mode

const dynamicQuery = query.$dynamic();
withPagination(dynamicQuery, 1); // ✅ OK

Note that the withPagination function is generic, which allows you to modify the result type of the query builder inside it, for example by adding a join:

return qb.leftJoin(friends, eq(friends.userId, users.id));
}

let query = db.select().from(users).where(eq(users.id, 1)).$dynamic();
query = withFriends(query);

### 🎉 Possibility to specify name for primary keys and foreign keys

There is an issue when constraint names exceed the 64-character limit of the database. This causes the database engine to truncate the name, potentially leading to issues. Starting from `0.29.0`, you have the option to specify custom names for both `primaryKey()` and `foreignKey()`. We have also deprecated the old `primaryKey()` syntax, which can still be used but will be removed in future releases

const table = pgTable('table', {
id: integer('id'),
name: text('name'),

cpk: primaryKey({ name: 'composite_key', columns: [table.id, table.name] }),
cfk: foreignKey({
name: 'fkName',
columns: [table.id],
foreignColumns: [table.name],
}),
}));

### 🎉 Read Replicas Support

You can now use the Drizzle `withReplica` function to specify different database connections for read replicas and the main instance for write operations. By default, `withReplicas` will use a random read replica for read operations and the main instance for all other data modification operations. You can also specify custom logic for choosing which read replica connection to use. You have the freedom to make any weighted, custom decision for that. Here are some usage examples:

const primaryDb = drizzle({ client });
const read1 = drizzle({ client });
const read2 = drizzle({ client });

const db = withReplicas(primaryDb, [read1, read2]);

// read from primary
db.$primary.select().from(usersTable);

// read from either read1 connection or read2 connection
db.select().from(usersTable)

// use primary database for delete operation
db.delete(usersTable).where(eq(usersTable.id, 1))

Implementation example of custom logic for selecting read replicas, where the first replica has a 70% chance of being chosen, and the second replica has a 30% chance of being chosen. Note that you can implement any type of random selection for read replicas

const weight = [0.7, 0.3];
let cumulativeProbability = 0;
const rand = Math.random();

for (const [i, replica] of replicas.entries()) {
cumulativeProbability += weight[i]!;
if (rand < cumulativeProbability) return replica;
}
return replicas[0]!
});

`withReplicas` function is available for all dialects in Drizzle ORM

### 🎉 Set operators support (UNION, UNION ALL, INTERSECT, INTERSECT ALL, EXCEPT, EXCEPT ALL)

Huge thanks to @Angelelz for the significant contribution he made, from API discussions to proper type checks and runtime logic, along with an extensive set of tests. This greatly assisted us in delivering this feature in this release

Usage examples:
All set operators can be used in a two ways: `import approach` or `builder approach`

// Import approach
import { union } from 'drizzle-orm/pg-core'

const allUsersQuery = db.select().from(users);
const allCustomersQuery = db.select().from(customers);

const result = await union(allUsersQuery, allCustomersQuery)
// Builder approach
const result = await db.select().from(users).union(db.select().from(customers));

### 🎉 New MySQL Proxy Driver

A new driver has been released, allowing you to create your own implementation for an HTTP driver using a MySQL database. You can find usage examples in the `./examples/mysql-proxy` folder

You need to implement two endpoints on your server that will be used for queries and migrations(Migrate endpoint is optional and only if you want to use drizzle migrations). Both the server and driver implementation are up to you, so you are not restricted in any way. You can add custom mappings, logging, and much more

You can find both server and driver implementation examples in the `./examples/mysql-proxy` folder

// Driver
import axios from 'axios';
import { eq } from 'drizzle-orm/expressions';
import { drizzle } from 'drizzle-orm/mysql-proxy';
import { migrate } from 'drizzle-orm/mysql-proxy/migrator';
import { cities, users } from './schema';

async function main() {

try {
const rows = await axios.post(`${process.env.REMOTE_DRIVER}/query`, {
sql,
params,
method,
});

return { rows: rows.data };
} catch (e: any) {
console.error('Error from pg proxy server:', e.response.data);
return { rows: [] };
}
});

try {
await axios.post(`${process.env.REMOTE_DRIVER}/migrate`, { queries });
} catch (e) {
console.log(e);
throw new Error('Proxy server cannot run migrations');
}
}, { migrationsFolder: 'drizzle' });

await db.insert(cities).values({ id: 1, name: 'name' });

await db.insert(users).values({
id: 1,
name: 'name',
email: 'email',
cityId: 1,
});

const usersToCityResponse = await db.select().from(users).leftJoin(
cities,
eq(users.cityId, cities.id),
);
}

### 🎉 New PostgreSQL Proxy Driver

Same as MySQL you can now implement your own http driver for PostgreSQL database. You can find usage examples in the `./examples/pg-proxy` folder

You need to implement two endpoints on your server that will be used for queries and migrations (Migrate endpoint is optional and only if you want to use drizzle migrations). Both the server and driver implementation are up to you, so you are not restricted in any way. You can add custom mappings, logging, and much more

You can find both server and driver implementation examples in the `./examples/pg-proxy` folder

import axios from 'axios';
import { eq } from 'drizzle-orm/expressions';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { migrate } from 'drizzle-orm/pg-proxy/migrator';
import { cities, users } from './schema';

try {
const rows = await axios.post(`${process.env.REMOTE_DRIVER}/query`, { sql, params, method });

try {
await axios.post(`${process.env.REMOTE_DRIVER}/query`, { queries });
} catch (e) {
console.log(e);
throw new Error('Proxy server cannot run migrations');
}
}, { migrationsFolder: 'drizzle' });

const insertedCity = await db.insert(cities).values({ id: 1, name: 'name' }).returning();
const insertedUser = await db.insert(users).values({ id: 1, name: 'name', email: 'email', cityId: 1 });
const usersToCityResponse = await db.select().from(users).leftJoin(cities, eq(users.cityId, cities.id));
}

### 🎉 `D1` Batch API support

Reference:

Batch API usage example:

const batchResponse = await db.batch([\
db.insert(usersTable).values({ id: 1, name: 'John' }).returning({\
id: usersTable.id,\
}),\
db.update(usersTable).set({ name: 'Dan' }).where(eq(usersTable.id, 1)),\
db.query.usersTable.findMany({}),\
db.select().from(usersTable).where(eq(usersTable.id, 1)),\
db.select({ id: usersTable.id, invitedBy: usersTable.invitedBy }).from(\
usersTable,\
),\
]);
type BatchResponse = [\
{\
id: number;\
}[],\
D1Result,\
{\
id: number;\
name: string;\
verified: number;\
invitedBy: number | null;\
}[],\
{\
id: number;\
name: string;\
verified: number;\
invitedBy: number | null;\
}[],\
{\
id: number;\
invitedBy: number | null;\
}[],\
];

All possible builders that can be used inside `db.batch`:

`db.all()`,
`db.get()`,
`db.values()`,
`db.run()`,

`db.select()...`,
`db.update()...`,
`db.delete()...`,
`db.insert()...`,

More usage examples here: integration-tests/tests/d1-batch.test.ts and in docs

---

## Drizzle Kit 0.20.0

1. New way to define drizzle.config using `defineConfig` function
2. Possibility to access Cloudflare D1 with Drizzle Studio using wrangler.toml file
3. Drizzle Studio is migrating to
4. `bigint unsigned` support
5. `primaryKeys` and `foreignKeys` now can have custom names
6. Environment variables are now automatically fetched
7. Some bug fixes and improvements

You can read more about drizzle-kit updates here

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0286

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.28.6 release

Sep 6, 2023

Check Fix Datetime mapping for MySQL for implementation details

## New Features

### 🎉 `LibSQL` batch api support

Reference:

Batch API usage example:

const batchResponse = await db.batch([\
db.insert(usersTable).values({ id: 1, name: 'John' }).returning({\
id: usersTable.id,\
}),\
db.update(usersTable).set({ name: 'Dan' }).where(eq(usersTable.id, 1)),\
db.query.usersTable.findMany({}),\
db.select().from(usersTable).where(eq(usersTable.id, 1)),\
db.select({ id: usersTable.id, invitedBy: usersTable.invitedBy }).from(\
usersTable,\
),\
]);
type BatchResponse = [\
{\
id: number;\
}[],\
ResultSet,\
{\
id: number;\
name: string;\
verified: number;\
invitedBy: number | null;\
}[],\
{\
id: number;\
name: string;\
verified: number;\
invitedBy: number | null;\
}[],\
{\
id: number;\
invitedBy: number | null;\
}[],\
];

All possible builders that can be used inside `db.batch`:

`db.all()`,
`db.get()`,
`db.values()`,
`db.run()`,

`db.select()...`,
`db.update()...`,
`db.delete()...`,
`db.insert()...`,

More usage examples here: integration-tests/tests/libsql-batch.test.ts and in docs

### 🎉 Add json mode for text in SQLite

Read more in docs

const test = sqliteTable('test', {

});

### 🎉 Add `.toSQL()` to Relational Query API calls

const query = db.query.usersTable.findFirst().toSQL();

### 🎉 Added new PostgreSQL operators for Arrays

List of operators and usage examples
`arrayContains`, `arrayContained`, `arrayOverlaps`

const contains = await db.select({ id: posts.id }).from(posts)
.where(arrayContains(posts.tags, ['Typescript', 'ORM']));

const contained = await db.select({ id: posts.id }).from(posts)
.where(arrayContained(posts.tags, ['Typescript', 'ORM']));

const overlaps = await db.select({ id: posts.id }).from(posts)
.where(arrayOverlaps(posts.tags, ['Typescript', 'ORM']));

const withSubQuery = await db.select({ id: posts.id }).from(posts)
.where(arrayContains(
posts.tags,
db.select({ tags: posts.tags }).from(posts).where(eq(posts.id, 1)),
));

### 🎉 Add more SQL operators for where filter function in Relational Queries

You can find more examples in docs

// Before
import { inArray } from "drizzle-orm/pg-core";

await db.users.findFirst({

})
// After
await db.users.findFirst({

})

## Fixes

- Correct where in on conflict in sqlite ( #1076)
- Fix libsql/client type import ( #1122)
- Fix: raw sql query not being mapped properly on RDS ( #1071)
- Fix Datetime mapping for MySQL ( #1082)
- Fix smallserial generating as serial ( #1127)

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0285

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.28.5 release

Aug 24, 2023

## Fixes

- Fixed incorrect OpenTelemetry type import that caused a runtime error

The OpenTelemetry logic currently present in the ORM isn’t meant to be used by Drizzle and no stats have ever been collected by Drizzle using drizzle-orm. OpenTelemetry is simply a protocol. If you take a look at the actual code that utilizes it in drizzle-orm, it simply uses the tracer to collect the query stats and doesn’t send it anywhere. It was designed for the ORM users to be able to send those stats to their own telemetry consumers.

The important thing is - the OpenTelemetry logic is disabled on the current version. It literally does nothing. We experimented with it at some point in the past, but disabled it before the release.

As to the reason of the issue in the last release: it happened because of an incorrect type import on this line. We’ve used `import { type ... }` syntax instead of `import type { ... }`, which resulted in the `import '@opentelemetry/api'` line leaking to the runtime.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0284

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.28.4 release

Aug 24, 2023

## Fixes:

- Fixed imports in ESM-based projects ( #1088)
- Fixed type error on Postgres table definitions ( #1089)

⚠ If you are facing a `Cannot find package '@opentelemetry/api'` error, please update to `0.28.5`, it’s fixed there.

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0283

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.28.3 release

Aug 22, 2023

## Fixes

- Fixed sqlite-proxy and SQL.js response from `.get()` when the result is empty

## New Features

### 🎉 Added `.$defaultFn()` / `.$default()` methods to column builders

For more information check docs for PostgreSQL, MySQL and SQLite.

import { varchar, mysqlTable } from "drizzle-orm/mysql-core";
import { createId } from '@paralleldrive/cuid2';

const table = mysqlTable('table', {

});

### 🎉 Added `table.$inferSelect` / `table._.inferSelect` and `table.$inferInsert` / `table._.inferInsert` for more convenient table model type inference

- 🛠 Deprecated `InferModel` type in favor of more explicit `InferSelectModel` and `InferInsertModel`

import { InferSelectModel, InferInsertModel } from 'drizzle-orm'

const usersTable = pgTable('users', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
verified: boolean('verified').notNull().default(false),

createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

type SelectUser = typeof usersTable.$inferSelect;
type InsertUser = typeof usersTable.$inferInsert;

- 🛠 Disabled `.d.ts` files bundling

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0282

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.28.2 release

Aug 10, 2023

## The community contributions release 🎉

### Internal Features and Changes

- Added a set of tests for d1
- Fixed issues in internal documentation

### Fixes

- Resolved the issue of truncating timestamp milliseconds for MySQL
- Corrected the type of the `.get()` method for sqlite-based dialects ( #565)
- Rectified the sqlite-proxy bug that caused the query to execute twice

### New packages 🎉

Added a support for Typebox in drizzle-typebox package.

Please check documentation page for more usage examples: /docs/typebox

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0281

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.28.1 release

Aug 7, 2023

## Fixes

- Fixed Postgres array-related issues introduced by 0.28.0 ( #983, #992)

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0280

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.28.0 release

Aug 6, 2023

## Breaking changes

### Removed support for filtering by nested relations

Current example won’t work in `0.28.0`:

const usersWithPosts = await db.query.users.findMany({

with: {
posts: true,
},
});

The `table` object in the `where` callback won’t have fields from `with` and `extras`. We removed them to be able to build more efficient relational queries, which improved row reads and performance.

If you have used those fields in the `where` callback before, there are several workarounds:

1. Applying those filters manually on the code level after the rows are fetched;
2. Using the core API.

### Added Relational Queries `mode` config for `mysql2` driver

Drizzle relational queries always generate exactly one SQL statement to run on the database and it has certain caveats. To have best in class support for every database out there we’ve introduced modes.

Drizzle relational queries use lateral joins of subqueries under the hood and for now PlanetScale does not support them.

When using `mysql2` driver with regular MySQL database - you should specify mode: “default”.
When using `mysql2` driver with PlanetScale - you need to specify mode: “planetscale”.

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import \* as schema from './schema';

const client = await mysql.createConnection({
uri: process.env.PLANETSCALE_DATABASE_URL,
});

const db = drizzle({ client, schema, mode: 'planetscale' });

## Improved IntelliSense performance for large schemas

We’ve run the diagnostics on a database schema with 85 tables, 666 columns, 26 enums, 172 indexes and 133 foreign keys. We’ve optimized internal types which resulted in **430%** speed up in IntelliSense.

## Improved Relational Queries Permormance and Read Usage

In this release we’ve fully changed a way query is generated for Relational Queri API.

As a summary we’ve made current set of changes in query generation startegy:

1. Lateral Joins: In the new version we’re utilizing lateral joins, denoted by the “LEFT JOIN LATERAL” clauses, to retrieve specific data from related tables efficiently For MySQL in PlanetScale and SQLite, we’ve used simple subquery selects, which improved a query plan and overall performance

2. Selective Data Retrieval: In the new version we’re retrieving only the necessary data from tables. This targeted data retrieval reduces the amount of unnecessary information fetched, resulting in a smaller dataset to process and faster execution.

3. Reduced Aggregations: In the new version we’ve reduced the number of aggregation functions (e.g., COUNT, json_agg). By using json_build_array directly within the lateral joins, drizzle is aggregating the data in a more streamlined manner, leading to improved query performance.

4. Simplified Grouping: In the new version the GROUP BY clause is removed, as the lateral joins and subqueries already handle data aggregation more efficiently.

For this drizzle query

const items = await db.query.comments.findMany({
limit,
orderBy: comments.id,
with: {
user: {
columns: { name: true },
},
post: {
columns: { title: true },
with: {
user: {
columns: { name: true },
},
},
},
},
});
-- Query generated now
select "comments"."id",
"comments"."user*id",
"comments"."post_id",
"comments"."content",
"comments_user"."data" as "user",
"comments_post"."data" as "post"
from "comments"
left join lateral (select json_build_array("comments_user"."name") as "data"
from (select *
from "users" "comments*user"
where "comments_user"."id" = "comments"."user_id"
limit 1) "comments_user") "comments_user" on true
left join lateral (select json_build_array("comments_post"."title", "comments_post_user"."data") as "data"
from (select *
from "posts" "comments*post"
where "comments_post"."id" = "comments"."post_id"
limit 1) "comments_post"
left join lateral (select json_build_array("comments_post_user"."name") as "data"
from (select *
from "users" "comments*post_user"
where "comments_post_user"."id" = "comments_post"."user_id"
limit 1) "comments_post_user") "comments_post_user"
on true) "comments_post" on true
order by "comments"."id"
limit 1
-- Query generated before
SELECT "id",
"user_id",
"post_id",
"content",
"user"::JSON,
"post"::JSON
FROM
(SELECT "comments".*,
CASE
WHEN count("comments*post"."id") = 0 THEN '[]'
ELSE json_agg(json_build_array("comments_post"."title", "comments_post"."user"::JSON))::text
END AS "post"
FROM
(SELECT "comments".*,
CASE
WHEN count("comments*user"."id") = 0 THEN '[]'
ELSE json_agg(json_build_array("comments_user"."name"))::text
END AS "user"
FROM "comments"
LEFT JOIN
(SELECT "comments_user".*
FROM "users" "comments*user") "comments_user" ON "comments"."user_id" = "comments_user"."id"
GROUP BY "comments"."id",
"comments"."user_id",
"comments"."post_id",
"comments"."content") "comments"
LEFT JOIN
(SELECT "comments_post".*
FROM
(SELECT "comments*post".*,
CASE
WHEN count("comments_post_user"."id") = 0 THEN '[]'
ELSE json_agg(json_build_array("comments_post_user"."name"))
END AS "user"
FROM "posts" "comments_post"
LEFT JOIN
(SELECT "comments_post_user".\*
FROM "users" "comments_post_user") "comments_post_user" ON "comments_post"."user_id" = "comments_post_user"."id"
GROUP BY "comments_post"."id") "comments_post") "comments_post" ON "comments"."post_id" = "comments_post"."id"
GROUP BY "comments"."id",
"comments"."user_id",
"comments"."post_id",
"comments"."content",
"comments"."user") "comments"
LIMIT 1

Read more about Relational Queries in the documentation.

## Possibility to insert rows with default values for all columns

You can now provide an empty object or an array of empty objects, and Drizzle will insert all defaults into the database.

// Insert 1 row with all defaults
await db.insert(usersTable).values({});

// Insert 2 rows with all defaults
await db.insert(usersTable).values([{}, {}]);

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0272

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.27.2 release

Jul 12, 2023

## 🎉 Added support for `UNIQUE` constraints in PostgreSQL, MySQL, SQLite

For PostgreSQL, unique constraints can be defined at the column level for single-column constraints, and in the third parameter for multi-column constraints. In both cases, it will be possible to define a custom name for the constraint. Additionally, PostgreSQL will receive the `NULLS NOT DISTINCT` option to restrict having more than one NULL value in a table. Reference

Examples that just shows a different `unique` usage. Please don’t search a real usage for those tables

// single column
const table = pgTable('table', {
id: serial('id').primaryKey(),
name: text('name').notNull().unique(),
state: char('state', { length: 2 }).unique('custom'),
field: char('field', { length: 2 }).unique('custom_field', { nulls: 'not distinct' }),
});
// multiple columns
const table = pgTable('table', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
state: char('state', { length: 2 }),

first: unique('custom_name').on(t.name, t.state).nullsNotDistinct(),
second: unique('custom_name1').on(t.name, t.state),
}));

For MySQL, everything will be the same except for the `NULLS NOT DISTINCT` option. It appears that MySQL does not support it

// single column
const table = mysqlTable('table', {
id: serial('id').primaryKey(),
name: text('name').notNull().unique(),
state: text('state').unique('custom'),
field: text('field').unique('custom_field'),
});
// multiple columns
const table = mysqlTable('cities1', {
id: serial('id').primaryKey(),
name: text('name').notNull(),
state: text('state'),

first: unique().on(t.name, t.state),
second: unique('custom_name1').on(t.name, t.state),
}));

In SQLite unique constraints are the same as unique indexes. As long as you can specify a name for the unique index in SQLite - we will treat all unique constraints as unique indexes in internal implementation

// single column
const table = sqliteTable('table', {
id: int('id').primaryKey(),
name: text('name').notNull().unique(),
state: text('state').unique('custom'),
field: text('field').unique(),
});
// multiple columns
const table = sqliteTable('table', {
id: int('id').primaryKey(),
name: text('name').notNull(),
state: text('state'),

first: unique().on(t.name, t.state),
second: unique('custom').on(t.name, t.state),
}));

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0162

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.16.2 release

Jan 21, 2023

Drizzle ORM - is an idiomatic TypeScript ORM which can be used as query builder and as an ORM being the source of truth for SQL schema and CLI for automatic migrations generation.

Since last major update we’ve added numerous requested features 🚀

### 🎉 PostgreSQL schemas

You can now declare PostgreSQL schemas and tables to be created within this schema

// src/schema.ts
import { pgSchema } from "drizzle-orm-pg";

export const mySchema = pgSchema("my_schema");

export const users = mySchema("users", {
id: serial("id").primaryKey(),
name: text("name"),
email: text("email"),
});
CREATE SCHEMA "my_schema";

CREATE TABLE IF NOT EXISTS "my_schema"."users" (
"id" serial PRIMARY KEY NOT NULL,
"name" text,
"email" text
);

drizzle-kit will automatically generate all needed SQL migrations

drizzle-kit generate:pg --schema=src/schema.ts --out=migrations/

### 🎉 MySQL databases/schemas

You can now declare MySQL databases/schemas and tables to be created within it

// schema.ts
import { mysqlSchema } from "drizzle-orm-mysql";

const mySchema = mysqlSchema("my_schema");

const users = mySchema("users", {
id: serial("id").primaryKey(),
name: text("name"),
email: text("email"),
});

drizzle-kit will automatically generate all needed SQL migrations `shell drizzle-kit generate:mysql --schema=src/schema.ts --out=migrations/`

which will automatically generate you SQL migration

CREATE DATABASE `my_schema`;

CREATE TABLE `my_schema`.`users` (
`id` serial PRIMARY KEY NOT NULL,
`name` text,
`email` text
);

### 🎉 PostgreSQL introspect

You can now pull database schema from your existing PostgreSQL database within seconds with drizzle-kit, this vanishes mostly any friction for you to switch from any existing orm or vanilla SQL.
It supports:

- enums
- tables with all native and non-native columns
- indexes
- foreign keys, self references and cyclic fks
- schemas

drizzle-kit introspect:pg --out=migrations/ --connectionString=postgresql://user:pass@host:port/db_name

it will print you `schema.ts`

export const myEnum = pgEnum("my_enum", ["one", "two", "three"]);
export const mySchema = pgSchema("my_schema");

export const users = mySchema("users", {
id: serial("id").primaryKey(),
name: text("name"),
email: text("email"),
});

export const users2 = pgTable("users2", {
id: serial("id").primaryKey(),
name: varchar("name2"),
enum: myEnum("enum"),
});

export const allColumns = pgTable("all_columns", {
sm: smallint("smallint"),
smdef: smallint("smallint_def").default(10),
int: integer("integer"),
intdef: integer("integer_def").default(10),
numeric: numeric("numeric"),
numeric2: numeric("numeric2", { precision: 7 }),
numeric3: numeric("numeric3", { scale: 7 }),
numeric4: numeric("numeric4", { precision: 7, scale: 7 }),
numericdef: numeric("numeridef").default("100"),
bigint: bigint("bigint", { mode: "number" }),
bigintdef: bigint("bigint", { mode: "number" }).default(100),
bool: boolean("boolean"),
booldef: boolean("boolean_def").default(true),
text: text("text"),
textdef: text("textdef").default("text"),
varchar: varchar("varchar"),
varchardef: varchar("varchardef").default("text"),
serial: serial("serial"),
bigserial: bigserial("bigserial", { mode: "bigint" }),
decimal: decimal("decimal", { precision: 100, scale: 2 }),
decimaldef: decimal("decimaldef", { precision: 100, scale: 2 }).default(
"100.0",
),
doublePrecision: doublePrecision("decimal"),
doublePrecisiondef: doublePrecision("decimaldef").default(100.0),
real: real("real"),
realdef: real("decimaldef").default(100.0),

time: time("time"),
time2: time("time2", { precision: 6, withTimezone: true }),
timedefnow: time("timedefnow").defaultNow(),
timestamp: timestamp("timestamp"),
timestamp2: timestamp("timestamp2", { precision: 6, withTimezone: true }),
timestamp3: timestamp("timestamp3", { withTimezone: true }),
timestamp4: timestamp("timestamp4", { precision: 4 }),
timestampdef: timestamp("timestampdef").defaultNow(),
date: date("date", { mode: "date" }),
datedef: date("datedef").defaultNow(),
interval: interval("interval"),
intervaldef: interval("intervaldef").default("10 days"),
});

export const cyclic1 = pgTable("cyclic1", {
id: serial("id").primaryKey(),

});

export const cyclic2 = pgTable("cyclic2", {
id: serial("id").primaryKey(),

export const example = pgTable(
"example",
{
id: serial("id").primaryKey(),
reportsTo: integer("reports_to"),
},

return {
reportsToFK: foreignKey({
columns: [table.reportsTo],
foreignColumns: [table.id],
}),
};
},
);

### 🎉 Postgres.js driver support

We’ve added full support for postgres.js, it is lightweight and it is fast 🚀

// schema.ts
import { pgTable, serial, text, varchar } from "drizzle-orm-pg";
export const users = pgTable("users", {
id: serial("id").primaryKey(),
fullName: text("full_name"),
phone: varchar("phone", { length: 256 }),
});

// index.ts
import { drizzle, PostgresJsDatabase } from "drizzle-orm-pg/postgres.js";
import postgres from "postgres";
import { users } from "./schema";

const client = postgres(connectionString);
const db: PostgresJsDatabase = drizzle(client);

const allUsers = await db.select(users);

Full PostgreSQL docs see here

### 🎉 PostgreSQL and MySQL types

We’ve added useful operators for you to create any needed non-native PostgreSQL or MySQL types

// PostgreSQL

dataType() {
return "text";
},
});

const usersTable = pgTable("users", {
name: customText("name").notNull(),
});

// MySQL

const usersTable = mysqlTable("users", {
name: customText("name").notNull(),
});

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0110

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

DrizzleORM v0.11.0 release

Jul 20, 2022

DrizzleORM - is an open source TypeScript ORM, supports PostgreSQL and about to have MySQL and SQLite support in couple of weeks. We’ve decided it’s time to share it with public.

With drizzle you have a fully typed SQL schema in-code which benefits you in multiple different major ways, which I’ll cover later

// declaring enum in database
export const popularityEnum = createEnum({ alias: 'popularity', values: ['unknown', 'known', 'popular'] });

id = this.serial("id").primaryKey();
name = this.varchar("name", { size: 256 })

// declaring index
nameIndex = this.uniqueIndex(this.name)

public tableName(): string {
return 'countries';
}
}

// declaring enum column in table
popularity = this.type(popularityEnum, "popularity")

public tableName(): string {
return 'cities';
}
}

This is quick start example of how you connect to the database and make your first query with typed result

import { drizzle, PgTable } from 'drizzle-orm'

public id = this.serial('id').primaryKey();
public fullName = this.text('full_name');
public phone = this.varchar('phone', { size: 256 });

public tableName(): string {
return 'users';
}
}

const usersTable = new UsersTable(db);

const users: User[] = await usersTable.select().execute();

This is how you use `WHERE` statement with filters, run partial select queries, use `limit/offset` and `orderBy`

await table.select().where(
eq(table.id, 42)
).execute();

// you can combine filters with eq(...) or or(...)
await table.select().where(
and([eq(table.id, 42), eq(table.name, "Dan")])
).execute();

await table.select().where(
or([eq(table.id, 42), eq(table.id, 1)])
).execute();

// partial select
const result = await table.select({
mapped1: table.id,
mapped2: table.name,
}).execute();
const { mapped1, mapped2 } = result[0];

// limit offset & order by
await table.select().limit(10).offset(10).execute()

This is how you run `inserts`, `updates` and `deletes`

const result = await usersTable.insert({
name: "Andrew",
createdAt: new Date(),
}).execute();

const result = await usersTable.insertMany([{\
name: "Andrew",\
createdAt: new Date(),\
}, {\
name: "Dan",\
createdAt: new Date(),\
}]).execute();

await usersTable.update()
.where(eq(usersTable.name, 'Dan'))
.set({ name: 'Mr. Dan' })
.execute();

await usersTable.delete()
.where(eq(usersTable.name, 'Dan'))
.execute();

One of the most powerful features we have in our ORM are fully typed joins, compiler won’t let you make a mistake

const usersTable = new UsersTable(db);
const citiesTable = new CitiesTable(db);

const result = await citiesTable.select()

.execute();

Here’s a `many to many` relationship example

id = this.serial("id").primaryKey();
name = this.varchar("name");
}

id = this.serial("id").primaryKey();
}

}

...
const usersTable = new UsersTable(db);
const chatGroupsTable = new ChatGroupsTable(db);
const manyToManyTable = new ManyToManyTable(db);

// querying user group with id 1 and all the participants(users)
const usersWithUserGroups = await manyToManyTable.select()

Last but not least are migrations. We’ve implemented a CLI tool for automatic migrations generation, which does handle renames and deletes by prompting you to resolve.

For a typescript schema below

import { PgTable } from "drizzle-orm";

public id = this.serial("id").primaryKey();
public fullName = this.varchar("full_name", { size: 256 });

public fullNameIndex = this.index(this.fullName);

public tableName(): string {
return "users";
}
}

public id = this.serial("id").primaryKey();
public phone = this.varchar("phone", { size: 256 });

public tableName(): string {
return "auth_otp";
}
}
-- SQL migration
CREATE TABLE IF NOT EXISTS auth_otp (
"id" SERIAL PRIMARY KEY,
"phone" character varying(256),
"user_id" INT
);

CREATE TABLE IF NOT EXISTS users (
"id" SERIAL PRIMARY KEY,
"full_name" character varying(256)
);

DO $$ BEGIN
ALTER TABLE auth_otp ADD CONSTRAINT auth_otp_user_id_fkey FOREIGN KEY ("user_id") REFERENCES users(id);
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS users_full_name_index ON users (full_name);

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-kit-v0232)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0322)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0321)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0320)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0313)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0314)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0312)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0311)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0310)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v03010)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0309)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0308)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0307)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0306)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0305)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0304)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0303)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0302)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0301)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0300)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0295)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0294)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0293)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0292)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0291)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0290)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0286)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0285)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0284)

We've merged alternation-engine into Beta release. Try it out!

# 404

This page isn’t in our solar system.

Take me home.

Headless TypeScript ORM with a head.

GitHub Discord Drizzle Twitter

Documentation

Get Started Manage Schema Access Data Migrations

Resources

Drizzle Studio Drizzle Gateway Benchmarks

Learn

Guides Tutorials Latest Releases

---

# https://orm.drizzle.team/docs/connect-bun-sqlite

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

This guide assumes familiarity with:

- Database connection basics with Drizzle
- Bun - website
- Bun SQLite driver - docs

According to the **official website**, Bun is a fast all-in-one JavaScript runtime.

Drizzle ORM natively supports **`bun:sqlite`** module and it’s crazy fast 🚀

We embrace SQL dialects and dialect specific drivers and syntax and unlike any other ORM,
for synchronous drivers like `bun:sqlite` we have both **async** and **sync** APIs and we mirror most popular
SQLite-like `all`, `get`, `values` and `run` query methods syntax.

#### Step 1 - Install packages

npm

yarn

pnpm

bun

npm i drizzle-orm
npm i -D drizzle-kit
yarn add drizzle-orm
yarn add -D drizzle-kit
pnpm add drizzle-orm
pnpm add -D drizzle-kit
bun add drizzle-orm
bun add -D drizzle-kit

#### Step 2 - Initialize the driver and make a query

import { drizzle } from 'drizzle-orm/bun-sqlite';

const db = drizzle();

const result = await db.select().from(...);

If you need to provide your existing driver:

import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

const sqlite = new Database('sqlite.db');
const db = drizzle({ client: sqlite });

If you want to use **sync** APIs:

const result = db.select().from(users).all();
const result = db.select().from(users).get();
const result = db.select().from(users).values();
const result = db.select().from(users).run();

#### What’s next?

**Manage schema**

Drizzle Schema PostgreSQL data types Indexes and Constraints Database Views Database Schemas Sequences Extensions

**Query data**

Relational Queries Select Insert Update Delete Filters Joins sql\`\` operator

---

# https://orm.drizzle.team/docs/connect-expo-sqlite

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

According to the **official website**, Expo is an ecosystem of tools to develop, build and ship applications on React Native.
It’s powered by Hermes JavaScript runtime and Metro bundler, Drizzle Expo driver is built to natively support both.

Drizzle ORM has the best in class toolkit for Expo SQLite:

- Native ORM driver for Expo SQLite ✅
- Drizzle Kit support for migration generation and bundling in application ✅
- Drizzle Studio dev tools plugin to browse on device database ✅
- Live Queries ✅

npm

yarn

pnpm

bun

npm i drizzle-orm expo-sqlite@next
npm i -D drizzle-kit
yarn add drizzle-orm expo-sqlite@next
yarn add -D drizzle-kit
pnpm add drizzle-orm expo-sqlite@next
pnpm add -D drizzle-kit
bun add drizzle-orm expo-sqlite@next
bun add -D drizzle-kit
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

const expo = openDatabaseSync("db.db");
const db = drizzle(expo);

await db.select().from(users);

#### Live Queries

With `useLiveQuery` hook you can make any Drizzle query reactive:

import { useLiveQuery, drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { Text } from 'react-native';
import \* as schema from './schema';

const expo = openDatabaseSync('db.db', { enableChangeListener: true }); // <-- enable change listeners
const db = drizzle(expo);

// Re-renders automatically when data changes
const { data } = useLiveQuery(db.select().from(schema.users));

};

export default App;

#### Expo SQLite migrations with Drizzle Kit

You can use Drizzle Kit for SQL migration generation.

Please make sure to check how Drizzle migrations work before proceeding.

Expo / React Native requires you to have SQL migrations bundled into the app and we’ve got you covered.

#### Install babel plugin

It’s necessary to bundle SQL migration files as string directly to your bundle.

npm install babel-plugin-inline-import

#### Update config files.

You will need to update `babel.config.js`, `metro.config.js` and `drizzle.config.ts` files

module.exports = function(api) {
api.cache(true);

return {
presets: ['babel-preset-expo'],
plugins: [["inline-import", { "extensions": [".sql"] }]] // <-- add this
};
};
const { getDefaultConfig } = require('expo/metro-config');

/\*_ @type {import('expo/metro-config').MetroConfig} _/
const config = getDefaultConfig(\_\_dirname);

config.resolver.sourceExts.push('sql'); // <--- add this

module.exports = config;

Make sure to have `dialect: 'sqlite'` and `driver: 'expo'` in Drizzle Kit config

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
schema: './db/schema.ts',
out: './drizzle',
dialect: 'sqlite',
driver: 'expo', // <--- very important
});

#### Generate migrations

After creating SQL schema file and drizzle.config.ts file, you can generate migrations

npx drizzle-kit generate

#### Add migrations to your app

Now you need to import `migrations.js` file into your Expo/React Native app from `./drizzle` folder.
You can run migrations on application startup using our custom `useMigrations` migrations hook on in `useEffect` hook manually as you want.

import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './drizzle/migrations';

const expoDb = openDatabaseSync("db.db");

const db = drizzle(expoDb);

export default function App() {
const { success, error } = useMigrations(db, migrations);

if (error) {
return (

}

if (!success) {
return (

return ...your application component;
}

---

# https://orm.drizzle.team/docs/connect-neon

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

This guide assumes familiarity with:

- Database connection basics with Drizzle
- Neon serverless database - website
- Neon serverless driver - docs & GitHub
- Drizzle PostgreSQL drivers - docs

Drizzle has native support for Neon connections with the `neon-http` and `neon-websockets` drivers. These use the **neon-serverless** driver under the hood.

With the `neon-http` and `neon-websockets` drivers, you can access a Neon database from serverless environments over HTTP or WebSockets instead of TCP.

Querying over HTTP is faster for single, non-interactive transactions.

If you need session or interactive transaction support, or a fully compatible drop-in replacement for the `pg` driver, you can use the WebSocket-based `neon-serverless` driver.

You can connect to a Neon database directly using Postgres

For an example of using Drizzle ORM with the Neon Serverless driver in a Cloudflare Worker, **see here.**

To use Neon from a serverful environment, you can use the PostgresJS driver, as described in Neon’s **official Node.js docs** — see **docs**.

#### Step 1 - Install packages

npm

yarn

pnpm

bun

npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit
yarn add drizzle-orm @neondatabase/serverless
yarn add -D drizzle-kit
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
bun add drizzle-orm @neondatabase/serverless
bun add -D drizzle-kit

#### Step 2 - Initialize the driver and make a query

Neon HTTP

Neon Websockets

node-postgres

postgres.js

import { drizzle } from 'drizzle-orm/neon-http';

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute('select 1');
import { drizzle } from 'drizzle-orm/neon-serverless';

const result = await db.execute('select 1');
// For Node.js - make sure to install the 'ws' and 'bufferutil' packages
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

const db = drizzle({
connection: process.env.DATABASE_URL,
ws: ws,
});

const result = await db.execute('select 1');

IMPORTANT

Additional configuration is required to use WebSockets in environments where the `WebSocket` global is not defined, such as Node.js.
Add the `ws` and `bufferutil` packages to your project’s dependencies, and set `ws` in the Drizzle config.

// Make sure to install the 'pg' package
import { drizzle } from 'drizzle-orm/node-postgres';

const result = await db.execute('select 1');
// Make sure to install the 'postgres' package
import { drizzle } from 'drizzle-orm/postgres-js';

If you need to provide your existing drivers:

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const result = await db.execute('select 1');
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool })

const result = await db.execute('select 1');
// For Node.js - make sure to install the 'ws' and 'bufferutil' packages
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

neonConfig.webSocketConstructor = ws;

// Make sure to install the 'pg' package
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
});
const db = drizzle({ client: pool });

const result = await db.execute('select 1');
// Make sure to install the 'postgres' package
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres(process.env.DATABASE_URL);
const db = drizzle({ client: queryClient });

#### What’s next?

**Manage schema**

Drizzle Schema PostgreSQL data types Indexes and Constraints Database Views Database Schemas Sequences Extensions

**Query data**

Relational Queries Select Insert Update Delete Filters Joins sql\`\` operator

---

# https://orm.drizzle.team/docs/get-started/postgresql-new

We've merged alternation-engine into Beta release. Try it out!

v1.0\\
\\
98%

Benchmarks Extension Studio Studio Package Gateway Drizzle Run

Our goodies!

Our Primary backer\\
\\

\\

Product by Drizzle Team

[One Dollar Stats$1 per mo web analytics\\
\\
christmas\\
\\
deal

PostgreSQL

New database

Meet Drizzle

Get started

Existing database

PostgreSQL Neon Vercel Postgres Supabase Xata PGLite Nile Bun SQL Effect PlanetScale Postgres Gel MySQL PlanetScale TiDB SingleStore SQLite Turso Cloud SQLite Cloud Turso Database Cloudflare D1 Bun SQLite Cloudflare Durable Objects MSSQL CockroachDB Expo SQLite OP SQLite

# Get Started with Drizzle and PostgreSQL

This guide assumes familiarity with:

- **dotenv** \- package for managing environment variables - read here
- **tsx** \- package for running TypeScript files - read here
- **node-postgres** \- package for querying your PostgreSQL database - read here

Drizzle has native support for PostgreSQL connections with the `node-postgres` and `postgres.js` drivers.

We will use `node-postgres` for this get started example. But if you want to find more ways to connect to postgresql check
our PostgreSQL Connection page

#### Basic file structure

This is the basic file structure of the project. In the `src/db` directory, we have table definition in `schema.ts`. In `drizzle` folder there are sql migration file and snapshots.

├ 📂 src
│ ├ 📂 db
│ │ └ 📜 schema.ts
│ └ 📜 index.ts
├ 📜 .env
├ 📜 drizzle.config.ts
├ 📜 package.json
└ 📜 tsconfig.json

#### Step 1 - Install **node-postgres** package

npm

yarn

pnpm

bun

npm i drizzle-orm pg dotenv
npm i -D drizzle-kit tsx @types/pg
yarn add drizzle-orm pg dotenv
yarn add -D drizzle-kit tsx @types/pg
pnpm add drizzle-orm pg dotenv
pnpm add -D drizzle-kit tsx @types/pg
bun add drizzle-orm pg dotenv
bun add -D drizzle-kit tsx @types/pg

#### Step 2 - Setup connection variables

Create a `.env` file in the root of your project and add your database connection variable:

DATABASE_URL=

tips

If you don’t have a PostgreSQL database yet and want to create one for testing, you can use our guide on how to set up PostgreSQL in Docker.

The PostgreSQL in Docker guide is available here. Go set it up, generate a database URL (explained in the guide), and come back for the next steps

#### Step 3 - Connect Drizzle ORM to the database

Create a `index.ts` file in the `src` directory and initialize the connection:

node-postgres

node-postgres with config

your node-postgres driver

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!);
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

// You can specify any property from the node-postgres connection options
const db = drizzle({
connection: {
connectionString: process.env.DATABASE_URL!,
ssl: true
}
});
import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
connectionString: process.env.DATABASE_URL!,
});
const db = drizzle({ client: pool });

#### Step 4 - Create a table

Create a `schema.ts` file in the `src/db` directory and declare your table:

import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
id: integer().primaryKey().generatedAlwaysAsIdentity(),
name: varchar({ length: 255 }).notNull(),
age: integer().notNull(),
email: varchar({ length: 255 }).notNull().unique(),
});

#### Step 5 - Setup Drizzle config file

**Drizzle config** \- a configuration file that is used by Drizzle Kit and contains all the information about your database connection, migration folder and schema files.

Create a `drizzle.config.ts` file in the root of your project and add the following content:

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
out: './drizzle',
schema: './src/db/schema.ts',
dialect: 'postgresql',
dbCredentials: {
url: process.env.DATABASE_URL!,
},
});

#### Step 6 - Applying changes to the database

You can directly apply changes to your database using the `drizzle-kit push` command. This is a convenient method for quickly testing new schema designs or modifications in a local development environment, allowing for rapid iterations without the need to manage migration files:

npx drizzle-kit push

Read more about the push command in documentation.

Tips

Alternatively, you can generate migrations using the `drizzle-kit generate` command and then apply them using the `drizzle-kit migrate` command:

Generate migrations:

npx drizzle-kit generate

Apply migrations:

npx drizzle-kit migrate

Read more about migration process in documentation.

#### Step 7 - Seed and Query the database

Let’s **update** the `src/index.ts` file with queries to create, read, update, and delete users

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { usersTable } from './db/schema';

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
const user: typeof usersTable.$inferInsert = {
name: 'John',
age: 30,
email: 'john@example.com',
};

await db.insert(usersTable).values(user);
console.log('New user created!')

const users = await db.select().from(usersTable);
console.log('Getting all users from the database: ', users)
/_
const users: {
id: number;
name: string;
age: number;
email: string;
}[]
_/

await db
.update(usersTable)
.set({
age: 31,
})
.where(eq(usersTable.email, user.email));
console.log('User info updated!')

await db.delete(usersTable).where(eq(usersTable.email, user.email));
console.log('User deleted!')
}

main();

#### Step 8 - Run index.ts file

To run any TypeScript files, you have several options, but let’s stick with one: using `tsx`

You’ve already installed `tsx`, so we can run our queries now

**Run `index.ts` script**

npx tsx src/index.ts
yarn tsx src/index.ts
pnpm tsx src/index.ts
bunx tsx src/index.ts

We suggest using `bun` to run TypeScript files. With `bun`, such scripts can be executed without issues or additional
settings, regardless of whether your project is configured with CommonJS (CJS), ECMAScript Modules (ESM), or any other module format.
To run a script with `bun`, use the following command:

bun src/index.ts

If you don’t have bun installed, check the Bun installation docs

---
