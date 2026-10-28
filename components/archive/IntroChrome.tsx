import { templateProfile, screenText } from './content';

type IntroChromeProps = {
  onOpen: () => void;
};

export default function IntroChrome({ onOpen }: IntroChromeProps) {
  return (
    <>
      <header className="archive-intro-header">
        <div className="archive-intro-brand">
          <span className="archive-intro-brand-name" data-edit-path="templateProfile.brand">{templateProfile.brand}</span>
          <span className="archive-intro-brand-separator" aria-hidden="true">/</span>
          <span className="archive-intro-brand-discipline" data-edit-path="templateProfile.discipline">{templateProfile.discipline}</span>
        </div>
        <span className="archive-intro-role">{screenText.intro.status}</span>
      </header>
      <footer className="archive-intro-footer">
        <button className="archive-intro-skip" type="button" onClick={onOpen}>{screenText.intro.openButton}</button>
      </footer>
    </>
  );
}
