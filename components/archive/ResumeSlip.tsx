import { templateProfile } from './content';
export default function ResumeSlip({ onOpen }: { onOpen: () => void }) {
  return <button className="archive-resume-slip archive-name-slip" type="button" onClick={onOpen} aria-label="Open the profile">
    <strong data-edit-path="templateProfile.name" className="archive-name-slip-name">{templateProfile.name}</strong>
    <span data-edit-path="templateProfile.slipIntroduction" className="archive-name-slip-introduction">{templateProfile.slipIntroduction}</span>
  </button>;
}
