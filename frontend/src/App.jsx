import { useEffect, useState } from 'react';
import './App.css';
import {
  getPlayers,
  getPlayerById,
  getPlayerFull,
  getPlayerTraining,
  getPlayerRelationships,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getCoachTeams,
  getCoachPlayers,
  getCoachPlayerTraining,
  getTournaments,
  getTournamentById,
  getTournamentTeams,
  getTournamentPlayers,
  createTournament,
  updateTournament,
  deleteTournament,
  getTeamPlayers,
  getTrainingByPlayer,
  createTrainingSession,
  updateTrainingSession,
  deleteTrainingSession,
  assignPlayerToTeam,
  assignCoachToTeam,
  addTeamToTournament
} from './api';

const SPORTS_LIST = ['ALL', 'Football', 'Cricket', 'Badminton', 'Swimming'];

const KNOWN_COACHES = [
  { id: 'C101', name: 'Rahul Sharma', role: 'Head Coach (Football & Cricket)', experience: '12 Years' },
  { id: 'C102', name: 'Meena Iyer', role: 'High Performance Coach (Badminton)', experience: '9 Years' },
  { id: 'C103', name: 'Suresh Menon', role: 'Aquatic Director (Swimming)', experience: '15 Years' }
];

const KNOWN_TEAMS = [
  { id: 'TEAM01', name: 'National Football Squad', sport: 'Football', category: 'Senior National' },
  { id: 'TEAM02', name: 'Chennai Cricket Academy', sport: 'Cricket', category: 'First Class' },
  { id: 'TEAM03', name: 'Bangalore Shuttlers', sport: 'Badminton', category: 'Elite Circuit' },
  { id: 'TEAM04', name: 'Aqua Swim Club', sport: 'Swimming', category: 'Aquatics Division' }
];

