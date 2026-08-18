// Task constants, kept out of lib/models/Task.js so the client bundle can read
// them without importing Mongoose.
//
// The model imports these rather than the other way round — same split as
// lib/analytics.js and lib/companySize.js, and the reason test/boundaries.test.mjs
// exists: one `import { TASK_PRIORITIES } from "@/lib/models/Task"` in a
// "use client" file drags the whole ODM into the browser bundle.

export const TASK_PRIORITIES = ["low", "normal", "high"];
export const MAX_TASK_TITLE = 200;
