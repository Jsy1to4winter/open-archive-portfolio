import { contactEmail, contactPhone, otherPortfolioUrl, templateProfile } from './content';
import { profileBiography } from './profile-copy';

export default function ResumeDetails() {
  return <article className="archive-resume-details" aria-label="个人介绍">
    <header className="archive-resume-details-header">
      <h2 className="archive-resume-details-name">{templateProfile.name}</h2>
      <p className="archive-resume-subline">{templateProfile.disciplines}</p>
      <div className="archive-resume-contact">
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a><span aria-hidden="true">/</span>
        <a href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}>{contactPhone}</a><span aria-hidden="true">/</span>
        <span>{templateProfile.location}</span><span aria-hidden="true">/</span>
        <a href={otherPortfolioUrl} target="_blank" rel="noopener noreferrer">Portfolio</a>
      </div>
    </header>
    <div className="archive-resume-details-body profile-about-layout">
      <div className="profile-about-image" data-edit-path="templateProfile.image">
        {templateProfile.image ? <img src={templateProfile.image} alt={templateProfile.name} /> : <span role="img" aria-label="个人图片位" />}
      </div>
      <section className="profile-about-copy">
        <h3>About</h3>
        <p data-edit-path="templateProfile.biography">{profileBiography(templateProfile.biography)}</p>
      </section>
    </div>
  </article>;
}
