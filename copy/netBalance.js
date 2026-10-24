function renderBalance() {
  const transactions = getTransactionsForMonth();
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);

  document.getElementById('label-net-balance').textContent =
    `Net Balance (${formatMonthLabel(appState.selectedMonth)})`;
  document.getElementById('metric-balance').textContent = `\u20B1${(income - expenses).toFixed(2)}`;
  document.getElementById('metric-income').textContent = `\u20B1${income.toFixed(2)}`;
  document.getElementById('metric-expense').textContent = `\u20B1${expenses.toFixed(2)}`;

  const categoryTotals = DEFAULT_CATEGORIES.map((category) => [
    category,
    transactions
      .filter((transaction) => transaction.type === 'expense' && transaction.category === category)
      .reduce((total, transaction) => total + transaction.amount, 0),
  ]);

  document.getElementById('expense-breakdown-body').innerHTML = categoryTotals
    .map(([category, amount]) => {
      const share = expenses ? ((amount / expenses) * 100).toFixed(1) : '0.0';
      return `<tr><td>${category}</td><td>\u20B1${amount.toFixed(2)}</td><td>${share}%</td></tr>`;
    })
    .join('');

  document.getElementById('budget-value').textContent = `\u20B1${appState.budgetLimit.toFixed(2)}`;
  document.getElementById('budget-input').value = appState.budgetLimit;
  document.getElementById('budget-spent').textContent = `\u20B1${expenses.toFixed(2)} spent this month`;
  document.getElementById('budget-bar').style.width =
    `${Math.min(100, (expenses / appState.budgetLimit) * 100)}%`;
}

function setupBalance() {
  const form = document.getElementById('budget-form');
  const editButton = document.getElementById('btn-edit-budget');

  editButton.addEventListener('click', () => {
    form.hidden = false;
    editButton.hidden = true;
    document.getElementById('budget-input').focus();
  });

  document.getElementById('btn-cancel-budget').addEventListener('click', () => {
    form.hidden = true;
    editButton.hidden = false;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const budgetLimit = Number(document.getElementById('budget-input').value);
    if (!Number.isFinite(budgetLimit) || budgetLimit <= 0) {
      showToast('Budget must be greater than 0.');
      return;
    }

    appState.budgetLimit = budgetLimit;
    saveToLocalStorage();
    form.hidden = true;
    editButton.hidden = false;
    renderBalance();
    showToast('Budget limit updated.');
  });
}
