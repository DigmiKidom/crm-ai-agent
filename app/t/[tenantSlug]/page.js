import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import StageSelect from "@/components/StageSelect";
import styles from "@/components/dashboard.module.css";

export default async function LeadsInboxPage({ params }) {
  const { tenantSlug } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
  const [leads, pipeline] = await Promise.all([
    Lead.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).lean(),
    Pipeline.findOne({ tenantId: tenant._id }).lean(),
  ]);

  const stages = pipeline?.stages || ["new", "contacted", "qualified", "won", "lost"];

  return (
    <div>
      <h1 className={styles.pageTitle}>Leads</h1>

      {leads.length === 0 ? (
        <p className={styles.empty}>
          No leads yet. Share your landing page (/l/{tenantSlug}) to start collecting them.
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
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id}>
                <td>{lead.name}</td>
                <td>{lead.email}</td>
                <td>{lead.phone || "—"}</td>
                <td>
                  <StageSelect leadId={lead._id.toString()} stage={lead.stage} stages={stages} />
                </td>
                <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
