import mongoose from "mongoose";
import {
  MAX_ANSWER_TEXT,
  MAX_QUESTION_LABEL,
  MAX_RESPONDENT_NAME,
  MAX_SURVEY_QUESTIONS,
  MAX_SURVEY_TITLE,
  QUESTION_TYPES,
  RATING_MAX,
} from "../surveys";

// A short feedback form and its answers (lib/plugins.js → "surveys").
//
// Two documents rather than one: a Survey is authored once by the tenant, a
// SurveyResponse arrives from a member of the public on an unauthenticated
// route. Keeping them apart means the write path a stranger can reach only
// ever creates responses — it can't touch the questions, the title, or the
// open/closed flag, whatever it posts.

// Defined in lib/surveys.js so the builder and the public form can import them
// without pulling Mongoose into the browser — see test/boundaries.test.mjs.
export {
  QUESTION_TYPES,
  MAX_SURVEY_QUESTIONS,
  MAX_SURVEY_TITLE,
  MAX_QUESTION_LABEL,
  MAX_ANSWER_TEXT,
  MAX_RESPONDENT_NAME,
  RATING_MAX,
};

const QuestionSchema = new mongoose.Schema(
  {
    // Stable across edits, so an answer keeps pointing at the question it
    // answered even after the label is reworded. Without it, editing "How was
    // the service?" into "Rate the service" would silently re-label every
    // historical answer.
    key: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    label: { type: String, required: true, trim: true, maxlength: MAX_QUESTION_LABEL },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const SurveySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: MAX_SURVEY_TITLE },
    // Optional line under the title on the public page.
    intro: { type: String, default: "", trim: true, maxlength: MAX_QUESTION_LABEL },

    questions: {
      type: [QuestionSchema],
      default: [],
      validate: {
        validator: (q) => q.length > 0 && q.length <= MAX_SURVEY_QUESTIONS,
        message: `A survey needs between 1 and ${MAX_SURVEY_QUESTIONS} questions.`,
      },
    },

    // The public link resolves by _id, so closing is a flag rather than a
    // delete: a link already sent to fifty customers has to keep resolving to
    // something honest ("this survey is closed") rather than a 404 that reads
    // as a broken link.
    open: { type: Boolean, default: true },

    // Denormalized so the list can show "12 responses" without an aggregation
    // per row — same reasoning as Tenant.moderation.openReportCount.
    responseCount: { type: Number, default: 0, min: 0 },
    // Running mean of every rating answer, for the list summary. Stored rather
    // than computed because the alternative is loading every response to
    // render a list of surveys.
    ratingSum: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

SurveySchema.index({ tenantId: 1, createdAt: -1 });

const AnswerSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    // Exactly one of these is set, matching the question's type.
    rating: { type: Number, default: null, min: 1, max: RATING_MAX },
    text: { type: String, default: "", maxlength: MAX_ANSWER_TEXT },
  },
  { _id: false }
);

const SurveyResponseSchema = new mongoose.Schema(
  {
    // Denormalized off the survey at write time so every read stays
    // tenant-scoped like the rest of the app, without a join through Survey.
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },

    // Optional, and never required: asking a customer to identify themselves
    // before they'll say anything is how you get no responses.
    respondentName: { type: String, default: "", trim: true, maxlength: MAX_RESPONDENT_NAME },

    answers: { type: [AnswerSchema], default: [] },
  },
  { timestamps: true }
);

SurveyResponseSchema.index({ tenantId: 1, surveyId: 1, createdAt: -1 });

export const SurveyResponse =
  mongoose.models.SurveyResponse ||
  mongoose.model("SurveyResponse", SurveyResponseSchema);

export default mongoose.models.Survey || mongoose.model("Survey", SurveySchema);
