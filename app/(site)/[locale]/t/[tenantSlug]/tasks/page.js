import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Task from "@/lib/models/Task";
import { getRouteT } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/routing";
import { tenantScoped } from "@/lib/tenantScope";
import TaskList from "@/components/plugins/TaskList";
import styles from "@/components/dashboard.module.css";

export const metadata = { title: "Tasks" };

export default async function TasksPage({ params }) {
  const { t } = await getRouteT(params);
  const { locale, tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect(localePath(locale, "/login"));
  if (session.user.tenantSlug !== tenantSlug) {
    redirect(localePath(locale, `/t/${session.user.tenantSlug}`));
  }

  await connectDB();
  const tasks = await tenantScoped(Task, session.user.tenantId)
    .find()
    .sort({ done: 1, dueDate: 1, createdAt: -1 })
    .limit(200)
    .select("title done completedAt priority dueDate createdAt")
    .lean();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("plugins.tasks.label")}</h1>
      <p className={styles.sectionHint}>{t("plugins.tasks.description")}</p>
      {/* Serialised the way every other dashboard page hands Mongo documents
          to a client component — ObjectIds and Dates don't cross the boundary. */}
      <TaskList initialTasks={JSON.parse(JSON.stringify(tasks))} />
    </div>
  );
}
