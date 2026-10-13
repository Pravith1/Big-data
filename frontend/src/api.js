/**
 * PRO//SPORT Frontend API Client
 * Complete integration covering all 30 backend endpoints.
 */

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || body.message || `Request failed with status ${res.status}`);
  }
  return body.data !== undefined ? body.data : body;
}

// ─── PLAYERS API ─────────────────────────────────────────────────────────────

export const getPlayers = (sport = '') =>
  request(sport ? `/players/getAllPlayers?sport=${encodeURIComponent(sport)}` : '/players/getAllPlayers');

export const getPlayerById = (id) =>
  request(`/players/getPlayerById/${encodeURIComponent(id)}`);

export const getPlayerFull = (id) =>
  request(`/players/getPlayerFull/${encodeURIComponent(id)}`);

export const getPlayerTraining = (id) =>
  request(`/players/getPlayerTraining/${encodeURIComponent(id)}`);

export const getPlayerRelationships = (id) =>
  request(`/players/getPlayerRelationships/${encodeURIComponent(id)}`);

export const createPlayer = (playerData) =>
  request('/players/createPlayer', {
    method: 'POST',
    body: JSON.stringify(playerData)
  });

export const updatePlayer = (id, playerData) =>
  request(`/players/updatePlayer/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(playerData)
  });

export const deletePlayer = (id) =>
  request(`/players/deletePlayer/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

export const getCoachPlayerTraining = (coachId) =>
  request(`/players/getCoachPlayerTraining?coachId=${encodeURIComponent(coachId)}`);

export const getCoachPlayers = (coachId) =>
  request(`/players/getCoachPlayers/${encodeURIComponent(coachId)}`);

// ─── COACHES API ─────────────────────────────────────────────────────────────

export const getCoachTeams = (coachId) =>
  request(`/coaches/getCoachTeams/${encodeURIComponent(coachId)}`);

// ─── TOURNAMENTS API ─────────────────────────────────────────────────────────

export const getTournaments = () =>
  request('/tournaments/getAllTournaments');

export const getTournamentById = (id) =>
  request(`/tournaments/getTournamentById/${encodeURIComponent(id)}`);

export const getTournamentPlayers = (id) =>
  request(`/tournaments/getTournamentPlayers/${encodeURIComponent(id)}`);

export const getTournamentTeams = (id) =>
  request(`/tournaments/getTournamentTeams/${encodeURIComponent(id)}`);

export const createTournament = (tournamentData) =>
  request('/tournaments/createTournament', {
    method: 'POST',
    body: JSON.stringify(tournamentData)
  });

export const updateTournament = (id, tournamentData) =>
  request(`/tournaments/updateTournament/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(tournamentData)
  });

export const deleteTournament = (id) =>
  request(`/tournaments/deleteTournament/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

// ─── TEAMS API ───────────────────────────────────────────────────────────────

export const getTeamPlayers = (teamId) =>
  request(`/teams/${encodeURIComponent(teamId)}/players`);

// ─── TRAINING SESSIONS API ───────────────────────────────────────────────────

export const getTrainingByPlayer = (playerId) =>
  request(`/training/getTrainingByPlayer/${encodeURIComponent(playerId)}`);

export const createTrainingSession = (sessionData) =>
  request('/training/createTrainingSession', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });

export const updateTrainingSession = (id, sessionData) =>
  request(`/training/updateTrainingSession/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(sessionData)
  });

export const deleteTrainingSession = (id) =>
  request(`/training/deleteTrainingSession/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

// ─── GRAPH RELATIONSHIPS API ─────────────────────────────────────────────────

export const assignPlayerToTeam = (data) =>
  request('/relationships/player-team', {
    method: 'POST',
    body: JSON.stringify(data)
  });



export const assignCoachToTeam = (data) =>
  request('/relationships/coach-team', {
    method: 'POST',
    body: JSON.stringify(data)
  });

export const addTeamToTournament = (data) =>
  request('/relationships/team-tournament', {
    method: 'POST',
    body: JSON.stringify(data)
  });


