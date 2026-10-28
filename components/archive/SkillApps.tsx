import type { CSSProperties } from 'react';
import './skill-apps.css';

export default function SkillApps() {
  return <ul className="skill-apps" aria-label="创作工具">
    {['ChatGPT', 'Canva', '即梦 AI', '剪映', 'Codex'].map((name, index) => <li key={name} title={name} tabIndex={0} aria-label={name}>
      <span className="skill-app-icon" role="img" aria-label={name} style={{ '--app-position': `${index * 25}%`, backgroundImage: `url(${import.meta.env.BASE_URL}assets/skill-apps.png)` } as CSSProperties} />
      <span className="skill-app-tooltip" aria-hidden="true">{name}</span>
    </li>)}
  </ul>;
}
