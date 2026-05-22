import React from "react";
import { ArrowUpRight, BarChart3, Brain, CalendarDays, CheckCircle2, Clock, Droplets, FileSpreadsheet, Heart, Shield, Sparkles, Users, Zap } from "lucide-react";

const features = [
  {
    title: "Project records",
    copy: "Keep every module, status, and update in one searchable software workspace.",
    icon: Heart,
    tone: "emerald",
  },
  {
    title: "Activity trends",
    copy: "Track usage patterns, progress, and adoption metrics across the app.",
    icon: Droplets,
    tone: "blue",
  },
  {
    title: "Workflow tracking",
    copy: "Log tasks, milestones, and approvals without leaving the dashboard.",
    icon: CalendarDays,
    tone: "amber",
  },
  {
    title: "Export-ready reports",
    copy: "Generate PDF and Excel summaries for sharing, reviews, and offline use.",
    icon: FileSpreadsheet,
    tone: "violet",
  },
  {
    title: "Control center",
    copy: "Stay ahead of alerts, schedules, and quick actions from a single surface.",
    icon: Zap,
    tone: "teal",
  },
  {
    title: "Teams and analytics",
    copy: "Keep roles, activity, and analytics organized for the whole team.",
    icon: Users,
    tone: "rose",
  },
];

const stats = [
  { label: "Security", value: "Local auth" },
  { label: "Sync", value: "Realtime API" },
  { label: "Focus", value: "Readable UI" },
  { label: "Speed", value: "Fast refresh" },
];

const insights = [
  { label: "Live workspace", value: "98%" },
  { label: "Adoption trend", value: "+12.4%" },
  { label: "Pending alerts", value: "0" },
];

const guide = [
  {
    title: "Sign in or register",
    copy: "Create a local account, then open the floating dashboard with your saved token.",
  },
  {
    title: "Check the workspace snapshot",
    copy: "Review modules, activity cards, and alerts from the overview panels.",
  },
  {
    title: "Log daily activity",
    copy: "Add records, tasks, updates, and reports as the day changes.",
  },
  {
    title: "Export and share",
    copy: "Use the reports and team sections to keep records organized for everyone.",
  },
];

const AuthShowcase = () => {
  return (
    <section className="auth-showcase panel">
      <div className="auth-showcase-top">
        <div>
          <p className="eyebrow">Designed for farm teams</p>
          <h2>Floating screens, strong visuals, and a premium farm software feel.</h2>
          <p className="section-note">
            A sharper landing surface for users, with a floating preview and colorful cards that feel judge-ready.
          </p>
        </div>
        <div className="account-pill">
          <Shield size={14} />
          Secure by design
        </div>
      </div>

      <div className="auth-hero-visual">
        <div className="auth-hero-orb auth-hero-orb-a" />
        <div className="auth-hero-orb auth-hero-orb-b" />
        <div className="auth-hero-glow" />
        <div className="auth-hero-panel">
          <div className="auth-hero-panel-head">
            <div>
              <p className="auth-hero-kicker">
                <Sparkles size={14} />
                AI-powered farm insights
              </p>
              <strong>Live herd intelligence</strong>
            </div>
            <div className="auth-hero-chip">
              <Brain size={14} />
              Smart overview
            </div>
          </div>

          <div className="auth-hero-chart">
            {[34, 58, 46, 72, 64, 84, 68].map((height, index) => (
              <span key={`${height}-${index}`} style={{ height: `${height}%` }} />
            ))}
          </div>

          <div className="auth-hero-insights">
            {insights.map((item) => (
              <div key={item.label} className="auth-hero-insight">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="auth-hero-footer">
            <div className="auth-hero-footer-item">
              <span>Health score</span>
              <strong>Stable</strong>
            </div>
            <div className="auth-hero-footer-item">
              <span>Next action</span>
              <strong>Review herd</strong>
            </div>
            <div className="auth-hero-footer-arrow">
              <ArrowUpRight size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="auth-showcase-grid">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article key={feature.title} className={`auth-feature-card tone-${feature.tone}`}>
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