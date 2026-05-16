import React from "react";
import { BarChart3, CheckCircle2, Clock, Heart, Shield, Users, Zap } from "lucide-react";

const features = [
  {
    title: "Live herd health",
    copy: "Track animals, vaccinations, and treatments from one clean screen.",
    icon: Heart,
  },
  {
    title: "Feed and feeder control",
    copy: "Stay ahead of low stock, feeding schedules, and feeder alerts.",
    icon: Zap,
  },
  {
    title: "Staff and reporting",
    copy: "Keep roles, activity, and CSV exports organized for the whole farm.",
    icon: Users,
  },
];

const stats = [
  { label: "Security", value: "Local auth" },
  { label: "Sync", value: "Realtime API" },
  { label: "Focus", value: "Readable UI" },
];

const guide = [
  {
    title: "Sign in or register",
    copy: "Create a local account, then open the dashboard with your saved token.",
  },
  {
    title: "Check the herd snapshot",
    copy: "Review animal counts, feed inventory, and alerts from the overview cards.",
  },
  {
    title: "Log daily activity",
    copy: "Add animals, treatments, vaccinations, feeders, and feed logs as the day changes.",
  },
  {
    title: "Export and share",
    copy: "Use the reports and staff sections to keep records organized for the whole team.",
  },
];

const AuthShowcase = () => {
  return (
    <section className="auth-showcase panel">
      <div className="auth-showcase-top">
        <div>
          <p className="eyebrow">Designed for farm teams</p>
          <h2>Everything the dashboard needs, nothing extra.</h2>
          <p className="section-note">
            A cleaner landing surface for operators, with the important work emphasized first.
          </p>
        </div>
        <div className="account-pill">
          <Shield size={14} />
          Secure by default
        </div>
      </div>

      <div className="auth-showcase-grid">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article key={feature.title} className="auth-feature-card">
              <div className="auth-feature-icon">
                <Icon size={18} />
              </div>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="auth-metric-strip">
        {stats.map((stat) => (
          <div key={stat.label} className="auth-metric">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="auth-guide">
        <div className="auth-guide-head">
          <div>
            <p className="eyebrow">What this workspace covers</p>
            <h3>Everything you need before the first shift starts.</h3>
          </div>
          <div className="auth-guide-chip">
            <CheckCircle2 size={14} />
            Ready to use
          </div>
        </div>

        <div className="auth-guide-list">
          {guide.map((item) => (
            <article key={item.title} className="auth-guide-item">
              <span className="auth-guide-step">{item.title}</span>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="auth-showcase-footer">
        <div>
          <p className="auth-time-label">
            <Clock size={14} />
            Ready when the shift starts
          </p>
          <p className="section-note">Fast login, crisp cards, and an interface that feels calm on day one.</p>
        </div>
        <div className="auth-cta-chip">
          <BarChart3 size={14} />
          Built for live data
        </div>
      </div>
    </section>
  );
};

export default React.memo(AuthShowcase);