function resolveTeamSport(t) {
  if (t && t.sport && t.sport !== 'Multi-Sport' && t.sport !== '-') return t.sport;
  const match = KNOWN_TEAMS.find(kt => kt.id === (t?.id || t?.teamId) || kt.name === (t?.name || t?.teamName));
  if (match) return match.sport;
  const name = (t?.name || t?.teamName || '').toLowerCase();
  if (name.includes('football')) return 'Football';
  if (name.includes('cricket')) return 'Cricket';
  if (name.includes('shuttler') || name.includes('badminton')) return 'Badminton';
  if (name.includes('swim') || name.includes('aqua')) return 'Swimming';
  return 'Football';
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('players');
  const [theme, setTheme] = useState('dark');

  // Notification Banner
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // ─── Players State ──────────────────────────────────────────────────────────
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('ALL');

  // Selected Player Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [fullProfileData, setFullProfileData] = useState(null);

  // Athlete Create/Edit Modal
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [playerFormData, setPlayerFormData] = useState({
    _id: '',
    name: '',
    age: 21,
    gender: 'Male',
    sport: 'Football',
    position: 'Midfielder',
    email: '',
    phone: ''
  });

  // ─── Coach State ────────────────────────────────────────────────────────────
  const [selectedCoach, setSelectedCoach] = useState(KNOWN_COACHES[0]);
  const [coachTeams, setCoachTeams] = useState([]);
  const [coachRoster, setCoachRoster] = useState([]);
  const [coachTrainingMatrix, setCoachTrainingMatrix] = useState([]);
  const [loadingCoachData, setLoadingCoachData] = useState(false);

  // ─── Tournaments State ──────────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [tournamentDetailModal, setTournamentDetailModal] = useState(false);
  const [activeTournament, setActiveTournament] = useState(null);
  const [tournamentTeams, setTournamentTeams] = useState([]);
  const [tournamentAthletes, setTournamentAthletes] = useState([]);
  const [loadingTournamentDetails, setLoadingTournamentDetails] = useState(false);

  // Tournament Create Modal
  const [tournamentModalOpen, setTournamentModalOpen] = useState(false);
  const [tournamentFormData, setTournamentFormData] = useState({
    _id: '',
    name: '',
    sport: 'Football',
    startDate: '2026-04-10',
    endDate: '2026-04-25',
    location: 'Bangalore National Stadium',
    prizePool: 500000,
    status: 'Upcoming'
  });

  // ─── Teams State ────────────────────────────────────────────────────────────
  const [selectedTeam, setSelectedTeam] = useState(KNOWN_TEAMS[0]);
  const [teamRoster, setTeamRoster] = useState([]);
  const [loadingTeamRoster, setLoadingTeamRoster] = useState(false);

  // ─── Training Logs State ───────────────────────────────────────────────────
  const [trainingPlayerId, setTrainingPlayerId] = useState('');
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [loadingTrainingLogs, setLoadingTrainingLogs] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [trainingFormData, setTrainingFormData] = useState({
    _id: '',
    playerId: '',
    date: '2026-04-01',
    durationMinutes: 90,
    fitnessScore: 8.5,
    distanceKm: 6.2,
    coachFeedback: 'High pace agility drills completed with excellent consistency.'
  });

  // ─── Connections Manager State (By Names) ──────────────────────────────────
  const [relFormType, setRelFormType] = useState('player-team');
  const [relPlayerId, setRelPlayerId] = useState('');
  const [relCoachId, setRelCoachId] = useState(KNOWN_COACHES[0].id);
  const [relTeamId, setRelTeamId] = useState(KNOWN_TEAMS[0].id);
  const [relTournamentId, setRelTournamentId] = useState('');
  const [relSubmitting, setRelSubmitting] = useState(false);

  // ─── Theme Management ───────────────────────────────────────────────────────
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const showNotification = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 4500);
  };

  // ─── Initial Load ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadPlayers();
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedCoach) {
      loadCoachData(selectedCoach.id);
    }
  }, [selectedCoach]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamRoster(selectedTeam.id);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (trainingPlayerId) {
      loadPlayerTrainingLogs(trainingPlayerId);
    }
  }, [trainingPlayerId]);

  // ─── Data Loaders ───────────────────────────────────────────────────────────

  async function loadPlayers(sport = selectedSport) {
    setLoadingPlayers(true);
    try {
      const data = await getPlayers(sport === 'ALL' ? '' : sport);
      const playerList = Array.isArray(data) ? data : [];
      setPlayers(playerList);
      if (playerList.length > 0 && !trainingPlayerId) {
        setTrainingPlayerId(playerList[0]._id || playerList[0].id);
      }
      if (playerList.length > 0 && !relPlayerId) {
        setRelPlayerId(playerList[0]._id || playerList[0].id);
      }
    } catch (err) {
      showNotification(`ERROR LOADING PLAYERS: ${err.message}`, 'error');
    } finally {
      setLoadingPlayers(false);
    }
  }

  async function loadTournaments() {
    setLoadingTournaments(true);
    try {
      const data = await getTournaments();
      const tList = Array.isArray(data) ? data : [];
      setTournaments(tList);
      if (tList.length > 0 && !relTournamentId) {
        setRelTournamentId(tList[0]._id || tList[0].id);
      }
    } catch (err) {
      showNotification(`ERROR LOADING TOURNAMENTS: ${err.message}`, 'error');
    } finally {
      setLoadingTournaments(false);
    }
  }

  async function loadCoachData(coachId) {
    setLoadingCoachData(true);
    try {
      const [teamsRes, rosterRes, matrixRes] = await Promise.allSettled([
        getCoachTeams(coachId),
        getCoachPlayers(coachId),
        getCoachPlayerTraining(coachId)
      ]);
      setCoachTeams(teamsRes.status === 'fulfilled' && Array.isArray(teamsRes.value) ? teamsRes.value : []);
      setCoachRoster(rosterRes.status === 'fulfilled' && Array.isArray(rosterRes.value) ? rosterRes.value : []);
      setCoachTrainingMatrix(matrixRes.status === 'fulfilled' && Array.isArray(matrixRes.value) ? matrixRes.value : []);
    } catch (err) {
      showNotification(`ERROR LOADING COACH DATA: ${err.message}`, 'error');
    } finally {
      setLoadingCoachData(false);
    }
  }

  async function loadTeamRoster(teamId) {
    setLoadingTeamRoster(true);
    try {
      const data = await getTeamPlayers(teamId);
      setTeamRoster(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotification(`ERROR LOADING TEAM ROSTER: ${err.message}`, 'error');
    } finally {
      setLoadingTeamRoster(false);
    }
  }

  async function loadPlayerTrainingLogs(pId) {
    setLoadingTrainingLogs(true);
    try {
      const data = await getTrainingByPlayer(pId);
      setTrainingLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotification(`ERROR LOADING TRAINING LOGS: ${err.message}`, 'error');
    } finally {
      setLoadingTrainingLogs(false);
    }
  }

  // ─── Athlete Profile Action ─────────────────────────────────────────────────

  async function openFullProfile(playerId) {
    setLoadingProfile(true);
    setProfileModalOpen(true);
    try {
      const fullData = await getPlayerFull(playerId);
      setFullProfileData(fullData);
    } catch (err) {
      showNotification(`FAILED TO FETCH FULL PROFILE: ${err.message}`, 'error');
    } finally {
      setLoadingProfile(false);
    }
  }

  // ─── Athlete Form Actions ───────────────────────────────────────────────────

  function openCreatePlayerModal() {
    setIsEditingPlayer(false);
    const nextId = `P${Math.floor(100 + Math.random() * 900)}`;
    setPlayerFormData({
      _id: nextId,
      name: '',
      age: 22,
      gender: 'Male',
      sport: 'Football',
      position: 'Forward',
      email: '',
      phone: ''
    });
    setPlayerModalOpen(true);
  }

  function openEditPlayerModal(p) {
    setIsEditingPlayer(true);
    setPlayerFormData({
      _id: p._id || p.id,
      name: p.name || p.playerName || '',
      age: p.age || 20,
      gender: p.gender || 'Male',
      sport: p.sport || 'Football',
      position: p.position || '',
      email: p.contact_info?.email || p.contact?.email || p.email || '',
      phone: p.contact_info?.phone || p.contact?.phone || p.phone || ''
    });
    setPlayerModalOpen(true);
  }

  async function handleSavePlayer(e) {
    e.preventDefault();
    try {
      if (isEditingPlayer) {
        await updatePlayer(playerFormData._id, playerFormData);
        showNotification(`ATHLETE [${playerFormData.name}] UPDATED SUCCESSFULLY`, 'success');
      } else {
        await createPlayer(playerFormData);
        showNotification(`ATHLETE [${playerFormData.name}] REGISTERED IN PLATFORM`, 'success');
      }
      setPlayerModalOpen(false);
      loadPlayers();
    } catch (err) {
      showNotification(`ERROR: ${err.message}`, 'error');
    }
  }

  async function handleDeletePlayer(id, name) {
    if (!window.confirm(`CONFIRM DELETION: Remove athlete ${name || id} from platform?`)) return;
    try {
      await deletePlayer(id);
      showNotification(`ATHLETE [${name || id}] REMOVED FROM PLATFORM`, 'success');
      loadPlayers();
      if (profileModalOpen) setProfileModalOpen(false);
    } catch (err) {
      showNotification(`DELETE FAILED: ${err.message}`, 'error');
    }
  }

  // ─── Tournament Actions ─────────────────────────────────────────────────────

  async function openTournamentDetails(t) {
    setActiveTournament(t);
    setTournamentDetailModal(true);
    setLoadingTournamentDetails(true);
    const tId = t._id || t.id;
    try {
      const [teamsRes, athletesRes] = await Promise.allSettled([
        getTournamentTeams(tId),
        getTournamentPlayers(tId)
      ]);
      setTournamentTeams(teamsRes.status === 'fulfilled' && Array.isArray(teamsRes.value) ? teamsRes.value : []);
      setTournamentAthletes(athletesRes.status === 'fulfilled' && Array.isArray(athletesRes.value) ? athletesRes.value : []);
    } catch (err) {
      showNotification(`FAILED TO LOAD TOURNAMENT PARTICIPANTS: ${err.message}`, 'error');
    } finally {
      setLoadingTournamentDetails(false);
    }
  }

  async function handleSaveTournament(e) {
    e.preventDefault();
    try {
      await createTournament(tournamentFormData);
      showNotification(`TOURNAMENT [${tournamentFormData.name}] RECORDED`, 'success');
      setTournamentModalOpen(false);
      loadTournaments();
    } catch (err) {
      showNotification(`ERROR: ${err.message}`, 'error');
    }
  }

  async function handleDeleteTournament(id, name) {
    if (!window.confirm(`CONFIRM DELETION: Remove tournament [${name || id}]?`)) return;
    try {
      await deleteTournament(id);
      showNotification(`TOURNAMENT [${name || id}] REMOVED`, 'success');
      loadTournaments();
      setTournamentDetailModal(false);
    } catch (err) {
      showNotification(`DELETE FAILED: ${err.message}`, 'error');
    }
  }

  // ─── Training Session Actions ───────────────────────────────────────────────

  async function handleSaveTrainingSession(e) {
    e.preventDefault();
    try {
      const sessionId = trainingFormData._id || `TS${Math.floor(1000 + Math.random() * 9000)}`;
      const targetPlayerId = trainingFormData.playerId || trainingPlayerId;
      const targetPlayer = players.find(p => (p._id || p.id) === targetPlayerId);
      const playerName = targetPlayer ? (targetPlayer.name || targetPlayer.playerName) : targetPlayerId;

      const payload = {
        _id: sessionId,
        playerId: targetPlayerId,
        date: trainingFormData.date || new Date().toISOString().split('T')[0],
        durationMinutes: Number(trainingFormData.durationMinutes || 60),
        fitnessScore: Number(trainingFormData.fitnessScore || 8),
        coachFeedback: trainingFormData.coachFeedback || 'Routine completed successfully.',
        metrics: {
          distanceKm: Number(trainingFormData.distanceKm || 5.0),
          steps: 6500,
          calories: 450,
          averageHeartRate: 135,
          maximumHeartRate: 165
        }
      };

      await createTrainingSession(payload);
      showNotification(`TRAINING SESSION LOGGED FOR [${playerName}]`, 'success');
      setTrainingModalOpen(false);
      loadPlayerTrainingLogs(targetPlayerId);
      if (selectedCoach) loadCoachData(selectedCoach.id);
    } catch (err) {
      showNotification(`LOGGING FAILED: ${err.message}`, 'error');
    }
  }

  async function handleDeleteTrainingSession(id) {
    if (!window.confirm(`CONFIRM DELETION: Remove training session?`)) return;
    try {
      await deleteTrainingSession(id);
      showNotification(`TRAINING SESSION REMOVED`, 'success');
      loadPlayerTrainingLogs(trainingPlayerId);
      if (selectedCoach) loadCoachData(selectedCoach.id);
    } catch (err) {
      showNotification(`DELETE FAILED: ${err.message}`, 'error');
    }
  }

  // ─── Connections Actions (Using Names) ─────────────────────────────────────

  async function handleCreateRelationship(e) {
    e.preventDefault();
    setRelSubmitting(true);
    try {
      const targetPlayer = players.find(p => (p._id || p.id) === relPlayerId);
      const targetCoach = KNOWN_COACHES.find(c => c.id === relCoachId);
      const targetTeam = KNOWN_TEAMS.find(t => t.id === relTeamId);
      const targetTournament = tournaments.find(t => (t._id || t.id) === relTournamentId);

      const pName = targetPlayer?.name || targetPlayer?.playerName || 'Selected Athlete';
      const cName = targetCoach?.name || 'Selected Coach';
      const tName = targetTeam?.name || 'Selected Team';
      const trnName = targetTournament?.name || 'Selected Tournament';

      if (relFormType === 'player-team') {
        await assignPlayerToTeam({ playerId: relPlayerId, teamId: relTeamId });
        showNotification(`AFFILIATION CREATED: ${pName} joined ${tName}`, 'success');
      } else if (relFormType === 'coach-team') {
        await assignCoachToTeam({ coachId: relCoachId, teamId: relTeamId });
        showNotification(`TEAM LEADERSHIP: ${cName} assigned to lead ${tName}`, 'success');
      } else if (relFormType === 'team-tournament') {
        await addTeamToTournament({ teamId: relTeamId, tournamentId: relTournamentId });
        showNotification(`REGISTRATION: ${tName} registered for ${trnName}`, 'success');
      }
      loadPlayers();
      if (selectedCoach) loadCoachData(selectedCoach.id);
      if (selectedTeam) loadTeamRoster(selectedTeam.id);
    } catch (err) {
      showNotification(`CONNECTION ERROR: ${err.message}`, 'error');
    } finally {
      setRelSubmitting(false);
    }
  }

  // ─── Derived Data & Helper Lookups ──────────────────────────────────────────

  // Filtered Players
  const filteredPlayers = players.filter(p => {
    const q = searchQuery.toLowerCase();
    const pName = p.name || p.playerName || '';
    const pPos = p.position || '';
    const matchQuery = !q || pName.toLowerCase().includes(q) || pPos.toLowerCase().includes(q);
    const matchSport = selectedSport === 'ALL' || p.sport === selectedSport;
    return matchQuery && matchSport;
  });

  // Flattened Coach Training Sessions (Cross-DB query results)
  const flattenedCoachSessions = coachTrainingMatrix.flatMap(athlete => {
    const sessions = athlete.trainingSessions || [];
    if (sessions.length === 0) {
      return [{
        athleteName: athlete.playerName || athlete.name || 'Athlete Record',
        athleteSport: athlete.sport || 'General',
        sessionId: '-',
        date: '-',
        durationMinutes: '-',
        drills: '-',
        fitnessScore: '-',
        coachFeedback: 'No sessions logged yet'
      }];
    }
    return sessions.map(s => {
      const metricInfo = s.metrics
        ? `${s.metrics.distanceKm || 0} km | ${s.metrics.calories || 0} kcal | ${s.metrics.averageHeartRate || 0} bpm`
        : '-';
      return {
        athleteName: athlete.playerName || athlete.name || 'Athlete Record',
        athleteSport: athlete.sport || 'General',
        sessionId: s.sessionId || s._id || '-',
        date: s.date ? String(s.date).split('T')[0] : '-',
        durationMinutes: s.durationMinutes || s.duration || '-',
        drills: s.drills || metricInfo,
        fitnessScore: s.fitnessScore || '8.0',
        coachFeedback: s.coachFeedback || s.notes || 'Routine completed'
      };
    });
  });

  const totalCoachSessionsCount = coachTrainingMatrix.reduce(
    (sum, a) => sum + (a.trainingSessions?.length || 0),
    0
  );

  // Connection Preview Text Generator
  function getConnectionPreviewText() {
    const p = players.find(x => (x._id || x.id) === relPlayerId);
    const c = KNOWN_COACHES.find(x => x.id === relCoachId);
    const t = KNOWN_TEAMS.find(x => x.id === relTeamId);
    const trn = tournaments.find(x => (x._id || x.id) === relTournamentId);

    const pName = p?.name || p?.playerName || 'Selected Athlete';
    const cName = c?.name || 'Selected Coach';
    const tName = t?.name || 'Selected Team';
    const trnName = trn?.name || 'Selected Tournament';

    if (relFormType === 'player-team') return `${pName} will be enrolled as an active roster member of ${tName}. Head coach will mentor them through the team.`;
    if (relFormType === 'coach-team') return `${cName} will assume head coaching duties for ${tName}.`;
    if (relFormType === 'team-tournament') return `${tName} will enter as a participating team in ${trnName}.`;
    return 'Confirm connection parameters.';
  }

  return (
    <div className="app-container">
      {/* ─── Brutalist Header & Status Ticker ──────────────────────────────── */}
      <header className="brutal-header">
        <div className="brutal-ticker">
          <div className="brutal-ticker-left">
            <span>// VERIFIED_ATHLETICS_NETWORK</span>
            <span>// REAL_TIME_SYNC</span>
            <span>// SYSTEM_STATUS: OPERATIONAL</span>
          </div>
          <div>
            <span>PLATFORM: ACTIVE</span>
          </div>
        </div>

        <div className="brutal-nav-row">
          <div className="brutal-brand" onClick={() => setActiveTab('players')}>
            <div className="brutal-brand-title">
              PRO//SPORT
              <span className="brutal-brand-tag">v2.4</span>
            </div>
            <div className="brutal-brand-sub">SPORTS_INTELLIGENCE_PLATFORM</div>
          </div>

          <nav className="brutal-nav-links">
            {[
              { id: 'players', num: '01', label: 'ATHLETES' },
              { id: 'coaches', num: '02', label: 'COACHES' },
              { id: 'tournaments', num: '03', label: 'TOURNAMENTS' },
              { id: 'teams', num: '04', label: 'TEAMS' },
              { id: 'training', num: '05', label: 'TRAINING_LOGS' },
              { id: 'relations', num: '06', label: 'CONNECTIONS' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`brutal-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="nav-idx">{tab.num} //</span>
                <span className="nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="brutal-nav-actions">
            <button onClick={toggleTheme} className="brutal-theme-toggle" title="Toggle Light/Dark Theme">
              [ {theme === 'dark' ? 'LIGHT_MODE' : 'DARK_MODE'} ]
            </button>
          </div>
        </div>
      </header>

      {/* ─── Notification Bar ────────────────────────────────────────────── */}
      {statusMessage.text && (
        <div
          style={{
            backgroundColor: statusMessage.type === 'error' ? '#2b0f0f' : '#142918',
            color: statusMessage.type === 'error' ? '#ff4d4d' : '#4dff79',
            borderBottom: '2px solid var(--steel-color)',
            padding: '10px 24px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>[ {statusMessage.type} ] {statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage({ text: '', type: '' })}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 900
            }}
          >
            [X]
          </button>
        </div>
      )}

      {/* ─── Main Content Views ────────────────────────────────────────────── */}
      <main className="main-content">

        {/* ══════════════════════════════════════════════════════════════════
            01 // ATHLETES MODULE
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'players' && (
          <section>
            <div className="section-header">
              <div>
                <h1 className="section-header-title">
                  ATHLETE DIRECTORY
                </h1>
                <p className="section-header-sub">
                  Browse, manage, and verify official athlete records across sports clubs and academies.
                </p>
              </div>
              <div>
                <button onClick={openCreatePlayerModal} className="brutal-btn brutal-btn-accent">
                  + REGISTER NEW ATHLETE
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-box-label">TOTAL ATHLETES</div>
                <div className="stat-box-value">{players.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">FILTER MATCHES</div>
                <div className="stat-box-value">{filteredPlayers.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">SPORT DISCIPLINES</div>
                <div className="stat-box-value">{SPORTS_LIST.length - 1}</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="brutal-filter-bar">
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  placeholder="SEARCH BY ATHLETE NAME OR POSITION..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="brutal-input"
                />
              </div>

              <div className="brutal-filter-group">
                <span className="brutal-label">SPORT:</span>
                {SPORTS_LIST.map(sport => (
                  <button
                    key={sport}
                    onClick={() => {
                      setSelectedSport(sport);
                      loadPlayers(sport);
                    }}
                    className={`brutal-tag-btn ${selectedSport === sport ? 'active' : ''}`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>

            {/* Athlete Cards Grid */}
            {loadingPlayers ? (
              <div className="brutal-empty-state">
                <div className="brutal-empty-title">LOADING ATHLETE RECORDS...</div>
                <div className="brutal-empty-text">Retrieving registered sports profiles</div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="brutal-empty-state">
                <div className="brutal-empty-title">NO ATHLETE RECORDS FOUND</div>
                <div className="brutal-empty-text">No athletes match the current search or sport filter.</div>
              </div>
            ) : (
              <div className="grid-cards">
                {filteredPlayers.map(p => {
                  const id = p._id || p.id;
                  const name = p.name || p.playerName || 'Athlete Record';
                  return (
                    <div key={id} className="brutal-card">
                      <div className="brutal-card-header">
                        <div className="brutal-card-title">
                          <span>{name}</span>
                        </div>
                        <span className="brutal-badge brutal-badge-accent">{p.sport || 'General'}</span>
                      </div>

                      <div className="brutal-card-body">
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="brutal-badge">{p.position || 'Player'}</span>
                          <span className="brutal-badge">AGE: {p.age || '-'}</span>
                          <span className="brutal-badge">{p.gender || '-'}</span>
                          {(p.teamName || p.team) && (
                            <span className="brutal-badge brutal-badge-accent">{p.teamName || p.team}</span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--concrete-dark)', marginTop: '4px' }}>
                          <div>CONTACT: {p.contact_info?.email || p.contact?.email || p.email || 'N/A'}</div>
                          <div>PHONE: {p.contact_info?.phone || p.contact?.phone || p.phone || 'N/A'}</div>
                        </div>
                      </div>

                      <div className="brutal-card-footer">
                        <button
                          onClick={() => openFullProfile(id)}
                          className="brutal-btn brutal-btn-primary brutal-btn-sm"
                        >
                          FULL PROFILE
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => openEditPlayerModal(p)}
                            className="brutal-btn brutal-btn-sm"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(id, name)}
                            className="brutal-btn brutal-btn-danger brutal-btn-sm"
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            02 // COACHES MODULE
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'coaches' && (
          <section>
            <div className="section-header">
              <div>
                <h1 className="section-header-title">
                  COACHING DIRECTORY
                </h1>
                <p className="section-header-sub">
                  Inspect coach team leadership, athlete mentorship rosters, and session performance matrices.
                </p>
              </div>
            </div>

            {/* Coach Selectors */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {KNOWN_COACHES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCoach(c)}
                  className={`brutal-btn ${selectedCoach.id === c.id ? 'brutal-btn-primary' : ''}`}
                  style={{ flex: 1, minWidth: '220px', textAlign: 'left', padding: '14px 18px' }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800 }}>{c.name}</div>
                    <div style={{ fontSize: '11px', textTransform: 'none', marginTop: '4px' }}>{c.role}</div>
                  </div>
                </button>
              ))}
            </div>

            {loadingCoachData ? (
              <div className="brutal-empty-state">
                <div className="brutal-empty-title">LOADING COACH ROSTER & PERFORMANCE...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="grid-split">
                  {/* Coached Teams */}
                  <div className="brutal-card">
                    <div className="brutal-card-header">
                      <h3 className="brutal-card-title">ASSIGNED TEAMS</h3>
                      <span className="brutal-badge">{coachTeams.length} TEAMS</span>
                    </div>
                    <div className="brutal-card-body">
                      {coachTeams.length === 0 ? (
                        <div style={{ color: 'var(--concrete-dark)', fontSize: '12px' }}>
                          NO TEAM ASSIGNMENTS DETECTED FOR COACH {selectedCoach.name}.
                        </div>
                      ) : (
                        <div className="brutal-table-container">
                          <table className="brutal-table">
                            <thead>
                              <tr>
                                <th>TEAM NAME</th>
                                <th>SPORT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {coachTeams.map((t, idx) => {
                                const teamName = t.name || t.teamName || 'Team Record';
                                const sport = resolveTeamSport(t);
                                return (
                                  <tr key={idx}>
                                    <td><strong>{teamName}</strong></td>
                                    <td><span className="brutal-badge brutal-badge-accent">{sport}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coached Athletes */}
                  <div className="brutal-card">
                    <div className="brutal-card-header">
                      <h3 className="brutal-card-title">MENTORED ATHLETES</h3>
                      <span className="brutal-badge">{coachRoster.length} ATHLETES</span>
                    </div>
                    <div className="brutal-card-body">
                      {coachRoster.length === 0 ? (
                        <div style={{ color: 'var(--concrete-dark)', fontSize: '12px' }}>
                          NO ATHLETES CURRENTLY ASSIGNED TO COACH {selectedCoach.name}.
                        </div>
                      ) : (
                        <div className="brutal-table-container">
                          <table className="brutal-table">
                            <thead>
                              <tr>
                                <th>ATHLETE NAME</th>
                                <th>SPORT</th>
                                <th>ACTION</th>
                              </tr>
                            </thead>
                            <tbody>
                              {coachRoster.map((p, idx) => {
                                const pid = p.id || p.playerId || p._id;
                                const pname = p.name || p.playerName || 'Athlete Record';
                                const psport = p.sport || 'Football';
                                return (
                                  <tr key={pid || idx}>
                                    <td><strong>{pname}</strong></td>
                                    <td><span className="brutal-badge">{psport}</span></td>
                                    <td>
                                      <button
                                        onClick={() => openFullProfile(pid)}
                                        className="brutal-btn brutal-btn-sm"
                                      >
                                        VIEW PROFILE
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Training Sessions Matrix */}
                <div className="brutal-card">
                  <div className="brutal-card-header">
                    <h3 className="brutal-card-title">
                      ATHLETE TRAINING SESSIONS & FEEDBACK
                    </h3>
                    <span className="brutal-badge brutal-badge-accent">
                      {totalCoachSessionsCount} SESSIONS
                    </span>
                  </div>
                  <div className="brutal-card-body">
                    {flattenedCoachSessions.length === 0 || totalCoachSessionsCount === 0 ? (
                      <div style={{ color: 'var(--concrete-dark)', fontSize: '12px' }}>
                        NO TRAINING SESSIONS RECORDED FOR ATHLETES UNDER COACH {selectedCoach.name}.
                      </div>
                    ) : (
                      <div className="brutal-table-container">
                        <table className="brutal-table">
                          <thead>
                            <tr>
                              <th>ATHLETE</th>
                              <th>SESSION ID</th>
                              <th>DATE</th>
                              <th>DURATION</th>
                              <th>DRILLS & METRICS</th>
                              <th>FITNESS SCORE</th>
                              <th>COACH FEEDBACK</th>
                            </tr>
                          </thead>
                          <tbody>
                            {flattenedCoachSessions.map((session, idx) => (
                              <tr key={idx}>
                                <td>
                                  <strong>{session.athleteName}</strong>
                                  <div style={{ fontSize: '11px', color: 'var(--concrete-dark)' }}>{session.athleteSport}</div>
                                </td>
                                <td>{session.sessionId}</td>
                                <td>{session.date}</td>
                                <td>{session.durationMinutes !== '-' ? `${session.durationMinutes} MIN` : '-'}</td>
                                <td>{session.drills}</td>
                                <td><span className="brutal-badge brutal-badge-steel">{session.fitnessScore}</span></td>
                                <td>{session.coachFeedback}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            03 // TOURNAMENTS MODULE
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tournaments' && (
          <section>
            <div className="section-header">
              <div>
                <h1 className="section-header-title">
                  TOURNAMENTS REGISTRY
                </h1>
                <p className="section-header-sub">
                  Inspect tournament fixtures, registered teams, and competing athlete rosters across disciplines.
                </p>
              </div>
              <div>
                <button
                  onClick={() => {
                    const nextId = `T${Math.floor(100 + Math.random() * 900)}`;
                    setTournamentFormData({
                      _id: nextId,
                      name: '',
                      sport: 'Football',
                      startDate: '2026-05-01',
                      endDate: '2026-05-15',
                      location: 'National Sports Complex',
                      prizePool: 1000000,
                      status: 'Upcoming'
                    });
                    setTournamentModalOpen(true);
                  }}
                  className="brutal-btn brutal-btn-accent"
                >
                  + CREATE TOURNAMENT
                </button>
              </div>
            </div>

            {loadingTournaments ? (
              <div className="brutal-empty-state">
                <div className="brutal-empty-title">LOADING TOURNAMENTS...</div>
              </div>
            ) : tournaments.length === 0 ? (
              <div className="brutal-empty-state">
                <div className="brutal-empty-title">NO TOURNAMENTS FOUND</div>
              </div>
            ) : (
              <div className="grid-cards">
                {tournaments.map(t => {
                  const id = t._id || t.id;
                  return (
                    <div key={id} className="brutal-card">
                      <div className="brutal-card-header">
                        <div className="brutal-card-title">{t.name}</div>
                        <span className="brutal-badge brutal-badge-accent">{t.sport || 'Multi-Sport'}</span>
                      </div>
                      <div className="brutal-card-body">
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="brutal-badge brutal-badge-steel">{t.status || 'Active'}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--concrete-dark)', marginTop: '8px' }}>
                          <div>LOCATION: {t.location || 'N/A'}</div>
                          <div>DATES: {t.startDate || t.start_date || '-'} TO {t.endDate || t.end_date || '-'}</div>
                          <div>PRIZE POOL: INR {t.prizePool ? Number(t.prizePool).toLocaleString() : '500,000'}</div>
                        </div>
                      </div>
                      <div className="brutal-card-footer">
                        <button
                          onClick={() => openTournamentDetails(t)}
                          className="brutal-btn brutal-btn-primary brutal-btn-sm"
                        >
                          VIEW PARTICIPANTS
                        </button>
                        <button
                          onClick={() => handleDeleteTournament(id, t.name)}
                          className="brutal-btn brutal-btn-danger brutal-btn-sm"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            04 // TEAMS MODULE
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'teams' && (
          <section>
            <div className="section-header">
              <div>
                <h1 className="section-header-title">
                  TEAMS & ROSTERS
                </h1>
                <p className="section-header-sub">
                  Explore organized sports clubs, franchise squads, and verified athlete memberships.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {KNOWN_TEAMS.map(team => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`brutal-btn ${selectedTeam.id === team.id ? 'brutal-btn-primary' : ''}`}
                  style={{ flex: 1, minWidth: '220px', textAlign: 'left', padding: '14px 18px' }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>{team.name}</div>
                  <div style={{ fontSize: '11px', textTransform: 'none', marginTop: '4px' }}>
                    {team.sport} • {team.category}
                  </div>
                </button>
              ))}
            </div>

            <div className="brutal-card">
              <div className="brutal-card-header">
                <h3 className="brutal-card-title">
                  ACTIVE ROSTER: {selectedTeam.name}
                </h3>
                <span className="brutal-badge brutal-badge-accent">
                  {teamRoster.length} REGISTERED ATHLETES
                </span>
              </div>
              <div className="brutal-card-body">
                {loadingTeamRoster ? (
                  <div className="brutal-empty-state">
                    <div className="brutal-empty-title">LOADING SQUAD ROSTER...</div>
                  </div>
                ) : teamRoster.length === 0 ? (
                  <div style={{ color: 'var(--concrete-dark)', fontSize: '12px' }}>
                    NO PLAYERS CURRENTLY REGISTERED FOR {selectedTeam.name}. USE CONNECTIONS TAB TO ATTACH ATHLETES.
                  </div>
                ) : (
                  <div className="brutal-table-container">
                    <table className="brutal-table">
                      <thead>
                        <tr>
                          <th>ATHLETE NAME</th>
                          <th>SPORT</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamRoster.map((p, idx) => {
                          const pid = p.id || p.playerId || p._id;
                          const pname = p.name || p.playerName || 'Athlete Record';
                          const psport = p.sport || selectedTeam.sport || 'Sport';
                          return (
                            <tr key={pid || idx}>
                              <td><strong>{pname}</strong></td>
                              <td><span className="brutal-badge">{psport}</span></td>
                              <td>
                                <button
                                  onClick={() => openFullProfile(pid)}
                                  className="brutal-btn brutal-btn-sm"
                                >
                                  VIEW PROFILE
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            05 // TRAINING LOGS MODULE
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'training' && (
          <section>
            <div className="section-header">
              <div>
                <h1 className="section-header-title">
                  ATHLETE TRAINING LOGS
                </h1>
                <p className="section-header-sub">
                  Inspect high-performance conditioning logs, biometric metrics, and coach feedback per athlete.
                </p>
              </div>
              <div>
                <button
                  onClick={() => {
                    const nextSessionId = `TS${Math.floor(1000 + Math.random() * 9000)}`;
                    setTrainingFormData({
                      _id: nextSessionId,
                      playerId: trainingPlayerId || (players[0]?._id || 'P101'),
                      date: new Date().toISOString().split('T')[0],
                      durationMinutes: 90,
                      fitnessScore: 8.5,
                      distanceKm: 6.5,
                      coachFeedback: 'Agility drills, interval sprints, high stamina execution'
                    });
                    setTrainingModalOpen(true);
                  }}
                  className="brutal-btn brutal-btn-accent"
                >
                  + LOG NEW TRAINING SESSION
                </button>
              </div>
            </div>

            {/* Athlete Selector Bar (By Name) */}
            <div className="brutal-filter-bar">
              <span className="brutal-label">SELECT ATHLETE:</span>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {players.slice(0, 8).map(p => {
                  const pid = p._id || p.id;
                  const pname = p.name || p.playerName || pid;
                  return (
                    <button
                      key={pid}
                      onClick={() => setTrainingPlayerId(pid)}
                      className={`brutal-tag-btn ${trainingPlayerId === pid ? 'active' : ''}`}
                    >
                      {pname}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingTrainingLogs ? (
              <div className="brutal-empty-state">
                <div className="brutal-empty-title">RETRIEVING TRAINING SESSIONS...</div>
              </div>
            ) : trainingLogs.length === 0 ? (
              <div className="brutal-empty-state">
                <div className="brutal-empty-title">NO TRAINING SESSIONS LOGGED</div>
                <div className="brutal-empty-text">No workout entries recorded for this athlete.</div>
              </div>
            ) : (
              <div className="brutal-table-container">
                <table className="brutal-table">
                  <thead>
                    <tr>
                      <th>SESSION ID</th>
                      <th>DATE</th>
                      <th>DURATION</th>
                      <th>FITNESS SCORE</th>
                      <th>DISTANCE</th>
                      <th>COACH FEEDBACK / DRILLS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingLogs.map((log, idx) => {
                      const sid = log._id || log.session_id || idx;
                      const dist = log.metrics?.distanceKm !== undefined ? `${log.metrics.distanceKm} KM` : '-';
                      const feedback = log.coachFeedback || log.drills || log.notes || 'Logged';
                      const score = log.fitnessScore || log.intensity || '8.0';
                      return (
                        <tr key={sid}>
                          <td><strong>{sid}</strong></td>
                          <td>{log.date ? String(log.date).split('T')[0] : '-'}</td>
                          <td>{log.durationMinutes || log.duration_minutes || log.duration || 60} MIN</td>
                          <td><span className="brutal-badge brutal-badge-accent">{score}</span></td>
                          <td>{dist}</td>
                          <td>{feedback}</td>
                          <td>
                            <button
                              onClick={() => handleDeleteTrainingSession(sid)}
                              className="brutal-btn brutal-btn-danger brutal-btn-sm"
                            >
                              DELETE
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            06 // CONNECTIONS MODULE (SELECTING NAMES, NOT IDS)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'relations' && (
          <section>
            <div className="section-header">
              <div>
                <h1 className="section-header-title">
                  AFFILIATION & MEMBERSHIP CONNECTIONS
                </h1>
                <p className="section-header-sub">
                  Select athletes, coaches, teams, and tournaments by name to establish verified organization memberships.
                </p>
              </div>
            </div>

            <div className="grid-split">
              {/* Form to establish connection by names */}
              <div className="brutal-card">
                <div className="brutal-card-header">
                  <h3 className="brutal-card-title">ESTABLISH MEMBERSHIP / ASSIGNMENT</h3>
                  <span className="brutal-badge brutal-badge-accent">VERIFICATION</span>
                </div>
                <div className="brutal-card-body">
                  <form onSubmit={handleCreateRelationship} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="brutal-form-group">
                      <label className="brutal-label">CONNECTION TYPE</label>
                      <select
                        value={relFormType}
                        onChange={e => setRelFormType(e.target.value)}
                        className="brutal-select"
                      >
                        <option value="player-team">Athlete Joins Team</option>
                        <option value="coach-team">Assign Coach to Lead Team</option>
                        <option value="team-tournament">Register Team in Tournament</option>
                      </select>
                      <div style={{ fontSize: '11px', color: 'var(--concrete-dark)', marginTop: '4px' }}>
                        * Coach-athlete mentorship is established via team affiliation. When an athlete joins a team, the team's head coach automatically mentors them.
                      </div>
                    </div>

                    {relFormType === 'player-team' && (
                      <div className="brutal-form-group">
                        <label className="brutal-label">SELECT ATHLETE</label>
                        <select
                          value={relPlayerId}
                          onChange={e => setRelPlayerId(e.target.value)}
                          className="brutal-select"
                          required
                        >
                          {players.map(p => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name || p.playerName} — {p.sport || 'Athlete'} ({p.position || 'Player'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {relFormType === 'coach-team' && (
                      <div className="brutal-form-group">
                        <label className="brutal-label">SELECT COACH</label>
                        <select
                          value={relCoachId}
                          onChange={e => setRelCoachId(e.target.value)}
                          className="brutal-select"
                          required
                        >
                          {KNOWN_COACHES.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} — {c.role}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(relFormType === 'player-team' || relFormType === 'coach-team' || relFormType === 'team-tournament') && (
                      <div className="brutal-form-group">
                        <label className="brutal-label">SELECT TEAM</label>
                        <select
                          value={relTeamId}
                          onChange={e => setRelTeamId(e.target.value)}
                          className="brutal-select"
                          required
                        >
                          {KNOWN_TEAMS.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} — {t.sport}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {relFormType === 'team-tournament' && (
                      <div className="brutal-form-group">
                        <label className="brutal-label">SELECT TOURNAMENT</label>
                        <select
                          value={relTournamentId}
                          onChange={e => setRelTournamentId(e.target.value)}
                          className="brutal-select"
                          required
                        >
                          {tournaments.map(t => (
                            <option key={t._id || t.id} value={t._id || t.id}>
                              {t.name} — {t.sport || 'Tournament'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Preview Box */}
                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-color)', border: '2px solid var(--steel-color)' }}>
                      <div className="brutal-label">CONNECTION PREVIEW</div>
                      <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)' }}>
                        {getConnectionPreviewText()}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={relSubmitting}
                      className="brutal-btn brutal-btn-primary"
                      style={{ marginTop: '8px' }}
                    >
                      {relSubmitting ? 'CREATING CONNECTION...' : '+ COMMIT AFFILIATION'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Edge Schema Reference */}
              <div className="brutal-card">
                <div className="brutal-card-header">
                  <h3 className="brutal-card-title">MEMBERSHIP RULES & STRUCTURE</h3>
                </div>
                <div className="brutal-card-body" style={{ fontSize: '12px' }}>
                  <p style={{ color: 'var(--concrete-dark)', marginBottom: '12px' }}>
                    Connections enforce organization rules across clubs, squads, and tournaments:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="relation-chip">
                      <span>(Athlete)</span>
                      <span className="relation-arrow">-[:MEMBER_OF]-&gt;</span>
                      <span>(Team)</span>
                    </div>
                    <div className="relation-chip">
                      <span>(Athlete)</span>
                      <span className="relation-arrow">-[:COACHED_BY]-&gt;</span>
                      <span>(Coach)</span>
                    </div>
                    <div className="relation-chip">
                      <span>(Coach)</span>
                      <span className="relation-arrow">-[:COACHES]-&gt;</span>
                      <span>(Team)</span>
                    </div>
                    <div className="relation-chip">
                      <span>(Athlete)</span>
                      <span className="relation-arrow">-[:PARTICIPATES_IN]-&gt;</span>
                      <span>(Tournament)</span>
                    </div>
                    <div className="relation-chip">
                      <span>(Team)</span>
                      <span className="relation-arrow">-[:PARTICIPATES_IN]-&gt;</span>
                      <span>(Tournament)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ATHLETE FULL PROFILE
          ══════════════════════════════════════════════════════════════════════ */}
      {profileModalOpen && (
        <div className="brutal-dialog-backdrop">
          <div className="brutal-dialog">
            <div className="brutal-dialog-header">
              <div className="brutal-dialog-title">
                ATHLETE FULL PROFILE
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="brutal-dialog-close"
              >
                [X]
              </button>
            </div>

            <div className="brutal-dialog-content">
              {loadingProfile ? (
                <div className="brutal-empty-state">
                  <div className="brutal-empty-title">LOADING ATHLETE PROFILE...</div>
                </div>
              ) : !fullProfileData ? (
                <div className="brutal-empty-state">
                  <div className="brutal-empty-title">ATHLETE DETAILS UNAVAILABLE</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Core Identity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: 900 }}>{fullProfileData.name || fullProfileData.playerName}</h2>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <span className="brutal-badge brutal-badge-accent">{fullProfileData.sport}</span>
                        <span className="brutal-badge">{fullProfileData.position}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setProfileModalOpen(false);
                          openEditPlayerModal(fullProfileData);
                        }}
                        className="brutal-btn brutal-btn-sm"
                      >
                        EDIT ATHLETE
                      </button>
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid-split">
                    <div className="brutal-card" style={{ padding: '14px' }}>
                      <div className="brutal-label" style={{ marginBottom: '8px' }}>BIOMETRIC & DEMOGRAPHICS</div>
                      <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
                        <div>AGE: <strong>{fullProfileData.age || '-'}</strong></div>
                        <div>GENDER: <strong>{fullProfileData.gender || '-'}</strong></div>
                        <div>EMAIL: <strong>{fullProfileData.contact_info?.email || fullProfileData.contact?.email || fullProfileData.email || 'N/A'}</strong></div>
                        <div>PHONE: <strong>{fullProfileData.contact_info?.phone || fullProfileData.contact?.phone || fullProfileData.phone || 'N/A'}</strong></div>
                      </div>
                    </div>

                    <div className="brutal-card" style={{ padding: '14px' }}>
                      <div className="brutal-label" style={{ marginBottom: '8px' }}>AFFILIATIONS & MENTORS</div>
                      <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
                        <div>AFFILIATED TEAM: <strong>{fullProfileData.graph?.team?.name || fullProfileData.relationships?.teamName || fullProfileData.relationships?.team?.name || fullProfileData.teamName || fullProfileData.team || 'None assigned'}</strong></div>
                        <div>PRIMARY COACH: <strong>{fullProfileData.graph?.coach?.name || fullProfileData.relationships?.coachName || fullProfileData.relationships?.coach?.name || fullProfileData.coachName || fullProfileData.coach || 'None assigned'}</strong></div>

                      </div>
                    </div>
                  </div>

                  {/* Training Logs */}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>
                      TRAINING SESSIONS HISTORY
                    </h3>
                    {(!fullProfileData.training || fullProfileData.training.length === 0) ? (
                      <div style={{ fontSize: '12px', color: 'var(--concrete-dark)' }}>
                        NO SESSION ENTRIES LOGGED FOR THIS ATHLETE.
                      </div>
                    ) : (
                      <div className="brutal-table-container">
                        <table className="brutal-table">
                          <thead>
                            <tr>
                              <th>DATE</th>
                              <th>DURATION</th>
                              <th>FITNESS SCORE</th>
                              <th>COACH FEEDBACK / DRILLS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fullProfileData.training.map((t, i) => (
                              <tr key={t._id || t.session_id || i}>
                                <td>{t.date ? String(t.date).split('T')[0] : '-'}</td>
                                <td>{t.durationMinutes || t.duration_minutes || t.duration} MIN</td>
                                <td><span className="brutal-badge brutal-badge-accent">{t.fitnessScore || t.intensity || '8.0'}</span></td>
                                <td>{t.coachFeedback || t.drills || t.notes || 'Completed'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ATHLETE CREATE / EDIT (NO RAW ID REQUIRED FROM USER)
          ══════════════════════════════════════════════════════════════════════ */}
      {playerModalOpen && (
        <div className="brutal-dialog-backdrop">
          <div className="brutal-dialog" style={{ maxWidth: '600px' }}>
            <div className="brutal-dialog-header">
              <div className="brutal-dialog-title">
                {isEditingPlayer ? `EDIT ATHLETE: ${playerFormData.name}` : 'REGISTER NEW ATHLETE'}
              </div>
              <button
                onClick={() => setPlayerModalOpen(false)}
                className="brutal-dialog-close"
              >
                [X]
              </button>
            </div>

            <div className="brutal-dialog-content">
              <form onSubmit={handleSavePlayer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="brutal-form-group">
                  <label className="brutal-label">FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={playerFormData.name}
                    onChange={e => setPlayerFormData({ ...playerFormData, name: e.target.value })}
                    className="brutal-input"
                    placeholder="Enter athlete's legal name..."
                  />
                </div>

                <div className="grid-split">
                  <div className="brutal-form-group">
                    <label className="brutal-label">SPORT</label>
                    <select
                      value={playerFormData.sport}
                      onChange={e => setPlayerFormData({ ...playerFormData, sport: e.target.value })}
                      className="brutal-select"
                    >
                      <option value="Football">Football</option>
                      <option value="Cricket">Cricket</option>
                      <option value="Badminton">Badminton</option>
                      <option value="Swimming">Swimming</option>
                    </select>
                  </div>

                  <div className="brutal-form-group">
                    <label className="brutal-label">POSITION / ROLE</label>
                    <input
                      type="text"
                      required
                      value={playerFormData.position}
                      onChange={e => setPlayerFormData({ ...playerFormData, position: e.target.value })}
                      className="brutal-input"
                      placeholder="e.g. Midfielder, Batsman, Forward..."
                    />
                  </div>
                </div>

                <div className="grid-split">
                  <div className="brutal-form-group">
                    <label className="brutal-label">AGE</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={60}
                      value={playerFormData.age}
                      onChange={e => setPlayerFormData({ ...playerFormData, age: Number(e.target.value) })}
                      className="brutal-input"
                    />
                  </div>

                  <div className="brutal-form-group">
                    <label className="brutal-label">GENDER</label>
                    <select
                      value={playerFormData.gender}
                      onChange={e => setPlayerFormData({ ...playerFormData, gender: e.target.value })}
                      className="brutal-select"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid-split">
                  <div className="brutal-form-group">
                    <label className="brutal-label">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      value={playerFormData.email}
                      onChange={e => setPlayerFormData({ ...playerFormData, email: e.target.value })}
                      className="brutal-input"
                      placeholder="athlete@example.com"
                    />
                  </div>

                  <div className="brutal-form-group">
                    <label className="brutal-label">PHONE NUMBER</label>
                    <input
                      type="text"
                      value={playerFormData.phone}
                      onChange={e => setPlayerFormData({ ...playerFormData, phone: e.target.value })}
                      className="brutal-input"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setPlayerModalOpen(false)}
                    className="brutal-btn"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="brutal-btn brutal-btn-primary"
                  >
                    {isEditingPlayer ? 'SAVE CHANGES' : 'CREATE ATHLETE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: TOURNAMENT CREATE (NO RAW ID REQUIRED FROM USER)
          ══════════════════════════════════════════════════════════════════════ */}
      {tournamentModalOpen && (
        <div className="brutal-dialog-backdrop">
          <div className="brutal-dialog" style={{ maxWidth: '600px' }}>
            <div className="brutal-dialog-header">
              <div className="brutal-dialog-title">CREATE NEW TOURNAMENT</div>
              <button
                onClick={() => setTournamentModalOpen(false)}
                className="brutal-dialog-close"
              >
                [X]
              </button>
            </div>

            <div className="brutal-dialog-content">
              <form onSubmit={handleSaveTournament} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="brutal-form-group">
                  <label className="brutal-label">TOURNAMENT NAME</label>
                  <input
                    type="text"
                    required
                    value={tournamentFormData.name}
                    onChange={e => setTournamentFormData({ ...tournamentFormData, name: e.target.value })}
                    className="brutal-input"
                    placeholder="e.g. National Championship 2026..."
                  />
                </div>

                <div className="grid-split">
                  <div className="brutal-form-group">
                    <label className="brutal-label">SPORT</label>
                    <select
                      value={tournamentFormData.sport}
                      onChange={e => setTournamentFormData({ ...tournamentFormData, sport: e.target.value })}
                      className="brutal-select"
                    >
                      <option value="Football">Football</option>
                      <option value="Cricket">Cricket</option>
                      <option value="Badminton">Badminton</option>
                      <option value="Swimming">Swimming</option>
                    </select>
                  </div>

                  <div className="brutal-form-group">
                    <label className="brutal-label">LOCATION / VENUE</label>
                    <input
                      type="text"
                      required
                      value={tournamentFormData.location}
                      onChange={e => setTournamentFormData({ ...tournamentFormData, location: e.target.value })}
                      className="brutal-input"
                      placeholder="e.g. National Complex..."
                    />
                  </div>
                </div>

                <div className="grid-split">
                  <div className="brutal-form-group">
                    <label className="brutal-label">START DATE</label>
                    <input
                      type="date"
                      required
                      value={tournamentFormData.startDate}
                      onChange={e => setTournamentFormData({ ...tournamentFormData, startDate: e.target.value })}
                      className="brutal-input"
                    />
                  </div>

                  <div className="brutal-form-group">
                    <label className="brutal-label">END DATE</label>
                    <input
                      type="date"
                      required
                      value={tournamentFormData.endDate}
                      onChange={e => setTournamentFormData({ ...tournamentFormData, endDate: e.target.value })}
                      className="brutal-input"
                    />
                  </div>
                </div>

                <div className="brutal-form-group">
                  <label className="brutal-label">PRIZE POOL (INR)</label>
                  <input
                    type="number"
                    required
                    value={tournamentFormData.prizePool}
                    onChange={e => setTournamentFormData({ ...tournamentFormData, prizePool: Number(e.target.value) })}
                    className="brutal-input"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setTournamentModalOpen(false)}
                    className="brutal-btn"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="brutal-btn brutal-btn-primary"
                  >
                    CREATE TOURNAMENT
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: TOURNAMENT DETAILS & PARTICIPANTS
          ══════════════════════════════════════════════════════════════════ */}
      {tournamentDetailModal && activeTournament && (
        <div className="brutal-dialog-backdrop">
          <div className="brutal-dialog">
            <div className="brutal-dialog-header">
              <div className="brutal-dialog-title">
                {activeTournament.name}
              </div>
              <button
                onClick={() => setTournamentDetailModal(false)}
                className="brutal-dialog-close"
              >
                [X]
              </button>
            </div>

            <div className="brutal-dialog-content">
              {loadingTournamentDetails ? (
                <div className="brutal-empty-state">
                  <div className="brutal-empty-title">FETCHING TOURNAMENT PARTICIPATION DATA...</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Tournament Teams */}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>
                      REGISTERED TEAMS
                    </h3>
                    {tournamentTeams.length === 0 ? (
                      <div style={{ color: 'var(--concrete-dark)', fontSize: '12px' }}>
                        NO TEAMS REGISTERED IN THIS TOURNAMENT YET.
                      </div>
                    ) : (
                      <div className="brutal-table-container">
                        <table className="brutal-table">
                          <thead>
                            <tr>
                              <th>TEAM NAME</th>
                              <th>SPORT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tournamentTeams.map((t, idx) => {
                              const teamName = t.name || t.teamName || 'Team Record';
                              const sport = resolveTeamSport(t);
                              return (
                                <tr key={idx}>
                                  <td><strong>{teamName}</strong></td>
                                  <td><span className="brutal-badge">{sport}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Tournament Players */}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>
                      COMPETING ATHLETES
                    </h3>
                    {tournamentAthletes.length === 0 ? (
                      <div style={{ color: 'var(--concrete-dark)', fontSize: '12px' }}>
                        NO ATHLETES DIRECTLY ATTACHED TO THIS TOURNAMENT.
                      </div>
                    ) : (
                      <div className="brutal-table-container">
                        <table className="brutal-table">
                          <thead>
                            <tr>
                              <th>ATHLETE NAME</th>
                              <th>SPORT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tournamentAthletes.map((p, idx) => {
                              const pname = p.name || p.playerName || 'Athlete Record';
                              const psport = p.sport || activeTournament.sport || 'Multi-Sport';
                              return (
                                <tr key={idx}>
                                  <td><strong>{pname}</strong></td>
                                  <td><span className="brutal-badge">{psport}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: LOG TRAINING SESSION (SELECT ATHLETE BY NAME)
          ══════════════════════════════════════════════════════════════════════ */}
      {trainingModalOpen && (
        <div className="brutal-dialog-backdrop">
          <div className="brutal-dialog" style={{ maxWidth: '600px' }}>
            <div className="brutal-dialog-header">
              <div className="brutal-dialog-title">LOG TRAINING SESSION</div>
              <button
                onClick={() => setTrainingModalOpen(false)}
                className="brutal-dialog-close"
              >
                [X]
              </button>
            </div>

            <div className="brutal-dialog-content">
              <form onSubmit={handleSaveTrainingSession} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="brutal-form-group">
                  <label className="brutal-label">SELECT ATHLETE</label>
                  <select
                    value={trainingFormData.playerId}
                    onChange={e => setTrainingFormData({ ...trainingFormData, playerId: e.target.value })}
                    className="brutal-select"
                    required
                  >
                    {players.map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.name || p.playerName} — {p.sport || 'Athlete'} ({p.position || 'Player'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-split">
                  <div className="brutal-form-group">
                    <label className="brutal-label">DATE</label>
                    <input
                      type="date"
                      required
                      value={trainingFormData.date}
                      onChange={e => setTrainingFormData({ ...trainingFormData, date: e.target.value })}
                      className="brutal-input"
                    />
                  </div>

                  <div className="brutal-form-group">
                    <label className="brutal-label">DURATION (MINUTES)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={360}
                      value={trainingFormData.durationMinutes}
                      onChange={e => setTrainingFormData({ ...trainingFormData, durationMinutes: Number(e.target.value) })}
                      className="brutal-input"
                    />
                  </div>
                </div>

                <div className="grid-split">
                  <div className="brutal-form-group">
                    <label className="brutal-label">FITNESS SCORE (1 - 10)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      max={10}
                      value={trainingFormData.fitnessScore}
                      onChange={e => setTrainingFormData({ ...trainingFormData, fitnessScore: Number(e.target.value) })}
                      className="brutal-input"
                    />
                  </div>

                  <div className="brutal-form-group">
                    <label className="brutal-label">DISTANCE COVERED (KM)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={trainingFormData.distanceKm}
                      onChange={e => setTrainingFormData({ ...trainingFormData, distanceKm: Number(e.target.value) })}
                      className="brutal-input"
                    />
                  </div>
                </div>

                <div className="brutal-form-group">
                  <label className="brutal-label">COACH OBSERVATION & DRILLS</label>
                  <textarea
                    rows={3}
                    required
                    value={trainingFormData.coachFeedback}
                    onChange={e => setTrainingFormData({ ...trainingFormData, coachFeedback: e.target.value })}
                    className="brutal-textarea"
                    placeholder="Enter drills performed, intensity observations, coach notes..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setTrainingModalOpen(false)}
                    className="brutal-btn"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="brutal-btn brutal-btn-primary"
                  >
                    SAVE TRAINING SESSION
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
