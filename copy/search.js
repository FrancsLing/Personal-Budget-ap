function setupSearch(refresh) {
  const searchInput = document.getElementById('search-input');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    try {
      appState.searchRegex = query ? new RegExp(query, 'i') : null;
    } catch {
      appState.searchRegex = null;
    }
    refresh();
  });

  document.querySelectorAll('.pill').forEach((filterButton) => {
    filterButton.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach((button) => {
        button.classList.toggle('active', button === filterButton);
      });
      appState.activeFilter = filterButton.dataset.filter;
      refresh();
    });
  });

  document.getElementById('btn-clean').addEventListener('click', () => {
    const seenRecords = new Set();
    const previousTransactions = [...appState.transactions];

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

    const removedCount = previousTransactions.length - appState.transactions.length;
    if (!removedCount) {
      showToast('No duplicate records found.');
      return;
    }

    pushToUndo({ type: 'CLEAN', snapshot: previousTransactions });
    saveToLocalStorage();
    refresh();
    showToast(`Removed ${removedCount} duplicate record(s).`);
  });

  document.getElementById('btn-reverse').addEventListener('click', () => {
    appState.dateSortDesc = !appState.dateSortDesc;
    refresh();
  });

  document.getElementById('search-results-container').addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.btn-delete');
    if (!deleteButton) return;

    const transactionIndex = appState.transactions.findIndex(
      (transaction) => transaction.id === deleteButton.dataset.id,
    );
    if (transactionIndex < 0) return;

    const [transaction] = appState.transactions.splice(transactionIndex, 1);
    pushToUndo({ type: 'DELETE', item: transaction, index: transactionIndex });
    saveToLocalStorage();
    refresh();
  });
}

function renderSearch() {
  const selectedMonthTransactions = appState.transactions.filter(
    (transaction) => toYearMonth(transaction.timestamp) === appState.selectedMonth,
  );
  const visibleTransactions = selectedMonthTransactions.filter((transaction) => {
    const matchesFilter =
      appState.activeFilter === 'all' || transaction.type === appState.activeFilter;
    const matchesQuery =
      !appState.searchRegex ||
      appState.searchRegex.test(transaction.category) ||
      appState.searchRegex.test(transaction.note || '');
    return matchesFilter && matchesQuery;
  });

  document.getElementById('search-heading').textContent =
    `Search & Records \u2014 ${formatMonthLabel(appState.selectedMonth)}`;
  renderGroupedLedgerHTML(
    visibleTransactions,
    document.getElementById('search-results-container'),
  );
}
