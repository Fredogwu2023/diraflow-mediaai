import { useEffect, useState } from 'react'
import diraflowLogo from './assets/Diraflow-MediaAI-logo.png'
import './App.css'

const navigation = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Create', icon: '+' },
  { label: 'Live News', icon: '◉' },
  { label: 'AI Presenter', icon: '♙' },
  { label: 'Projects', icon: '▣' },
  { label: 'Media', icon: '▤' },
  { label: 'Voices', icon: '♫' },
  { label: 'Brand Kit', icon: '◇' },
  { label: 'Analytics', icon: '↗' },
]

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health')

        if (!response.ok) {
          throw new Error('API health check failed')
        }

        const data = await response.json()

        if (data.success && data.database === 'connected') {
          setApiStatus('connected')
        } else {
          setApiStatus('degraded')
        }
      } catch (error) {
        console.error('DiraFlow API health check failed:', error)
        setApiStatus('offline')
      }
    }

    checkApiHealth()
  }, [])

  const renderPageContent = () => {
    if (activePage === 'Dashboard') {
      return (
        <>
          <section className="welcome-section">
            <div>
              <p className="eyebrow">COMMAND CENTER</p>

              <h1>Good morning, Creator.</h1>

              <p className="welcome-text">
                Turn ideas, documents and news into professional AI-powered
                media.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => setActivePage('Create')}
            >
              <span>+</span>
              Create Content
            </button>
          </section>

          <section className="quick-create">
            <div className="section-heading">
              <div>
                <h2>What would you like to create?</h2>
                <p>Start a new AI-powered production.</p>
              </div>
            </div>

            <div className="creation-grid">
              <button
                className="creation-card"
                onClick={() => setActivePage('Create')}
              >
                <div className="creation-icon document-icon">▤</div>

                <div>
                  <h3>Document to Video</h3>

                  <p>
                    Transform documents into engaging presentations.
                  </p>
                </div>

                <span className="card-arrow">→</span>
              </button>

              <button
                className="creation-card"
                onClick={() => setActivePage('AI Presenter')}
              >
                <div className="creation-icon presenter-icon">♙</div>

                <div>
                  <h3>AI Presenter</h3>

                  <p>
                    Create a presentation with an AI human presenter.
                  </p>
                </div>

                <span className="card-arrow">→</span>
              </button>

              <button
                className="creation-card"
                onClick={() => setActivePage('Live News')}
              >
                <div className="creation-icon news-icon">◉</div>

                <div>
                  <h3>Live News</h3>

                  <p>
                    Generate an AI-powered news presentation.
                  </p>
                </div>

                <span className="card-arrow">→</span>
              </button>
            </div>
          </section>

          <section className="dashboard-grid">
            <div className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Projects</h2>

                  <p>Your latest media productions.</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActivePage('Projects')}
                >
                  View all
                </button>
              </div>

              <div className="empty-state">
                <div className="empty-icon">▣</div>

                <h3>No projects yet</h3>

                <p>
                  Your completed and in-progress productions will appear here.
                </p>

                <button
                  className="secondary-button"
                  onClick={() => setActivePage('Create')}
                >
                  Start your first project
                </button>
              </div>
            </div>

            <div className="panel status-panel">
              <div className="panel-heading">
                <div>
                  <h2>MediaAI Status</h2>

                  <p>Platform services</p>
                </div>

                <span className={`status-dot status-${apiStatus}`}>
                  <span></span>

                  {apiStatus === 'checking' && 'Checking'}

                  {apiStatus === 'connected' && 'Operational'}

                  {apiStatus === 'degraded' && 'Degraded'}

                  {apiStatus === 'offline' && 'Offline'}
                </span>
              </div>

              <div className="status-list">
                <div className="status-row">
                  <span>API Service</span>

                  <strong>
                    {apiStatus === 'connected'
                      ? 'Connected'
                      : apiStatus === 'checking'
                        ? 'Checking'
                        : 'Unavailable'}
                  </strong>
                </div>

                <div className="status-row">
                  <span>Database</span>

                  <strong>
                    {apiStatus === 'connected'
                      ? 'Connected'
                      : apiStatus === 'checking'
                        ? 'Checking'
                        : 'Unavailable'}
                  </strong>
                </div>

                <div className="status-row">
                  <span>AI Content Engine</span>

                  <strong>Ready</strong>
                </div>

                <div className="status-row">
                  <span>Media Processing</span>

                  <strong>Ready</strong>
                </div>
              </div>
            </div>
          </section>
        </>
      )
    }

    return (
      <section className="page-placeholder">
        <p className="eyebrow">DIRAFLOW MEDIAAI</p>

        <h1>{activePage}</h1>

        <p>
          The {activePage.toLowerCase()} workspace is being prepared as part
          of the DiraFlow MediaAI platform.
        </p>

        <button
          className="primary-button"
          onClick={() => setActivePage('Dashboard')}
        >
          ← Back to Command Center
        </button>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src={diraflowLogo}
            className="diraflow-logo"
            alt="DiraFlow MediaAI"
          />

          <span className="brand-product">MediaAI</span>
        </div>

        <div className="workspace-selector">
          <div className="workspace-avatar">D</div>

          <div className="workspace-info">
            <span>Workspace</span>

            <strong>My Workspace</strong>
          </div>

          <span className="workspace-chevron">⌄</span>
        </div>

        <nav className="navigation">
          <p className="nav-label">WORKSPACE</p>

          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                activePage === item.label ? 'active' : ''
              }`}
              onClick={() => setActivePage(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>

              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${
              activePage === 'Settings' ? 'active' : ''
            }`}
            onClick={() => setActivePage('Settings')}
          >
            <span className="nav-icon">⚙</span>

            <span>Settings</span>
          </button>

          <div className="lms-brand">
            <span className="powered-by">Powered by</span>

            <div className="lms-logo-placeholder">
              LMS
            </div>

            <strong>Lewisham Multi Solutions Limited</strong>
          </div>

          <div className="sidebar-version">
            DiraFlow MediaAI · v1.0
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>DiraFlow MediaAI</span>

            <span>/</span>

            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" title="Notifications">
              ♧
            </button>

            <div className="user-profile">
              <div className="user-avatar">FO</div>

              <div className="user-details">
                <strong>Creator</strong>

                <span>Workspace Owner</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {renderPageContent()}
        </div>
      </main>
    </div>
  )
}

export default App