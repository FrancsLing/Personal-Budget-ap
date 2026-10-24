document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();

  const monthSelector = document.getElementById('month-selector');
  monthSelector.value = appState.selectedMonth;

  const refresh = () => {
    renderSearch();
    renderBalance();
    updateHistoryButtons();
  };

  monthSelector.addEventListener('change', () => {
    if (!monthSelector.value) return;

    appState.selectedMonth = monthSelector.value;
    saveToLocalStorage();
    refresh();
  });

  setupAddRecord(refresh);
  setupSearch(refresh);
  setupBalance();
  bindHistoryControls(refresh);
  refresh();
});
