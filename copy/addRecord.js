function setupAddRecord(refresh) {
  const panel = document.getElementById('add-panel');
  const openButton = document.getElementById('btn-open-add');
  const form = document.getElementById('transaction-form');
  const categorySelect = document.getElementById('tx-category');

  const setTransactionType = (type, preferredCategory = '') => {
    const categories = CATEGORY_OPTIONS_BY_TYPE[type] || CATEGORY_OPTIONS_BY_TYPE.expense;
    appState.currentType = type;

    document.querySelectorAll('[data-type]').forEach((button) => {
      button.classList.toggle('active', button.dataset.type === type);
    });

    categorySelect.replaceChildren(
      ...categories.map((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        return option;
      }),
    );
    categorySelect.value = categories.includes(preferredCategory)
      ? preferredCategory
      : categories[0];
  };

  const closePanel = () => {
    panel.classList.remove('open');
    openButton.setAttribute('aria-expanded', 'false');
    form.reset();
    setTransactionType('expense');
  };

  const togglePanel = () => {
    const isOpen = !panel.classList.contains('open');

    if (!isOpen) {
      closePanel();
      return;
    }

    panel.classList.toggle('open', isOpen);
    openButton.setAttribute('aria-expanded', String(isOpen));

    setTransactionType(appState.currentType);
    document.getElementById('tx-date').value ||= toDateKey(Date.now());
    document.getElementById('tx-amount').focus();
  };

  setTransactionType(appState.currentType);

  openButton.addEventListener('click', togglePanel);
  document.addEventListener('click', (event) => {
    if (!panel.contains(event.target) && !openButton.contains(event.target)) {
      closePanel();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });

  document.querySelectorAll('[data-type]').forEach((typeButton) => {
    typeButton.addEventListener('click', () => {
      setTransactionType(typeButton.dataset.type);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const amount = Number(document.getElementById('tx-amount').value);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter an amount greater than 0.');
      return;
    }

    const date = document.getElementById('tx-date').value;
    if (!date) {
      showToast('Choose a date.');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const transaction = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      timestamp: new Date(year, month - 1, day, 12).getTime(),
      amount,
      category: document.getElementById('tx-category').value,
      note: document.getElementById('tx-note').value.trim(),
      type: appState.currentType,
    };

    appState.transactions.unshift(transaction);
    pushToUndo({ type: 'ADD', item: transaction });
    appState.selectedMonth = toYearMonth(transaction.timestamp);
    document.getElementById('month-selector').value = appState.selectedMonth;
    saveToLocalStorage();

    closePanel();
    refresh();
    showToast('Record saved.');
  });
}
