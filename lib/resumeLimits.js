// Caps for the CV, in their own module rather than on the Mongoose model.
//
// The builder is a client component and needs these to disable its "add"
// buttons. Importing them from lib/models/Resume.js would pull Mongoose — and
// its `async_hooks` dependency — into the browser bundle, which fails the
// build outright. Anything a client component needs from a model has to live
// in a model-free module like this one.
//
// Both the schema and the API route import from here, so the limits stay
// enforced in all three places from a single source of truth.
export const MAX_EXPERIENCE = 12;
export const MAX_EDUCATION = 8;
export const MAX_SKILLS = 40;
export const MAX_SUMMARY = 1200;
export const MAX_BULLETS = 8;
