"use client";
import type { ComponentType } from "react";
import { BayesCalc, BivariateNormal, Distributions, Linearity, ProbabilityRules } from "./sims1";
import { CefLab, CiCoverage, CltSim, EstimatorRace, PowerViz } from "./sims2";
import { BetaBinomial, DeltaLab, MissingLab, MleLab, SimpsonLab } from "./sims3";
import { CollinearityLab, LeastSquaresLab, LinearSystems, MatrixTransform, VectorLab } from "./sims4";
import { CovarianceLab, EigenLab, GdNewtonLab, GradientLab, TaylorLab } from "./sims5";
import { FwlLab, GmmLab, LagrangeLab, OlsLab, RobustSeLab } from "./sims6";
import { ScienceTable, SpilloverLab, EstimandsLab, RoyLab, RandomisationLab } from "./sims7";
import { NeymanLab, FisherLab, BlockingLab, RegAdjustLab, ClusterLab } from "./sims8";
import { NoncomplianceLab, OverlapLab, PscoreLab, IpwLab, AipwLab } from "./sims9";
import { DagBuilder, FactorisationLab, JunctionsLab, DSepLab, ScmLab } from "./sims10";
import { DoOperatorLab, BackdoorLab, BadControlsLab, FrontdoorLab, DoCalculusLab } from "./sims11";
import { IdentificationLab, SelectionLab, MediationLab, CounterfactualLab, SwigLab } from "./sims12";
import { IvIntroLab, WaldLab, LateLab, TslsLab, WeakIvLab } from "./sims13";
import { OverIdLab, Did2x2Lab, EventStudyLab, TwfeLab, BaconLab } from "./sims14";
import { CsDidLab, DddLab, RdSharpLab, LocalPolyLab, RdBandwidthLab } from "./sims15";
import { RdFuzzyLab, RdValidityLab, RkdLab, BoundsLab, DesignChooser } from "./sims16";

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
  "science-table": ScienceTable,
  spillovers: SpilloverLab,
  estimands: EstimandsLab,
  roy: RoyLab,
  randomisation: RandomisationLab,
  neyman: NeymanLab,
  fisher: FisherLab,
  blocking: BlockingLab,
  "regression-adjustment": RegAdjustLab,
  cluster: ClusterLab,
  noncompliance: NoncomplianceLab,
  overlap: OverlapLab,
  pscore: PscoreLab,
  ipw: IpwLab,
  aipw: AipwLab,
  "dag-builder": DagBuilder,
  factorisation: FactorisationLab,
  junctions: JunctionsLab,
  "d-separation": DSepLab,
  scm: ScmLab,
  "do-operator": DoOperatorLab,
  backdoor: BackdoorLab,
  "bad-controls": BadControlsLab,
  frontdoor: FrontdoorLab,
  "do-calculus": DoCalculusLab,
  identification: IdentificationLab,
  "selection-bias": SelectionLab,
  mediation: MediationLab,
  counterfactual: CounterfactualLab,
  swig: SwigLab,
  "iv-intro": IvIntroLab,
  "wald": WaldLab,
  "late": LateLab,
  "tsls": TslsLab,
  "weak-iv": WeakIvLab,
  "overid": OverIdLab,
  "did-2x2": Did2x2Lab,
  "event-study": EventStudyLab,
  "twfe": TwfeLab,
  "bacon": BaconLab,
  "cs-did": CsDidLab,
  "ddd": DddLab,
  "rd-sharp": RdSharpLab,
  "local-poly": LocalPolyLab,
  "rd-bandwidth": RdBandwidthLab,
  "rd-fuzzy": RdFuzzyLab,
  "rd-validity": RdValidityLab,
  "rkd": RkdLab,
  "bounds": BoundsLab,
  "design-chooser": DesignChooser,
};

export default function Sim({ slug }: { slug: string }) {
  const C = SIMS[slug];
  return C ? <C /> : <p className="muted">Simulator coming soon.</p>;
}
