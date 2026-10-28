import './skill-apps.css';

export default function SkillApps() {
  return <ul className="skill-apps" aria-label="创作工具">
    {['ChatGPT', 'Canva', '即梦 AI', '剪映', 'Codex'].map((name, index) => <li key={name} title={name} tabIndex={0} aria-label={name}>
      {index < 4 ? <img className="skill-app-original" src={`${import.meta.env.BASE_URL}assets/app-icons/${['chatgpt', 'canva', 'jimeng', 'capcut'][index]}.png`} alt={name} draggable={false} /> : <span className="skill-app-icon" role="img" aria-label={name} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/skill-apps.png)` }} />}
      <span className="skill-app-tooltip" aria-hidden="true">{name}</span>
    </li>)}
  </ul>;
}
