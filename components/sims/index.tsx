"use client";
import type { ComponentType } from "react";
import { BayesCalc, BivariateNormal, Distributions, Linearity, ProbabilityRules } from "./sims1";
import { CefLab, CiCoverage, CltSim, EstimatorRace, PowerViz } from "./sims2";
import { BetaBinomial, DeltaLab, MissingLab, MleLab, SimpsonLab } from "./sims3";
import { CollinearityLab, LeastSquaresLab, LinearSystems, MatrixTransform, VectorLab } from "./sims4";
import { CovarianceLab, EigenLab, GdNewtonLab, GradientLab, TaylorLab } from "./sims5";
import { FwlLab, GmmLab, LagrangeLab, OlsLab, RobustSeLab } from "./sims6";

const SIMS: Record<string, ComponentType> = {
  "probability-rules": ProbabilityRules,
  bayes: BayesCalc,
  linearity: Linearity,
  distributions: Distributions,
  "bivariate-normal": BivariateNormal,
  cef: CefLab,
  clt: CltSim,
  estimators: EstimatorRace,
  "ci-coverage": CiCoverage,
  power: PowerViz,
  mle: MleLab,
  delta: DeltaLab,
  "bayes-update": BetaBinomial,
  missing: MissingLab,
  simpson: SimpsonLab,
  vectors: VectorLab,
  "matrix-transform": MatrixTransform,
  collinearity: CollinearityLab,
  "linear-systems": LinearSystems,
  "least-squares": LeastSquaresLab,
  eigen: EigenLab,
  covariance: CovarianceLab,
  taylor: TaylorLab,
  gradient: GradientLab,
  "gd-newton": GdNewtonLab,
  lagrange: LagrangeLab,
  ols: OlsLab,
  fwl: FwlLab,
  "robust-se": RobustSeLab,
  gmm: GmmLab,
};

export default function Sim({ slug }: { slug: string }) {
  const C = SIMS[slug];
  return C ? <C /> : <p className="muted">Simulator coming soon.</p>;
}
