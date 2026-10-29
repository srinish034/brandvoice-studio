
import { AlertTriangle, Loader2 } from "lucide-react";
import EmptyState from "./EmptyState.jsx";
import BriefPreview from "./BriefPreview.jsx";

export default function WorkspacePanel({
  status,
  brief,
  preparedAt,
  generatedResult,
  errorMessage,
  onRetry,
}) {
  return (
    <section
      className="panel workspace"
      aria-label="Voice and results workspace"
      aria-live="polite"
    >
      {status === "idle" && <EmptyState />}

      {status === "loading" && (
        <div className="workspace__center" role="status">
          <Loader2
            className="icon icon--spin icon--large"
            aria-hidden="true"
          />
          <p className="workspace__center-title">
            Analyzing your brand voice…
          </p>
          <p className="muted">
            Connecting to AI and drafting your tweets. This may take a moment.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="workspace__center">
          <AlertTriangle
            className="icon icon--large icon--danger"
            aria-hidden="true"
          />
          <p className="workspace__center-title">
            Something went wrong
          </p>
          <p className="muted">{errorMessage}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={onRetry}
          >
            Back to form
          </button>
        </div>
      )}

      {status === "ready" && brief && generatedResult && (
        <BriefPreview
          brief={brief}
          preparedAt={preparedAt}
          generatedResult={generatedResult}
        />
      )}
    </section>
  );
}
