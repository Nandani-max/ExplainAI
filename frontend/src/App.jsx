import { useState } from "react";

import {
  BrainCircuit,
  Upload,
  FileText,
  Database,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  BarChart3,
  Info,
  Layers3,
  Zap,
  ShieldCheck,
  Activity,
} from "lucide-react";

/* -------------------- Upload Card -------------------- */

function UploadCard({
  title,
  subtitle,
  accept,
  file,
  onFile,
  icon: Icon,
}) {
  return (
    <label className="group block cursor-pointer">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />

      <div
        className={`rounded-2xl border-2 border-dashed p-6 transition-all ${
          file
            ? "border-blue-400 bg-blue-50/70"
            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="rounded-xl bg-slate-100 p-3 group-hover:bg-blue-100">
            <Icon size={22} className="text-slate-700" />
          </div>

          {file && (
            <CheckCircle2 className="text-emerald-500" size={20} />
          )}
        </div>

        <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>

        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

        {file ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white p-3 text-sm">
            <FileText size={17} className="shrink-0 text-blue-600" />

            <span className="truncate font-medium text-slate-700">
              {file.name}
            </span>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-blue-700">
            <Upload size={15} className="mr-2 inline" />
            Browse files or drag and drop
          </div>
        )}
      </div>
    </label>
  );
}

/* -------------------- Feature Contribution Bar -------------------- */

function FeatureBar({ feature, maxWeight }) {
  const supports = feature.direction === "supports_prediction";

  const barWidth =
    maxWeight === 0
      ? 0
      : (Math.abs(feature.weight) / maxWeight) * 100;

  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-slate-800">
            {feature.feature}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {supports
              ? "Supports predicted class"
              : "Opposes predicted class"}
          </p>
        </div>

        <div
          className={`flex shrink-0 items-center gap-1 text-sm font-semibold ${
            supports ? "text-rose-600" : "text-emerald-600"
          }`}
        >
          {supports ? (
            <ArrowUpRight size={16} />
          ) : (
            <ArrowDownRight size={16} />
          )}

          {feature.weight > 0 ? "+" : ""}
          {feature.weight.toFixed(4)}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            supports ? "bg-rose-400" : "bg-emerald-400"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------- Main App -------------------- */

export default function App() {
  const [modelFile, setModelFile] = useState(null);
  const [datasetFile, setDatasetFile] = useState(null);
  const [row, setRow] = useState("0");

  const [showResults, setShowResults] = useState(false);
  const [limeResult, setLimeResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Used to reset the actual file inputs when Reset is clicked
  const [uploadKey, setUploadKey] = useState(0);

  const canExplain = Boolean(modelFile && datasetFile);

  /* -------------------- Backend API Call -------------------- */

  const handleExplain = async () => {
    if (!modelFile || !datasetFile) {
      setError("Please upload both your model and dataset.");
      return;
    }

    if (
      row === "" ||
      Number(row) < 0 ||
      !Number.isInteger(Number(row))
    ) {
      setError("Please enter a valid non-negative row index.");
      return;
    }

    setLoading(true);
    setError("");
    setShowResults(false);
    setLimeResult(null);

    const formData = new FormData();

    formData.append("model_file", modelFile);
    formData.append("dataset_file", datasetFile);
    formData.append("row_index", row);

    try {
      const response = await fetch(
        "http://localhost:8000/explain/lime",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.message ||
              "Failed to generate LIME explanation.";

        throw new Error(errorMessage);
      }

      if (!data.result) {
        throw new Error("The backend returned an invalid response.");
      }

      setLimeResult(data.result);
      setShowResults(true);
    } catch (err) {
      console.error("ExplainAI API error:", err);

      setError(
        err.message ||
          "Unable to connect to the backend. Please check if the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- Reset -------------------- */

  const reset = () => {
    setModelFile(null);
    setDatasetFile(null);
    setRow("0");

    setShowResults(false);
    setLimeResult(null);

    setError("");
    setLoading(false);

    // Remount upload inputs to clear selected files
    setUploadKey((prev) => prev + 1);
  };

  /* -------------------- Dynamic Result Data -------------------- */

  const topFeatures = limeResult?.features
    ? [...limeResult.features].sort(
        (a, b) => Math.abs(b.weight) - Math.abs(a.weight)
      )
    : [];

  const strongestFeature = topFeatures[0];

  const maxWeight =
    limeResult?.features?.length > 0
      ? Math.max(
          ...limeResult.features.map((feature) =>
            Math.abs(feature.weight)
          ),
          0.000001
        )
      : 0;

  const supportingCount =
    limeResult?.features?.filter(
      (feature) => feature.direction === "supports_prediction"
    ).length || 0;

  const opposingCount =
    limeResult?.features?.filter(
      (feature) => feature.direction === "opposes_prediction"
    ).length || 0;

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Top Navigation */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#102b55] p-2.5">
              <BrainCircuit className="text-white" size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                ExplainAI
              </h1>

              <p className="text-xs text-slate-500">
                Model Interpretability Platform
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 md:flex">
            <span className="h-2 w-2 rounded-full bg-blue-500" />

            <span className="text-xs font-medium text-blue-700">
              LIME Module
            </span>
          </div>

          <button
            onClick={reset}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page Heading */}

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
            <Sparkles size={14} />
            Explainability Workspace
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-[#102b55]">
            Understand your model&apos;s predictions
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Upload your trained model and dataset to explore individual
            predictions with LIME (Local Interpretable Model-agnostic
            Explanations).
          </p>
        </div>

        {/* Workflow */}

        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            ["01", "Upload Model", "Select your trained ML model"],
            ["02", "Upload Dataset", "Provide reference data"],
            [
              "03",
              "Generate Explanation",
              "Understand an individual prediction",
            ],
          ].map(([number, title, description]) => (
            <div
              key={number}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                {number}
              </div>

              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Section */}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Upload Panel */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Upload your files
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Start by adding your model and dataset.
                </p>
              </div>

              <Layers3 className="text-slate-400" size={20} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <UploadCard
                key={`model-${uploadKey}`}
                title="Trained ML Model"
                subtitle="Pickle or Joblib model file"
                accept=".pkl,.pickle,.joblib"
                file={modelFile}
                onFile={setModelFile}
                icon={BrainCircuit}
              />

              <UploadCard
                key={`dataset-${uploadKey}`}
                title="Dataset"
                subtitle="CSV dataset for reference"
                accept=".csv"
                file={datasetFile}
                onFile={setDatasetFile}
                icon={Database}
              />
            </div>

            {/* Row Selection */}

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />

                <h4 className="text-sm font-semibold">
                  Instance Selection
                </h4>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Select the dataset row whose prediction you want to explain.
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Row index
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row}
                  onChange={(e) => setRow(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Row indexing starts from 0. For example, row 0 is the
                  first record in your CSV.
                </p>
              </div>
            </div>

            {/* Generate Explanation Button */}

            <button
              onClick={handleExplain}
              disabled={!canExplain || loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#102b55] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles size={17} />

              {loading
                ? "Generating LIME Explanation..."
                : "Generate LIME Explanation"}
            </button>

            {/* Error */}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!canExplain && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Upload both files to continue.
              </p>
            )}

            {/* Loading Information */}

            {loading && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Generating explanation
                    </p>

                    <p className="mt-1 text-xs text-blue-700">
                      The model is being evaluated and LIME is analyzing
                      the selected instance. This may take a few moments.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Right Information Panel */}

          <section className="flex flex-col gap-5">
            {/* LIME Information */}

            <div className="rounded-2xl bg-[#102b55] p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <Zap size={22} />
                </div>

                <div>
                  <h3 className="font-semibold">Powered by LIME</h3>

                  <p className="text-xs text-blue-200">
                    Local explanation technique
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-blue-100">
                LIME explains an individual prediction by approximating
                the behaviour of a complex model near the selected input
                using a simpler, interpretable model.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-blue-200">
                    Explanation Type
                  </p>

                  <p className="mt-1 font-semibold">Local</p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-blue-200">
                    Model Support
                  </p>

                  <p className="mt-1 font-semibold">Model-Agnostic</p>
                </div>
              </div>
            </div>

            {/* How LIME Works */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />

                <h3 className="text-sm font-semibold">
                  How LIME works
                </h3>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  "Select an instance to explain",
                  "Generate perturbed samples around it",
                  "Obtain predictions from the original model",
                  "Fit a weighted local interpretable model",
                  "Display the influential features",
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                      {i + 1}
                    </span>

                    <p className="pt-1 text-sm text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* LIME Results */}

        {showResults && limeResult && (
          <section className="mt-8">
            {/* Results Heading */}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity size={20} className="text-blue-600" />

                  <h2 className="text-xl font-bold text-[#102b55]">
                    LIME Explanation Results
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Local explanation for dataset row {limeResult.row_index}
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 size={14} className="mr-1 inline" />
                Actual backend results
              </span>
            </div>

            {/* Result Cards */}

            <div className="grid gap-4 md:grid-cols-3">
              {/* Prediction */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Model Prediction
                </p>

                <p className="mt-3 break-words text-2xl font-bold text-[#102b55]">
                  {limeResult.prediction}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Predicted class by uploaded model
                </p>
              </div>

              {/* Probability */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Predicted Probability
                </p>

                <p className="mt-3 text-2xl font-bold text-[#102b55]">
                  {(limeResult.probability * 100).toFixed(2)}%
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Probability for the predicted class
                </p>
              </div>

              {/* Selected Row */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Explained Instance
                </p>

                <p className="mt-3 text-2xl font-bold text-[#102b55]">
                  Row {limeResult.row_index}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Selected dataset instance
                </p>
              </div>
            </div>

            {/* Feature Contributions + Summary */}

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {/* Feature Contributions */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Feature Contributions
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Features supporting or opposing the prediction
                    </p>
                  </div>

                  <BarChart3 className="text-blue-500" size={20} />
                </div>

                {/* Actual LIME Features */}

                <div className="mt-5">
                  {limeResult.features.map((feature, index) => (
                    <FeatureBar
                      key={`${feature.feature}-${index}`}
                      feature={feature}
                      maxWeight={maxWeight}
                    />
                  ))}
                </div>

                {/* Legend */}

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    Supports prediction
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Opposes prediction
                  </span>
                </div>

                {/* Feature Counts */}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-rose-50 p-3">
                    <p className="text-xs text-rose-600">
                      Supporting features
                    </p>

                    <p className="mt-1 text-lg font-bold text-rose-700">
                      {supportingCount}
                    </p>
                  </div>

                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-600">
                      Opposing features
                    </p>

                    <p className="mt-1 text-lg font-bold text-emerald-700">
                      {opposingCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Explanation Summary */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={19} className="text-violet-500" />

                  <h3 className="font-semibold">
                    Explanation Summary
                  </h3>
                </div>

                {/* Dynamic Summary */}

                <div className="mt-5 rounded-xl bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Why was this prediction made?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    The uploaded model predicted{" "}
                    <strong>{limeResult.prediction}</strong> for dataset
                    row <strong>{limeResult.row_index}</strong>.

                    {strongestFeature && (
                      <>
                        {" "}
                        The strongest feature in this local explanation
                        was <strong>{strongestFeature.feature}</strong>,
                        with a LIME weight of{" "}
                        <strong>
                          {strongestFeature.weight.toFixed(4)}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </div>

                {/* Top Influencing Features */}

                <h4 className="mt-5 text-sm font-semibold text-slate-800">
                  Key influencing features
                </h4>

                <div className="mt-3 space-y-2">
                  {topFeatures.slice(0, 3).map((feature, i) => (
                    <div
                      key={`${feature.feature}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-slate-500">
                          {i + 1}
                        </span>

                        <span className="truncate text-sm font-medium text-slate-700">
                          {feature.feature}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          feature.direction === "supports_prediction"
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {feature.direction === "supports_prediction"
                          ? "Supports"
                          : "Opposes"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Explanation Information */}

                <div className="mt-5 flex items-start gap-2 rounded-lg border border-slate-100 p-3">
                  <Info
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <p className="text-xs leading-5 text-slate-500">
                    LIME provides a local approximation of model
                    behaviour around this instance. Feature
                    contributions describe the local explanation and
                    should not be interpreted as the model&apos;s
                    global behaviour or as probabilities.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}

        <footer className="mt-10 border-t border-slate-200 py-5">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row">
            <p>ExplainAI · Explainable Machine Learning</p>

            <p>Phase I · LIME Implementation</p>
          </div>
        </footer>
      </main>
    </div>
  );
}