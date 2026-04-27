export function injectStyles() {
  if (document.getElementById('saas-styles')) return;

  const oldStyles = document.getElementById('tech-noir-styles');
  if (oldStyles) oldStyles.remove();

  const style = document.createElement('style');
  style.id = 'saas-styles';
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    :root {
      --bg-page: #F9FAFB;
      --bg-surface: #FFFFFF;
      --border-light: #E5E7EB;
      --text-main: #111827;
      --text-muted: #6B7280;
      --status-active: #10B981;
      --status-idle: #6B7280;
      --status-warning: #F59E0B;
      --status-critical: #EF4444;
      --brand-primary: #2563EB;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: var(--bg-page);
      color: var(--text-main);
      margin: 0;
      overflow: hidden;
    }
    .leaflet-container { background: #E5E7EB !important; font-family: 'Inter', sans-serif; }
    .leaflet-popup-content-wrapper {
      background: var(--bg-surface) !important;
      border: 1px solid var(--border-light);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      color: var(--text-main) !important;
      border-radius: 8px !important;
      padding: 0;
    }
    .leaflet-popup-content { margin: 12px; }
    .leaflet-popup-tip { background: var(--bg-surface) !important; border-top: 1px solid var(--border-light); border-left: 1px solid var(--border-light); }
    .custom-leaflet-icon { background: transparent; border: none; }
    .equipment-leaflet-icon { background: transparent; border: none; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
  `;
  document.head.appendChild(style);
}
