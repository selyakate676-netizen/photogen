export type AiPipelineVersion = "legacy-lora-v1" | "hybrid-v1";

export type AiPipelineStage =
  | "training"
  | "identity"
  | "composition"
  | "face-integration"
  | "upscale"
  | "final";

export type AiPipelineArtifactKind =
  | "training-dataset"
  | "lora-weights"
  | "identity-reference"
  | "composition-candidate"
  | "face-integrated-candidate"
  | "upscaled-result"
  | "final-result";

export type AiPipelineArtifactStorage = "s3" | "remote-url" | "replicate-output";

export type AiPipelineCandidateStatus = "pending" | "processing" | "ready" | "selected" | "rejected" | "failed";

export type AiFaceIntegrationMethod = "lora-img2img" | "inpainting" | "face-swap";

export interface AiPipelineArtifact {
  kind: AiPipelineArtifactKind;
  storage: AiPipelineArtifactStorage;
  value: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AiPipelineCandidate {
  id: string;
  photoshootId: string;
  pipelineVersion: AiPipelineVersion;
  stage: AiPipelineStage;
  status: AiPipelineCandidateStatus;
  artifacts: AiPipelineArtifact[];
  promptVersion?: string;
  modelVersion?: string;
  qualityScore?: number;
  createdAt?: string;
}

export interface AiPipelineStageResult {
  photoshootId: string;
  pipelineVersion: AiPipelineVersion;
  stage: AiPipelineStage;
  status: "succeeded" | "failed" | "skipped";
  candidates: AiPipelineCandidate[];
  errorMessage?: string;
}

export interface AiPipelineFinalResult {
  photoshootId: string;
  pipelineVersion: AiPipelineVersion;
  selectedArtifacts: AiPipelineArtifact[];
  resultImageKeys: string[];
  qualityScore?: number;
}
