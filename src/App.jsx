
import { useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import BrandBriefForm from "./components/BrandBriefForm.jsx";
import WorkspacePanel from "./components/WorkspacePanel.jsx";
import { INITIAL_VALUES, validateBrief } from "./formConfig.js";

// Empty by default: calls go to "/api/..." on the same origin (Vite proxies it in
// development, Express serves everything in production). Set VITE_API_BASE_URL at
// build time only if the API lives on a different domain.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 90000;

export default function App() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [preparedBrief, setPreparedBrief] = useState(null);
  const [preparedAt, setPreparedAt] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const workspaceRef = useRef(null);

  const handleChange = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));

    setErrors((current) => {
      if (!current[name] && !(name === "brandName" && current.details)) {
        return current;
      }

      const next = { ...current };
      delete next[name];

      if (name === "brandName") {
        delete next.details;
      }

      return next;
    });
  };

  const handleSubmit = async (formElement) => {
    const validationErrors = validateBrief(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstInvalid = formElement?.querySelector(
        '[aria-invalid="true"]'
      );
      firstInvalid?.focus();
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setGeneratedResult(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            brandName: values.brandName,
            industry: values.industry,
            objective: values.objective,
            products: values.details,
            audience: values.audience,
            tone: values.tone,
            socialPosts: values.existingPosts,
          }),
        });
      } catch (networkError) {
        throw new Error(
          networkError.name === "AbortError"
            ? "The request took too long. Please try again."
            : "Could not reach the server. Check your connection and try again."
        );
      }

      // The server normally answers in JSON, but a proxy or host error page may not.
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `The server returned an error (${response.status}). Please try again.`
        );
      }

      if (
        !data ||
        data.status !== "success" ||
        !data.voiceProfile ||
        !Array.isArray(data.tweets)
      ) {
        throw new Error("The server returned an unexpected response.");
      }

      setPreparedBrief({ ...values });
      setPreparedAt(new Date());
      setGeneratedResult(data);
      setStatus("ready");

      workspaceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong. Please try again."
      );
      setStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleReset = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setPreparedBrief(null);
    setPreparedAt(null);
    setGeneratedResult(null);
    setErrorMessage("");
    setStatus("idle");
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark">
            <AudioLines aria-hidden="true" />
          </span>
          <div>
            <h1 className="brand__name">BrandVoice Studio</h1>
            <p className="brand__tagline">
              Turn a brand brief into on-brand tweets.
            </p>
          </div>
        </div>
      </header>

      <main className="app__main">
        <BrandBriefForm
          values={values}
          errors={errors}
          isSubmitting={status === "loading"}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />

        <div ref={workspaceRef} className="app__workspace">
          <WorkspacePanel
            status={status}
            brief={preparedBrief}
            preparedAt={preparedAt}
            generatedResult={generatedResult}
            errorMessage={errorMessage}
            onRetry={() => setStatus("idle")}
          />
        </div>
      </main>
    </div>
  );
}
