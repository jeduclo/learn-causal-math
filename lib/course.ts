/** Course-wide information. Edit freely. */
export const COURSE = {
  title: "Beginner to Ninja: Math for Causal Inference",
  short: "Math for Causal Inference",
  tagline:
    "A 100-day bootcamp that builds every piece of mathematics behind modern causal inference, from probability axioms to double machine learning.",
  audience: "For Economists",
  author: "Site Created by Jean Alegue, PhD",
  /** Fill these in once the site is on GitHub to switch on "Open in Colab" buttons. */
  github: { user: "", repo: "", branch: "main" },
};

export type Phase = {
  n: number;
  title: string;
  days: [number, number];
  color: string;
  colorDark: string;
  blurb: string;
};

export const PHASES: Phase[] = [
  { n: 1, title: "Probability & Statistical Inference", days: [1, 15], color: "#2a78d6", colorDark: "#3987e5",
    blurb: "Axioms, conditional probability, expectations, distributions, the CEF, LLN/CLT, estimators, intervals, tests, MLE, the delta method, Bayes and missing data." },
  { n: 2, title: "Linear Algebra & Optimization", days: [16, 30], color: "#eb6834", colorDark: "#d95926",
    blurb: "Vectors and matrices, rank, projections, eigenvalues, calculus and optimisation, and OLS derived in matrix form." },
  { n: 3, title: "The Potential Outcomes Framework", days: [31, 45], color: "#1baf7a", colorDark: "#199e70",
    blurb: "The Rubin causal model, SUTVA, estimands, randomisation inference, unconfoundedness, propensity scores and doubly robust estimation." },
  { n: 4, title: "Graphical Models (DAGs)", days: [46, 60], color: "#6250d6", colorDark: "#9085e9",
    blurb: "DAGs, d-separation, structural causal models, the back-door and front-door criteria, do-calculus and mediation." },
  { n: 5, title: "Core Econometric Strategies", days: [61, 80], color: "#e34948", colorDark: "#e66767",
    blurb: "Instrumental variables and LATE, difference-in-differences with staggered adoption, regression discontinuity and bounds." },
  { n: 6, title: "Advanced & Algorithmic Causal Inference", days: [81, 100], color: "#008300", colorDark: "#2f9e2f",
    blurb: "Matching and balancing, synthetic control, influence functions, double/debiased ML, heterogeneous effects and policy learning." },
];

