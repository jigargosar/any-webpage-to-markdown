import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    turndown.addRule('fencedCodeBlockWithLang', {
      filter(node) {
        return (
          node.nodeName === 'PRE' &&
          node.firstChild !== null &&
          node.firstChild.nodeName === 'CODE'
        );
      },
      replacement(_content, node) {
        const codeEl = node as HTMLPreElement;
        const codeChild = codeEl.querySelector('code');
        if (!codeChild) return _content;

        const className = codeChild.getAttribute('class') || '';
        const langMatch = className.match(/(?:language|lang)-(\w+)/);
        const lang = langMatch ? langMatch[1] : '';
        const code = codeChild.textContent || '';

        return `\n\n\`\`\`${lang}\n${code.replace(/\n$/, '')}\n\`\`\`\n\n`;
      },
    });

    function convertPage(selectionOnly: boolean) {
      let html: string;
      let title = document.title;

      if (selectionOnly) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const container = document.createElement('div');
          for (let i = 0; i < selection.rangeCount; i++) {
            container.appendChild(selection.getRangeAt(i).cloneContents());
          }
          html = container.innerHTML;
        } else {
          return { success: false as const, error: 'No text selected' };
        }
      } else {
        const clonedDoc = document.cloneNode(true) as Document;
        const reader = new Readability(clonedDoc);
        const article = reader.parse();

        if (article?.content) {
          html = article.content;
          title = article.title ?? document.title;
        } else {
          html = document.body.innerHTML;
        }
      }

      const markdown = turndown.turndown(html);
      return { success: true as const, markdown, title, url: window.location.href };
    }

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'convert') {
        try {
          return Promise.resolve(convertPage(message.selectionOnly === true));
        } catch (err) {
          return Promise.resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (message.type === 'convert-and-copy') {
        try {
          const result = convertPage(false);
          if (result.success) {
            navigator.clipboard.writeText(result.markdown).catch(() => {
              // clipboard write may fail without user gesture
            });
          }
          return Promise.resolve(result);
        } catch (err) {
          return Promise.resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    });
  },
});
