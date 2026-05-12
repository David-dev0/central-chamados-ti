const SUPABASE_URL = "https://hkfomfsmiuwvytovoypy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZm9tZnNtaXV3dnl0b3ZveXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjU3NDMsImV4cCI6MjA5NDEwMTc0M30.PJC_L45NQT9wd6It5odH2-1H-Rcj4kYzCc-kxtmxH_k";
const TABLE_NAME = "chamados";
const SESSION_KEY = "central-ti-admin-session";

const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const adminBoard = document.querySelector("#adminBoard");
const adminTicketList = document.querySelector("#adminTicketList");
const logoutButton = document.querySelector("#logoutButton");
const refreshButton = document.querySelector("#refreshButton");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const openCount = document.querySelector("#openCount");
const progressCount = document.querySelector("#progressCount");
const doneCount = document.querySelector("#doneCount");

let tickets = [];

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginMessage("Entrando...", "");

  const data = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const session = await signIn(data.email.trim(), data.password);
    saveSession(session);
    loginForm.reset();
    showBoard();
    await loadTickets();
  } catch (error) {
    setLoginMessage(error.message, "error");
  }
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  tickets = [];
  adminBoard.hidden = true;
  logoutButton.hidden = true;
  loginForm.hidden = false;
  setLoginMessage("Sessao encerrada.", "");
});

refreshButton.addEventListener("click", () => {
  if (!getSession()) {
    setLoginMessage("Entre para atualizar os chamados.", "error");
    return;
  }

  loadTickets();
});

searchInput.addEventListener("input", renderTickets);
statusFilter.addEventListener("change", renderTickets);
adminTicketList.addEventListener("change", async (event) => {
  if (!event.target.matches("[data-status-id]")) {
    return;
  }

  const id = event.target.dataset.statusId;
  const status = event.target.value;

  try {
    await updateTicketStatus(id, status);
    tickets = tickets.map((ticket) => (String(ticket.id) === String(id) ? { ...ticket, status } : ticket));
    renderTickets();
  } catch (error) {
    alert(`Nao foi possivel atualizar o status: ${error.message}`);
  }
});

async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.message || "Login recusado pelo Supabase.");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email,
  };
}

async function loadTickets() {
  setListMessage("Carregando chamados...");

  try {
    const session = await getValidSession();
    const params = new URLSearchParams({
      select: "*",
      order: "created_at.desc",
      limit: "100",
    });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?${params}`, {
      headers: authHeaders(session.access_token),
    });

    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data.message || "Nao foi possivel carregar chamados.");
    }

    tickets = data;
    renderTickets();
  } catch (error) {
    setListMessage(error.message);
  }
}

async function updateTicketStatus(id, status) {
  const session = await getValidSession();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(session.access_token),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const data = await response.json().catch(async () => ({ message: await response.text() }));
    throw new Error(data.message || "Erro ao atualizar chamado.");
  }
}

async function refreshSession(session) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    localStorage.removeItem(SESSION_KEY);
    throw new Error("Sessao expirada. Entre novamente.");
  }

  const nextSession = {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  saveSession(nextSession);
  return nextSession;
}

async function getValidSession() {
  const session = getSession();
  if (!session) {
    throw new Error("Entre no painel para ver os chamados.");
  }

  if (Date.now() > session.expires_at - 60000) {
    return refreshSession(session);
  }

  return session;
}

function authHeaders(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };
}

function showBoard() {
  loginForm.hidden = true;
  adminBoard.hidden = false;
  logoutButton.hidden = false;
  setLoginMessage("", "");
}

function renderTickets() {
  const term = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const filtered = tickets.filter((ticket) => {
    const content = [
      ticket.nome,
      ticket.contato,
      ticket.loja,
      ticket.setor,
      ticket.categoria,
      ticket.prioridade,
      ticket.titulo,
      ticket.descricao,
      ticket.status,
    ]
      .join(" ")
      .toLowerCase();

    return (!term || content.includes(term)) && (!status || ticket.status === status);
  });

  updateStats(tickets);

  if (!filtered.length) {
    setListMessage("Nenhum chamado encontrado.");
    return;
  }

  adminTicketList.innerHTML = filtered.map(renderTicket).join("");
}

function renderTicket(ticket) {
  const date = ticket.created_at ? new Date(ticket.created_at) : new Date();
  const status = ticket.status || "Aberto";

  return `
    <article class="ticket-item admin-ticket">
      <header>
        <div>
          <h3>${escapeHtml(ticket.titulo)}</h3>
          <small>${date.toLocaleString("pt-BR")}</small>
        </div>
        <select data-status-id="${escapeHtml(ticket.id)}" aria-label="Status do chamado">
          ${["Aberto", "Em atendimento", "Resolvido"]
            .map((option) => `<option ${option === status ? "selected" : ""}>${option}</option>`)
            .join("")}
        </select>
      </header>
      <p>${escapeHtml(ticket.descricao)}</p>
      <div class="ticket-meta">
        <span>${escapeHtml(ticket.nome)}</span>
        <span>${escapeHtml(ticket.contato)}</span>
        <span>${escapeHtml(ticket.loja)}</span>
        <span>${escapeHtml(ticket.setor)}</span>
        <span>${escapeHtml(ticket.categoria)}</span>
        <span>${escapeHtml(ticket.prioridade)}</span>
      </div>
    </article>
  `;
}

function updateStats(items) {
  openCount.textContent = String(items.filter((ticket) => (ticket.status || "Aberto") === "Aberto").length);
  progressCount.textContent = String(items.filter((ticket) => ticket.status === "Em atendimento").length);
  doneCount.textContent = String(items.filter((ticket) => ticket.status === "Resolvido").length);
}

function setListMessage(message) {
  adminTicketList.innerHTML = `<p class="empty">${escapeHtml(message)}</p>`;
}

function setLoginMessage(text, type) {
  loginMessage.textContent = text;
  loginMessage.className = type;
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (getSession()) {
  showBoard();
  loadTickets();
}