/** Titles of all 100 days. Days with a file in content/days are published; the rest show as "coming soon". */
export const DAY_TITLES: Record<number, string> = {
  1: "Probability Axioms & Set Theory",
  2: "Conditional Probability, Independence & Bayes",
  3: "Random Variables, Expectation & Variance",
  4: "Common Distributions & the Data-Generating Process",
  5: "Joint Distributions, Covariance & Correlation",
  6: "Conditional Expectation, the LIE & Total Variance",
  7: "The Law of Large Numbers & Central Limit Theorem",
  8: "Estimators: Bias, Variance, MSE & Consistency",
  9: "Confidence Intervals & the Bootstrap",
  10: "Hypothesis Testing, p-Values & Power",
  11: "Maximum Likelihood Estimation",
  12: "The Delta Method",
  13: "Bayesian Inference",
  14: "Missing Data & Inverse Probability Weighting",
  15: "Phase 1 Capstone: Simpson's Paradox, Conditional Independence & Selection Bias",
  16: "Vectors, Matrices & the Dot Product",
  17: "Matrix Multiplication, Transpose & the Design Matrix",
  18: "Linear Independence, Span & Rank",
  19: "Inverses, Determinants & Systems of Equations",
  20: "Projections, Orthogonality & the Geometry of Least Squares",
  21: "Eigenvalues, Eigenvectors & Quadratic Forms",
  22: "Positive-Definite Matrices & Variance–Covariance Matrices",
  23: "Derivatives, Partial Derivatives & Taylor Series",
  24: "Matrix Calculus & Gradients",
  25: "Unconstrained Optimisation & Convexity",
  26: "Constrained Optimisation & Lagrange Multipliers",
  27: "OLS in Matrix Form",
  28: "Frisch–Waugh–Lovell & Partialling Out",
  29: "OLS Asymptotics & Robust (Sandwich) Variance",
  30: "Phase 2 Capstone: GMM & Numerical Optimisation",
  31: "The Rubin Causal Model & Potential Outcomes",
  32: "SUTVA & Interference",
  33: "Estimands: ATE, ATT, ATC & CATE",
  34: "The Fundamental Problem & Selection Bias",
  35: "Randomisation & Identification",
  36: "Neyman's Repeated-Sampling Variance",
  37: "Fisher's Exact Test & Randomisation Inference",
  38: "Stratified & Blocked Experiments",
  39: "Regression Adjustment in Experiments (Lin's Estimator)",
  40: "Cluster Randomisation & Design Effects",
  41: "Non-Compliance & Intention-to-Treat",
  42: "Unconfoundedness & Overlap",
  43: "The Propensity Score Theorem",
  44: "IPW & Hájek Estimators of the ATE",
  45: "Phase 3 Capstone: Doubly Robust (AIPW) Estimation",
  46: "Graph Basics & Directed Acyclic Graphs",
  47: "Factorisation & the Markov Property",
  48: "Chains, Forks & Colliders",
  49: "d-Separation",
  50: "Structural Causal Models",
  51: "Interventions & the do-Operator",
  52: "The Back-Door Criterion",
  53: "Adjustment Sets & Bad Controls",
  54: "The Front-Door Criterion",
  55: "The Rules of do-Calculus",
  56: "Identification Algorithms & Non-Identifiable Queries",
  57: "Selection Bias in DAGs",
  58: "Mediation: Direct & Indirect Effects",
  59: "Counterfactuals & the Ladder of Causation",
  60: "Phase 4 Capstone: DAGs Meet Potential Outcomes (SWIGs)",
  61: "Endogeneity & the Instrumental-Variables Idea",
  62: "The Wald Estimator",
  63: "LATE & Compliers (Imbens–Angrist)",
  64: "2SLS in Matrix Form",
  65: "Weak Instruments & Robust Inference",
  66: "Over-Identification & Instrument Validity",
  67: "Difference-in-Differences: the 2×2 Case",
  68: "Parallel Trends & Event Studies",
  69: "Two-Way Fixed Effects & Panel Algebra",
  70: "Staggered Adoption: the Goodman-Bacon Decomposition",
  71: "Heterogeneity-Robust DiD (Callaway–Sant'Anna, Sun–Abraham)",
  72: "Triple Differences & Changes-in-Changes",
  73: "Sharp Regression Discontinuity",
  74: "Local Polynomial Regression & Kernels",
  75: "Bandwidth Selection & Bias Correction",
  76: "Fuzzy RD as Local IV",
  77: "RD Validity: Density Tests & Covariate Balance",
  78: "Regression Kink & RD Extensions",
  79: "Bounds & Partial Identification (Manski, Lee)",
  80: "Phase 5 Capstone: Choosing a Design",
  81: "Matching Estimators & Their Bias",
  82: "Propensity-Score Matching & Weighting: Proofs",
  83: "Covariate Balance, Entropy & KL Divergence",
  84: "Entropy Balancing & Calibration Weights",
  85: "Synthetic Control: the Weight Problem",
  86: "Synthetic Control Inference & Synthetic DiD",
  87: "Influence Functions",
  88: "Semiparametric Efficiency Bounds",
  89: "Neyman Orthogonality",
  90: "Double/Debiased Machine Learning & Cross-Fitting",
  91: "DML for Partially Linear & Interactive Models",
  92: "CATE & Meta-Learners (S, T, X, R, DR)",
  93: "Causal Trees & Forests",
  94: "Policy Learning & Optimal Treatment Rules",
  95: "Sensitivity Analysis (Rosenbaum, Cinelli–Hazlett)",
  96: "Dynamic Treatments & Markov Processes",
  97: "Interference & Spillovers",
  98: "Causal Discovery Basics",
  99: "Many Estimates: Multiple Testing & Shrinkage",
  100: "Final Capstone: From Data to a Defensible Causal Estimate",
};

export function phaseOf(day: number): Phase {
  return PHASES.find((p) => day >= p.days[0] && day <= p.days[1])!;
}

/** The 2-hour session plan used on every day page. */
export const SESSION_PLAN = [
  { label: "Theory", minutes: 25 },
  { label: "Warm-up (1–5)", minutes: 20 },
  { label: "Proofs (6–10)", minutes: 35 },
  { label: "Applied (11–15)", minutes: 25 },
  { label: "Python & Lab", minutes: 15 },
];

export function colabUrl(day: number): string | null {
  const { user, repo, branch } = COURSE.github;
  if (!user || !repo) return null;
  return `https://colab.research.google.com/github/${user}/${repo}/blob/${branch}/public/notebooks/${dayId(day)}.ipynb`;
}

export const dayId = (day: number) => `d${String(day).padStart(2, "0")}`;
