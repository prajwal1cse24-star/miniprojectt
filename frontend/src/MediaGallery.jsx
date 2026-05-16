import React from "react";

const mediaEntries = Object.entries(
  import.meta.glob("./assets/media/*.{gif,jpg,jpeg,png,webp}", {
    eager: true,
    import: "default",
    query: "?url",
  })
)
  .map(([path, url]) => {
    const fileName = path.split("/").pop() || path;
    return {
      name: fileName,
      label: fileName.replace(/\.[^.]+$/, ""),
      url,
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name));

const MediaGallery = () => {
  return (
    <section className="panel media-gallery">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Imported GitHub media</p>
          <h2>Reference gallery</h2>
          <p className="section-note">All dashboard media from admin-dashboards/react-dashboards/media is bundled locally and previewed here.</p>
        </div>
        <div className="account-pill">{mediaEntries.length} files</div>
      </div>

      <div className="media-gallery-grid">
        {mediaEntries.map((entry) => (
          <a key={entry.name} className="media-tile" href={entry.url} target="_blank" rel="noreferrer" title={entry.label}>
            <img src={entry.url} alt={entry.label} loading="lazy" />
            <span>{entry.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default React.memo(MediaGallery);