export default defineBackground(() => {
  async function ensureContentScript(tabId: number) {
    try {
      await browser.tabs.sendMessage(tabId, { type: 'ping' });
    } catch {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/content.js'],
      });
    }
  }

  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'convert-page') {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        try {
          await ensureContentScript(tab.id);
          await browser.tabs.sendMessage(tab.id, { type: 'convert-and-copy' });
        } catch {
          // Cannot access page (chrome://, etc.)
        }
      }
    }
  });
});
