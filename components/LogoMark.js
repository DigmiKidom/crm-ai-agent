// The app's icon mark — the Ceramony brand mark (served from
// /public/logo/ceramony-icon.svg, the source of truth in /assets/logo).
export default function LogoMark({ size = 28, className }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo/ceramony-icon.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ display: "block" }}
    />
  );
}
