import './Construction.css'

// Permission check placeholder
function useConstructionPermissions() {
  // TODO: Replace with actual role-based permissions from Supabase
  return {
    canAccessDashboard: true,
    canViewSystemStatus: true,
    canModifySettings: true,
  }
}

export function Construction() {
  const permissions = useConstructionPermissions()

  if (!permissions.canAccessDashboard) {
    return (
      <div className="construction-page">
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>You don't have permission to view this page.</p>
          <a href="/">← Back to Xstream</a>
        </div>
      </div>
    )
  }

  return (
    <div className="construction-page">
      <header className="construction-header">
        <h1>🚧 Construction Dashboard</h1>
        <a href="/" className="back-link">← Back to Xstream</a>
      </header>

      <main className="construction-content">
        <section className="status-section">
          <h2>System Status</h2>
          <div className="status-grid">
            <StatusCard 
              title="Phase" 
              value="Plex 1" 
              subtitle="X0Y0Z0 Proof Case" 
            />
            <StatusCard 
              title="Supabase" 
              value="Connected" 
              status="ok"
              subtitle="3 tables + edge fn" 
            />
            <StatusCard 
              title="LLM" 
              value="Ready" 
              status="warning"
              subtitle="Needs API key secret" 
            />
            <StatusCard 
              title="Auth" 
              value="Open" 
              status="warning"
              subtitle="No user roles yet" 
            />
          </div>
        </section>

        <section className="checklist-section">
          <h2>Phase 1 Checklist</h2>
          <ul className="checklist">
            <li className="done">Schema applied to Supabase (users, frames, shelf)</li>
            <li className="done">React app deployed to Vercel</li>
            <li className="done">Basic UI with face selector</li>
            <li className="done">Theme switching (light/dark)</li>
            <li className="done">Construction dashboard</li>
            <li className="done">Edge function deployed (generate)</li>
            <li className="pending">Add ANTHROPIC_API_KEY secret to Supabase</li>
            <li className="pending">Add env vars to Vercel</li>
            <li className="pending">Test LLM generation</li>
            <li className="pending">User authentication</li>
            <li className="pending">Multi-user presence (WebSocket)</li>
          </ul>
        </section>

        <section className="setup-section">
          <h2>Setup Required</h2>
          <div className="setup-instructions">
            <div className="setup-item">
              <h3>1. Supabase Secret</h3>
              <p>Add ANTHROPIC_API_KEY in Supabase Dashboard:</p>
              <code>Project Settings → Edge Functions → Add secret</code>
            </div>
            <div className="setup-item">
              <h3>2. Vercel Environment</h3>
              <p>Add these in Vercel Project Settings → Environment Variables:</p>
              <code>VITE_SUPABASE_URL = https://piqxyfmzzywxzqkzmpmm.supabase.co</code>
              <code>VITE_SUPABASE_ANON_KEY = [from Supabase API settings]</code>
            </div>
          </div>
        </section>

        <section className="links-section">
          <h2>Quick Links</h2>
          <div className="quick-links">
            <a href="https://github.com/happyseaurchin/xstream" target="_blank" rel="noopener">
              📦 GitHub Repository
            </a>
            <a href="https://supabase.com/dashboard/project/piqxyfmzzywxzqkzmpmm" target="_blank" rel="noopener">
              🗄️ Supabase Dashboard
            </a>
            <a href="https://supabase.com/dashboard/project/piqxyfmzzywxzqkzmpmm/functions" target="_blank" rel="noopener">
              ⚡ Edge Functions
            </a>
            <a href="https://vercel.com/happyseaurchins-projects/xstream/settings/environment-variables" target="_blank" rel="noopener">
              ▲ Vercel Env Vars
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}

interface StatusCardProps {
  title: string
  value: string
  subtitle?: string
  status?: 'ok' | 'warning' | 'error' | 'pending'
}

function StatusCard({ title, value, subtitle, status }: StatusCardProps) {
  return (
    <div className={`status-card ${status || ''}`}>
      <div className="status-title">{title}</div>
      <div className="status-value">{value}</div>
      {subtitle && <div className="status-subtitle">{subtitle}</div>}
    </div>
  )
}
