const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const retrieveBtn = document.getElementById('retrieveBtn');
const statusEl = document.getElementById('status');
const messagesTable = document.getElementById('messagesTable');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? 'status error' : 'status';
}

function renderMessages(messages) {
  messagesTable.innerHTML = '';

  if (!messages.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="2" class="empty">No messages yet.</td>';
    messagesTable.appendChild(row);
    return;
  }

  messages.forEach((item) => {
    const row = document.createElement('tr');
    const messageCell = document.createElement('td');
    const timestampCell = document.createElement('td');

    messageCell.textContent = item.message;
    timestampCell.textContent = item.timestamp;

    row.appendChild(messageCell);
    row.appendChild(timestampCell);
    messagesTable.appendChild(row);
  });
}

async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message) {
    setStatus('Please enter a message.', true);
    return;
  }

  setStatus('Sending...');

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to store message.');
    }

    messageInput.value = '';
    setStatus('Message stored.');
    await retrieveMessages();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function retrieveMessages() {
  setStatus('Retrieving...');

  try {
    const response = await fetch('/api/messages');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to retrieve messages.');
    }

    renderMessages(data.messages || []);
    setStatus('');
  } catch (error) {
    setStatus(error.message, true);
  }
}

sendBtn.addEventListener('click', sendMessage);
retrieveBtn.addEventListener('click', retrieveMessages);

retrieveMessages();
