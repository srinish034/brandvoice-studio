import { FileText, Fingerprint, MessageSquareText, ArrowRight } from "lucide-react";

const STAGES = [
  { icon: FileText, label: "Brand brief", hint: "You describe the brand" },
  { icon: Fingerprint, label: "Voice profile", hint: "Tone and style summary" },
  { icon: MessageSquareText, label: "10 tweets", hint: "Varied, on-brand drafts" },
];

/** Shown in the workspace before the first submission. */
export default function EmptyState() {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">Your brand voice, made actionable.</h2>
      <p className="empty-state__text">
        Fill in the brief on the left. BrandVoice Studio will turn it into a
        voice profile that guides ten tweets written to sound like your brand.
      </p>

      <ol className="stages" aria-label="How it works">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <li className="stages__item" key={stage.label}>
              <div className="stage">
                <span className="stage__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="stage__label">
                  {index + 1}. {stage.label}
                </span>
                <span className="stage__hint">{stage.hint}</span>
              </div>
              {index < STAGES.length - 1 && (
                <ArrowRight className="stages__arrow" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="preview-sample" aria-hidden="true">
        <p className="preview-sample__caption">What you'll receive</p>
        <div className="preview-sample__voice">
          <span className="skeleton skeleton--short" />
          <span className="skeleton" />
          <span className="skeleton skeleton--medium" />
        </div>
        <div className="preview-sample__tweets">
          <div className="preview-sample__tweet">
            <span className="skeleton" />
            <span className="skeleton skeleton--medium" />
          </div>
          <div className="preview-sample__tweet">
            <span className="skeleton" />
            <span className="skeleton skeleton--short" />
          </div>
        </div>
        <p className="preview-sample__note">Illustration only. No sample content is generated.</p>
      </div>
    </div>
  );
}
