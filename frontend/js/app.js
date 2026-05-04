// ─── Root App Component ───────────────────────────────────────────────────────

const TABS = [
  { id: "athlete",     label: "Athlete",      icon: "user" },
  { id: "calendar",   label: "Calendar",     icon: "calendar" },
  { id: "mealplan",   label: "Meal Plan",    icon: "apple" },
  { id: "foodswaps",  label: "Food Swaps",   icon: "repeat" },
  { id: "supplements",label: "Supplements",  icon: "pill" },
  { id: "workout",    label: "Workout Plan", icon: "dumbbell" },
  { id: "admin",      label: "Admin",        icon: "settings" },
];

function App() {
  const [athletes, setAthletes]       = useState([]);
  const [athleteId, setAthleteId]     = useState(null);
  const [tab, setTab]                 = useState("athlete");
  const [loading, setLoading]         = useState(true);
  const [version, setVersion]         = useState({ major:1, minor:0, tiny:0, notes:"" });
  const [showVer, setShowVer]         = useState(false);
  const [showManage, setShowManage]   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const menuRef                       = useRef(null);
  const toast                         = useToast();

  useEffect(() => {
    loadAthletes();
    apiGet("/version").then(setVersion).catch(() => {});
  }, []);

  // Close athlete menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadAthletes() {
    try {
      const data = await apiGet("/athletes");
      setAthletes(data);
      if (data.length > 0 && !athleteId) {
        setAthleteId(data[0].id);
      } else if (data.length === 0) {
        setShowManage(true);
      }
    } catch (err) {
      toast.show("Failed to load athletes", "error");
    }
    setLoading(false);
  }

  async function saveVersion(v) {
    const u = await apiPut("/version", v);
    setVersion(u);
    toast.show(`Version set to v${u.major}.${u.minor}.${u.tiny}`, "success");
  }

  function initials(name) {
    return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }

  const currentAthlete = athletes.find(a => a.id === athleteId);
  const units = currentAthlete?.units || "metric";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <Spinner />
        <div style={{ color: "var(--muted)", marginTop: 12, fontSize: 13 }}>Loading BodyBuilder…</div>
      </div>
    </div>
  );

  return (
    <div id="root">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <Icon name="dumbbell" size={22} color="var(--accent)" />
          <span>Body<span className="brand-sub">Builder</span></span>
        </div>

        <div className="header-right">
          {/* Athlete Switcher */}
          <div className="athlete-switcher" ref={menuRef}>
            <button
              className={"athlete-btn" + (menuOpen ? " open" : "")}
              onClick={() => setMenuOpen(o => !o)}
            >
              <div className="avatar">{initials(currentAthlete?.name)}</div>
              <span className="name">{currentAthlete?.name || "Select Athlete"}</span>
              <Icon name="chevron_down" size={14} className="chevron" />
            </button>

            {menuOpen && (
              <div className="athlete-menu">
                <div className="athlete-menu-header">Athletes</div>
                {athletes.map(a => (
                  <div
                    key={a.id}
                    className={"athlete-menu-item" + (a.id === athleteId ? " active" : "")}
                    onClick={() => { setAthleteId(a.id); setMenuOpen(false); setTab("athlete"); }}
                  >
                    <div className="item-avatar">{initials(a.name)}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.name || "Unnamed"}</div>
                      {a.email && <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.email}</div>}
                    </div>
                    {a.id === athleteId && <Icon name="check" size={14} color="var(--accent)" style={{ marginLeft: "auto" }} />}
                  </div>
                ))}
                <div className="athlete-menu-divider" />
                <div className="athlete-menu-item" onClick={() => { setShowManage(true); setMenuOpen(false); }}>
                  <div className="item-avatar manage"><Icon name="users" size={14} color="var(--text2)" /></div>
                  <span>Manage Athletes</span>
                </div>
              </div>
            )}
          </div>

          {/* Version */}
          <div className="version-badge" onClick={() => setShowVer(true)} title="Click to set version">
            v{version.major}.{version.minor}.{version.tiny}
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="app-tabs">
        {TABS.map(t => (
          <div key={t.id} className={"tab-item" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={15} />
            {t.label}
          </div>
        ))}
      </nav>

      {/* ── Content ── */}
      {athleteId ? (
        <main className="app-content" key={athleteId}>
          {tab === "athlete"      && <AthleteSettingsTab athleteId={athleteId} toast={toast} onAthleteUpdated={loadAthletes} />}
          {tab === "calendar"     && <CalendarTab        athleteId={athleteId} toast={toast} />}
          {tab === "mealplan"     && <MealPlanTab        athleteId={athleteId} toast={toast} units={units} />}
          {tab === "foodswaps"    && <FoodSwapsTab       athleteId={athleteId} toast={toast} />}
          {tab === "supplements"  && <SupplementsTab     athleteId={athleteId} toast={toast} />}
          {tab === "workout"      && <WorkoutPlanTab     athleteId={athleteId} toast={toast} units={units} />}
          {tab === "admin"        && <AdminTab           athleteId={athleteId} toast={toast} athletes={athletes} />}
        </main>
      ) : (
        <main className="app-content">
          <EmptyState icon="user" title="No Athlete Selected"
            message="Create your first athlete to get started."
            action={<button className="btn btn-primary" onClick={() => setShowManage(true)}><Icon name="plus" size={14}/>Create Athlete</button>}
          />
        </main>
      )}

      {/* ── Dialogs ── */}
      {showVer && <VersionDialog current={version} onSave={saveVersion} onClose={() => setShowVer(false)} />}
      {showManage && (
        <ManageAthletesDialog
          athletes={athletes}
          currentId={athleteId}
          onSwitch={id => { setAthleteId(id); setTab("athlete"); }}
          onRefresh={loadAthletes}
          onClose={() => setShowManage(false)}
          toast={toast}
        />
      )}

      {toast.Toaster}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
