import { HIGHLIGHT_COLORS } from './constants';

export const getHighlights = (text, allFlatNotes, isDarkMode) => {
  if (!text) return "";
  let h = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ハッシュ先頭行に背景だけ付ける(色はインラインスタイルで指定)
  const bgColor = isDarkMode ? 'rgba(99,102,241,0.2)' : 'rgba(199,210,254,1)';
  h = h.split('\n').map(line => {
    if (line.startsWith('# ')) {
      return `<span style="background:${bgColor};color:transparent;display:inline-block;width:100%">${line}</span>`;
    }
    return line;
  }).join('\n');

  [...allFlatNotes].sort((a,b) => b.name.length - a.name.length).forEach(n => {
    if (!n.name) return;
    const colorCfg = HIGHLIGHT_COLORS.find(c => c.id === n.parentColorId) || HIGHLIGHT_COLORS[0];
    const cls = `${colorCfg.bg} ${colorCfg.border} border-b-2 text-transparent`;
    h = h.replace(new RegExp(`(${n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'), `<span class="${cls}">$1</span>`);
  });
  return h.replace(/\n/g, '<br/>') + ' ';
};
