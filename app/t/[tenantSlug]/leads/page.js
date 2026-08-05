import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import StageSelect from "@/components/StageSelect";
import { IconFilter, IconClose } from "@/components/icons";
import styles from "@/components/dashboard.module.css";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function LeadsInboxPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const { q = "", stage = "", from = "", to = "" } = (await searchParams) || {};

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  const filter = { tenantId: tenant._id };
  if (q.trim()) {
    filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
  }
  if (stage.trim()) {
    filter.stage = stage.trim();
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [leads, pipeline] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).lean(),
    Pipeline.findOne({ tenantId: tenant._id }).lean(),
  ]);

  const stages = pipeline?.stages || ["new", "contacted", "qualified", "won", "lost"];
  const hasFilters = q.trim() || stage.trim() || from || to;

  return (
    <div>
      <h1 className={styles.pageTitle}>Leads</h1>

      <form
        method="GET"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}
      >
        <div className={styles.detailField} style={{ marginBottom: 0, minWidth: 180 }}>
          <label htmlFor="q">Search by name</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search leads..." />
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="stage">Stage</label>
          <select id="stage" name="stage" defaultValue={stage}>
            <option value="">All stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="from">From</label>
          <input id="from" type="date" name="from" defaultValue={from} />
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="to">To</label>
          <input id="to" type="date" name="to" defaultValue={to} />
        </div>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`}>
          <IconFilter size={14} />
          Filter
        </button>
        {hasFilters && (
          <a className={`${styles.linkButton} ${styles.iconLabel}`} href={`/t/${tenantSlug}/leads`}>
            <IconClose size={13} />
            Clear filters
          </a>
        )}
      </form>

      {leads.length === 0 ? (
        <p className={styles.empty}>
          {hasFilters
            ? "No leads match those filters."
            : `No leads yet. Share your landing page (/pages/${tenantSlug}) to start collecting them.`}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Stage</th>
              <th>Received</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id} className={lead.read === false ? styles.rowUnread : ""}>
                <td>
                  {lead.read === false && (
                    <span className={styles.unreadDot} title="Unread lead" aria-label="Unread" />
                  )}
                  {lead.name}
                </td>
                <td>{lead.email}</td>
                <td>{lead.phone || "—"}</td>
                <td>
                  <StageSelect leadId={lead._id.toString()} stage={lead.stage} stages={stages} />
                </td>
                <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                <td>
                  <a className={styles.linkButton} href={`/t/${tenantSlug}/leads/${lead._id}`}>
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
