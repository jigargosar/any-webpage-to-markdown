export default defineBackground(() => {
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'convert-page') {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        try {
          await browser.tabs.sendMessage(tab.id, { type: 'convert-and-copy' });
        } catch {
          // Content script not loaded yet — ignore
        }
      }
    }
  });
});
