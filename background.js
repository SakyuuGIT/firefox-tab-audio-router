browser.browserAction.onClicked.addListener((tab) => {
  if (tab && tab.id) {
    browser.tabs.sendMessage(tab.id, { type: "promptDevice" }).catch(() => {});
  }
});