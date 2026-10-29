import { useRef } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import Field from "./Field.jsx";
import {
  INDUSTRY_OPTIONS,
  OBJECTIVE_OPTIONS,
  TONE_OPTIONS,
  LIMITS,
} from "../formConfig.js";

/**
 * The brand brief form. It is fully controlled by App:
 * values, errors and submit state all come in as props.
 */
export default function BrandBriefForm({
  values,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  onReset,
}) {
  const formRef = useRef(null);
  const hasBrandName = values.brandName.trim().length > 0;

  const handleChange = (event) => {
    onChange(event.target.name, event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formRef.current);
  };

  return (
    <form
      className="panel brief-form"
      onSubmit={handleSubmit}
      onReset={(event) => {
        event.preventDefault();
        onReset();
      }}
      ref={formRef}
      noValidate
    >
      <header className="panel__header">
        <h2 className="panel__title">Brand brief</h2>
        <p className="panel__subtitle">
          Tell us about the brand and campaign. Only the fields marked required
          need to be filled in.
        </p>
      </header>

      <fieldset className="brief-form__fieldset" disabled={isSubmitting}>
        <Field label="Brand name" helper="Leave blank if you'd rather describe the campaign below.">
          {(a11y) => (
            <input
              {...a11y}
              className="control"
              type="text"
              name="brandName"
              value={values.brandName}
              onChange={handleChange}
              placeholder="e.g. Notion, Nike, or your brand"
              autoComplete="organization"
            />
          )}
        </Field>

        <div className="brief-form__row">
          <Field label="Industry">
            {(a11y) => (
              <select
                {...a11y}
                className="control"
                name="industry"
                value={values.industry}
                onChange={handleChange}
              >
                <option value="">Select an industry</option>
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Campaign objective">
            {(a11y) => (
              <select
                {...a11y}
                className="control"
                name="objective"
                value={values.objective}
                onChange={handleChange}
              >
                <option value="">Select an objective</option>
                {OBJECTIVE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Field
          label="Product or campaign details"
          required={!hasBrandName}
          helper={
            hasBrandName
              ? "Describe the product, offer, key benefits, or campaign. Helpful, but optional when a brand name is given."
              : "Describe the product, offer, key benefits, or campaign. Required when no brand name is given."
          }
          error={errors.details}
          counter={{ current: values.details.length, max: LIMITS.details }}
        >
          {(a11y) => (
            <textarea
              {...a11y}
              className="control control--textarea"
              name="details"
              rows={4}
              value={values.details}
              onChange={handleChange}
              placeholder="e.g. A new project-management app that turns meeting notes into tasks automatically. Launching next month with a free 30-day trial."
            />
          )}
        </Field>

        <Field
          label="Target audience"
          error={errors.audience}
          counter={{ current: values.audience.length, max: LIMITS.audience }}
        >
          {(a11y) => (
            <input
              {...a11y}
              className="control"
              type="text"
              name="audience"
              value={values.audience}
              onChange={handleChange}
              placeholder="e.g. Early-stage founders and marketing teams"
            />
          )}
        </Field>

        <Field label="Preferred tone" helper="Pick a tone and all 10 tweets will be written in that style. Leave blank for a mix of conversational, promotional, witty and informative.">
          {(a11y) => (
            <select
              {...a11y}
              className="control"
              name="tone"
              value={values.tone}
              onChange={handleChange}
            >
              <option value="">Select a tone</option>
              {TONE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="Existing social media posts"
          helper="Paste 5–10 of your past posts, one per line. Real examples give stronger evidence of your brand's actual writing style. Nothing is fetched from social media automatically."
          error={errors.existingPosts}
          counter={{
            current: values.existingPosts.length,
            max: LIMITS.existingPosts,
          }}
        >
          {(a11y) => (
            <textarea
              {...a11y}
              className="control control--textarea"
              name="existingPosts"
              rows={5}
              value={values.existingPosts}
              onChange={handleChange}
              placeholder={
                "Paste previous posts here, one per line.\nThe more you add, the better the voice profile can be."
              }
            />
          )}
        </Field>
      </fieldset>

      <div className="brief-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="icon icon--spin" aria-hidden="true" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="icon" aria-hidden="true" />
              Analyze voice &amp; generate tweets
            </>
          )}
        </button>
        <button
          type="reset"
          className="button button--ghost"
          disabled={isSubmitting}
        >
          <RotateCcw className="icon" aria-hidden="true" />
          Clear form
        </button>
      </div>
      <p className="brief-form__note">
        When you submit, your brief is sent to our server and processed by
        Google Gemini to infer a brand voice and write the tweets. Nothing is
        fetched from social media. The voice is inferred only from what you
        enter here.
      </p>
    </form>
  );
}
