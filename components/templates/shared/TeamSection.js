import Avatar from "@/components/chrome/Avatar";
import styles from "./shared.module.css";

/**
 * The tenant's own team, pulled straight from User (+ their public CV, where
 * one exists) instead of being written from scratch a second time as
 * freeform "About us" copy. Off by default — see
 * Tenant.landingPage.showTeamSection — and only rendered by the public page
 * when the tenant has switched it on.
 */
export default function TeamSection({ members, heading, viewCvLabel }) {
  if (!members?.length) return null;

  return (
    <section className={styles.teamSection}>
      <h2>{heading}</h2>
      <div className={styles.teamGrid}>
        {members.map((member) => (
          <div className={styles.teamCard} key={member.id}>
            <Avatar
              mediaId={member.avatarMediaId}
              name={member.name}
              size={64}
              className={styles.teamAvatar}
            />
            <p className={styles.teamName}>{member.name}</p>
            {member.title && <p className={styles.teamTitle}>{member.title}</p>}
            {member.publicResumeId && (
              <a
                className={styles.teamCvLink}
                href={`/cv/${member.publicResumeId}`}
                target="_blank"
                rel="noreferrer"
              >
                {viewCvLabel}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
