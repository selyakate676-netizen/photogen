import Replicate from "replicate";

const FLUX_LORA_MODEL_ID = "selyakate676-netizen/photogen_models";
const NANO_BANANA_MODEL_ID = "google/nano-banana";
const FACE_SWAP_VERSION_ID = "278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34";

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireArg(name) {
  const value = getArg(name);
  if (!value) throw new Error(`Missing required argument: --${name}`);
  return value;
}

function getArgs(name) {
  const values = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}` && process.argv[i + 1]) values.push(process.argv[i + 1]);
  }
  return values;
}

function getFirstOutputUrl(output) {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPrediction(replicate, predictionId) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const prediction = await replicate.predictions.get(predictionId);

    if (["succeeded", "failed", "canceled"].includes(prediction.status)) {
      return {
        status: prediction.status,
        outputUrl: getFirstOutputUrl(prediction.output),
        error: prediction.error ? String(prediction.error) : null,
      };
    }

    process.stdout.write(".");
    await delay(5000);
  }

  return { status: "timeout", outputUrl: null, error: "Prediction polling timed out" };
}

async function getLatestVersionId(replicate, modelId) {
  const [owner, name] = modelId.split("/");
  const model = await replicate.models.get(owner, name);
  return model?.latest_version?.id;
}

async function main() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Set REPLICATE_API_TOKEN in the current shell before running this script");

  const loraUrl = requireArg("lora-url");
  let compositionUrl = getArg("composition-url");
  const gender = getArg("gender") === "man" ? "man" : "woman";
  const providedIdentityUrl = getArg("identity-url");
  const referenceUrls = getArgs("reference-url");
  const replicate = new Replicate({ auth: token });

  let identityUrl = providedIdentityUrl;

  if (!identityUrl) {
    const versionId = await getLatestVersionId(replicate, FLUX_LORA_MODEL_ID);
    if (!versionId) throw new Error("Flux LoRA model version is not available");

    console.log("Starting Flux+LoRA identity reference...");
    const identityPrediction = await replicate.predictions.create({
      version: versionId,
      input: {
        prompt: `tok ${gender}, centered photorealistic face portrait, neutral expression, direct eye contact, natural skin texture, clean studio light, face identity reference`,
        hf_lora: loraUrl,
        lora_scale: 1.15,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "jpg",
        output_quality: 100,
        guidance: 3.5,
        num_inference_steps: 30,
      },
    });

    const identityResult = await waitForPrediction(replicate, identityPrediction.id);
    console.log(`\nIdentity status: ${identityResult.status}`);
    if (!identityResult.outputUrl) throw new Error(identityResult.error || "Identity reference has no output URL");
    identityUrl = identityResult.outputUrl;
    console.log(`Identity URL: ${identityUrl}`);
  }

  if (!compositionUrl) {
    if (referenceUrls.length === 0) {
      throw new Error("Pass --composition-url or at least one --reference-url for Nano Banana composition");
    }

    const versionId = await getLatestVersionId(replicate, NANO_BANANA_MODEL_ID);
    if (!versionId) throw new Error("Nano Banana model version is not available");

    console.log("Starting Nano Banana composition...");
    const compositionPrediction = await replicate.predictions.create({
      version: versionId,
      input: {
        prompt:
          "RAW photorealistic editorial portrait, stylish outfit, natural pose, realistic body proportions, cinematic light, premium background, professional photography, not AI, not illustration",
        image_input: referenceUrls,
        aspect_ratio: "3:4",
        output_format: "jpg",
      },
    });

    const compositionResult = await waitForPrediction(replicate, compositionPrediction.id);
    console.log(`\nComposition status: ${compositionResult.status}`);
    if (!compositionResult.outputUrl) throw new Error(compositionResult.error || "Composition has no output URL");
    compositionUrl = compositionResult.outputUrl;
    console.log(`Composition URL: ${compositionUrl}`);
  }

  console.log("Starting face-swap...");
  const faceSwapPrediction = await replicate.predictions.create({
    version: FACE_SWAP_VERSION_ID,
    input: {
      input_image: compositionUrl,
      swap_image: identityUrl,
    },
  });

  const faceSwapResult = await waitForPrediction(replicate, faceSwapPrediction.id);
  console.log(`\nFace-swap status: ${faceSwapResult.status}`);
  if (faceSwapResult.outputUrl) console.log(`Face-swap URL: ${faceSwapResult.outputUrl}`);
  if (faceSwapResult.error) console.log(`Error: ${faceSwapResult.error}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
