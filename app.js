const SUPABASE_URL = "https://hkfomfsmiuwvytovoypy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZm9tZnNtaXV3dnl0b3ZveXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjU3NDMsImV4cCI6MjA5NDEwMTc0M30.PJC_L45NQT9wd6It5odH2-1H-Rcj4kYzCc-kxtmxH_k";
const TABLE_NAME = "chamados";
const STORAGE_KEY = "central-ti-chamados";

const form = document.querySelector("#ticketForm");
const formMessage = document.querySelector("#formMessage");
const ticketList = document.querySelector("#ticketList");
const todayCount = document.querySelector("#todayCount");
const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".nav");

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("Enviando chamado...", "");

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  const data = Object.fromEntries(new FormData(form).entries());
  const ticket = {
    nome: data.nome.trim(),
    contato: data.contato.trim(),
    loja: data.loja.trim(),
    setor: data.setor.trim(),
    categoria: data.categoria,
    prioridade: data.prioridade,
    titulo: data.titulo.trim(),
    descricao: data.descricao.trim(),
    status: "Aberto",
    origem: "site",
  };

  try {
    await createTicket(ticket);
    rememberTicket({ ...ticket, created_at: new Date().toISOString() });
    form.reset();
    setMessage("Chamado enviado com sucesso. O TI ja pode analisar.", "success");
  } catch (error) {
    console.error(error);
    setMessage(
      "Nao foi possivel enviar. Confira se a tabela 'chamados' existe no Supabase.",
      "error",
    );
  } finally {
    submitButton.disabled = false;
    renderTickets();
  }
});

async function createTicket(ticket) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(ticket),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Erro ao criar chamado.");
  }

  return true;
}

function setMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = type;
}

function rememberTicket(ticket) {
  const tickets = getTickets();
  tickets.unshift(ticket);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.slice(0, 6)));
}

function getTickets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderTickets() {
  const tickets = getTickets();
  todayCount.textContent = String(countToday(tickets));

  if (!tickets.length) {
    ticketList.innerHTML = '<p class="empty">Nenhum chamado enviado ainda por aqui.</p>';
    return;
  }

  ticketList.innerHTML = tickets
    .map((ticket) => {
      const date = ticket.created_at ? new Date(ticket.created_at) : new Date();
      return `
        <article class="ticket-item">
          <header>
            <h3>${escapeHtml(ticket.titulo)}</h3>
            <small>${date.toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}</small>
          </header>
          <p>${escapeHtml(ticket.descricao)}</p>
          <div class="ticket-meta">
            <span>${escapeHtml(ticket.loja)}</span>
            <span>${escapeHtml(ticket.setor)}</span>
            <span>${escapeHtml(ticket.categoria)}</span>
            <span>${escapeHtml(ticket.prioridade)}</span>
            <span>${escapeHtml(ticket.status || "Aberto")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function countToday(tickets) {
  const today = new Date().toDateString();
  return tickets.filter((ticket) => {
    const createdAt = ticket.created_at ? new Date(ticket.created_at) : new Date();
    return createdAt.toDateString() === today;
  }).length;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderTickets();
