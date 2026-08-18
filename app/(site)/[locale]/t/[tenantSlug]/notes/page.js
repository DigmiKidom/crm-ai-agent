import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Note from "@/lib/models/Note";
import { getRouteT } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/routing";
import { tenantScoped } from "@/lib/tenantScope";
import NotesBoard from "@/components/plugins/NotesBoard";
import styles from "@/components/dashboard.module.css";

export const metadata = { title: "Notes" };

export default async function NotesPage({ params }) {
  const { t } = await getRouteT(params);
  const { locale, tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect(localePath(locale, "/login"));
  if (session.user.tenantSlug !== tenantSlug) {
    redirect(localePath(locale, `/t/${session.user.tenantSlug}`));
  }

  await connectDB();
  // Titles only — the editor fetches a body when a note is opened. A tenant
  // with fifty long notes shouldn't ship all of them to render a list.
  const notes = await tenantScoped(Note, session.user.tenantId)
    .find()
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(200)
    .select("title pinned updatedAt createdAt")
    .lean();

  // One extra read for the note the editor opens on, so the pane is filled on
  // the first paint rather than after a round trip from the browser.
  const firstNote = notes[0]
    ? await tenantScoped(Note, session.user.tenantId)
        .findOne({ _id: notes[0]._id })
        .select("title body pinned updatedAt")
        .lean()
    : null;

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("plugins.notes.label")}</h1>
      <p className={styles.sectionHint}>{t("notes.privacyNote")}</p>
      <NotesBoard
        initialNotes={JSON.parse(JSON.stringify(notes))}
        initialNote={firstNote ? JSON.parse(JSON.stringify(firstNote)) : null}
      />
    </div>
  );
}
