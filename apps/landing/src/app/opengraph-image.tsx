import { ImageResponse } from "next/og";

// Link preview on Facebook / WhatsApp, drawn in code (icons, not emojis).
export const alt = "Flow.Co — De la commande au bénéfice, au même endroit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#16325C";
const GOLD = "#F2B544";
const MUTED = "#C9D6EE";

/** Lucide paths (24×24, stroke), so the preview uses the same icons as the site. */
const ICONS = {
  phone: ["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M12 18h.01"],
  monitor: ["M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M8 21h8", "M12 17v4"],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
};

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function Chip({ icon, label }: { icon: string[]; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "white", fontSize: 24, fontWeight: 700 }}>
      <Icon paths={icon} />
      {label}
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: NAVY, fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", right: -160, bottom: -200, width: 560, height: 560, borderRadius: 999, border: "60px solid rgba(242,181,68,0.15)" }} />
        <div style={{ position: "absolute", right: 120, top: -120, width: 240, height: 240, borderRadius: 999, border: "30px solid rgba(201,214,238,0.12)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="96" height="96" viewBox="0 0 1024 1024">
            <rect width="1024" height="1024" rx="228" fill="#1E3D6B" />
            <g transform="translate(512 512) scale(0.8) translate(-545 -500)" fill="none" stroke={GOLD} strokeWidth="100" strokeLinecap="round" strokeLinejoin="round">
              <path d="M330 820V380H560L760 180" />
              <path d="M600 180H760V340" />
              <path d="M330 600H540" />
            </g>
          </svg>
          <div style={{ color: "white", fontSize: 48, fontWeight: 800 }}>Flow.Co</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 44, fontSize: 68, fontWeight: 800, lineHeight: 1.1, color: "white" }}>
          <div>De la commande au</div>
          <div style={{ display: "flex" }}>
            bénéfice,&nbsp;<span style={{ color: GOLD }}>au même endroit.</span>
          </div>
        </div>

        <div style={{ marginTop: 22, maxWidth: 780, fontSize: 28, lineHeight: 1.4, color: MUTED }}>
          Commandes, stock, clients, livreurs et bénéfice : l’outil des vendeurs en ligne à Madagascar.
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          <Chip icon={ICONS.phone} label="Android" />
          <Chip icon={ICONS.monitor} label="Ordinateur" />
          <Chip icon={ICONS.users} label="Toute l’équipe" />
        </div>
      </div>
    ),
    size,
  );
}
