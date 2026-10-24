const STORAGE_KEY = 'PERSONAL_BUDGET_STORE_V1';
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Bills', 'Other'];
const CATEGORY_OPTIONS_BY_TYPE = {
  income: ['Salary & Stipend'],
  expense: DEFAULT_CATEGORIES,
};
const TOAST_DURATION_MS = 2600;
const appState = {
  transactions: [],
  selectedMonth: '',
  dateSortDesc: true,
  activeFilter: 'all',
  searchRegex: null,
  currentType: 'expense',
  budgetLimit: 10000,
  undoStack: [],
  redoStack: [],
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toYearMonth(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return '';

  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDateHeading(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTransactionsForMonth(month = appState.selectedMonth) {
  return appState.transactions.filter((transaction) => toYearMonth(transaction.timestamp) === month);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS);
}

function saveToLocalStorage() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      transactions: appState.transactions,
      selectedMonth: appState.selectedMonth,
      budgetLimit: appState.budgetLimit,
    }),
  );
}

function loadFromLocalStorage() {
  appState.selectedMonth = currentMonth();

  try {
    const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Array.isArray(savedData.transactions)) {
      appState.transactions = savedData.transactions.map((transaction) => ({
        ...transaction,
        category: transaction.category || 'Other',
        type: transaction.type || 'expense',
        amount: Number(transaction.amount),
      }));
    }
    if (savedData.selectedMonth) appState.selectedMonth = savedData.selectedMonth;
    if (Number(savedData.budgetLimit) > 0) {
      appState.budgetLimit = Number(savedData.budgetLimit);
    }
  } catch (error) {
    console.error('Could not load saved records', error);
  }
}

function pushToUndo(action) {
  appState.undoStack.push(action);
  appState.redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  ['undo', 'redo'].forEach((historyAction) => {
    const button = document.getElementById(`btn-${historyAction}`);
    const count = document.getElementById(`${historyAction}-count`);
    const historyStack = historyAction === 'undo' ? appState.undoStack : appState.redoStack;

    if (button) button.disabled = historyStack.length === 0;
    if (count) count.textContent = historyStack.length;
  });
}

function renderGroupedLedgerHTML(items, container) {
  if (!items.length) {
    container.innerHTML = '<div class="empty-state">No records found for this period.</div>';
    return;
  }

  const recordsByDate = new Map();
  for (const transaction of items) {
    const dateKey = toDateKey(transaction.timestamp);
    if (!recordsByDate.has(dateKey)) recordsByDate.set(dateKey, []);
    recordsByDate.get(dateKey).push(transaction);
  }

  const dates = [...recordsByDate.keys()].sort();
  if (!appState.dateSortDesc) dates.reverse();

  container.innerHTML = dates
    .map((dateKey) => {
      const records = recordsByDate.get(dateKey);
      const dailyNet = records.reduce(
        (total, transaction) =>
          total + (transaction.type === 'income' ? transaction.amount : -transaction.amount),
        0,
      );
      const dailyExpenses = records
        .filter((transaction) => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amount, 0);

      return `<section class="date-group"><header class="date-group-header"><strong>${formatDateHeading(dateKey)}</strong><span>Daily net: <b class="${dailyNet >= 0 ? 'text-income' : 'text-expense'}">${dailyNet < 0 ? '-' : '+'}\u20B1${Math.abs(dailyNet).toFixed(2)}</b> \u00B7 Expenses \u20B1${dailyExpenses.toFixed(2)}</span></header><div class="record-list">${records
        .map(
          (transaction) =>
            `<article class="record-row"><span class="badge">${escapeHTML(transaction.category)}</span><span class="record-note">${escapeHTML(transaction.note || '')}</span><span class="${transaction.type === 'income' ? 'text-income' : 'text-expense'}">${transaction.type === 'income' ? '+' : '\u2212'}\u20B1${Number(transaction.amount).toFixed(2)}</span><button class="btn-delete" data-id="${escapeHTML(transaction.id)}" aria-label="Delete record">\u00D7</button></article>`,
        )
        .join('')}</div></section>`;
    })
    .join('');
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function bindHistoryControls(refresh) {
  const undo = () => {
    const action = appState.undoStack.pop();
    if (!action) return;

    if (action.type === 'ADD') {
      appState.transactions = appState.transactions.filter(
        (transaction) => transaction.id !== action.item.id,
      );
    } else if (action.type === 'DELETE') {
      appState.transactions.splice(action.index, 0, action.item);
    } else if (action.type === 'CLEAN') {
      appState.transactions = [...action.snapshot];
    }

    appState.redoStack.push(action);
    saveToLocalStorage();
    updateHistoryButtons();
    refresh();
  };

  const redo = () => {
    const action = appState.redoStack.pop();
    if (!action) return;

    if (action.type === 'ADD') {
      appState.transactions.unshift(action.item);
    } else if (action.type === 'DELETE') {
      appState.transactions = appState.transactions.filter(
        (transaction) => transaction.id !== action.item.id,
      );
    } else if (action.type === 'CLEAN') {
      const seenRecords = new Set();
      appState.transactions = appState.transactions.filter((transaction) => {
        const key = [
          toDateKey(transaction.timestamp),
          transaction.amount,
          transaction.category,
          transaction.note,
          transaction.type,
        ].join('|');
        if (seenRecords.has(key)) return false;
        seenRecords.add(key);
        return true;
      });
    }

    appState.undoStack.push(action);
    saveToLocalStorage();
    updateHistoryButtons();
    refresh();
  };

  document.getElementById('btn-undo')?.addEventListener('click', undo);
  document.getElementById('btn-redo')?.addEventListener('click', redo);
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    }
  });
}
