
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Storyboard, Scene, AnalysisResult } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    'GEMINI_API_KEY environment variable is not set. ' +
    'Please create a .env file with GEMINI_API_KEY=your_api_key'
  );
}

const ai = new GoogleGenAI({ apiKey });

const sceneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sceneNumber: { type: Type.INTEGER },
    shotTitle: { type: Type.STRING, description: "Short, catchy title for the shot." },
    location: { type: Type.STRING, description: "Scene heading (e.g. INT. LAB - DAY)." },
    characters: { type: Type.STRING, description: "List of characters present." },
    props: { type: Type.STRING, description: "Key props needed." },
    action: { type: Type.STRING, description: "Action description." },
    dialogue: { type: Type.STRING, description: "Dialogue or N/A." },
    shotDescription: { type: Type.STRING, description: "Directorial notes on framing." },
    cameraAngle: { type: Type.STRING, description: "e.g. Wide Shot, Dutch Angle." },
    cameraMovement: { type: Type.STRING, description: "e.g. Static, Dolly In." },
    cameraFocus: { type: Type.STRING, description: "e.g. Sharp on eyes." },
    depthOfField: { type: Type.STRING, description: "e.g. Shallow, f/1.8." },
    lighting: { type: Type.STRING, description: "Lighting setup." },
    imagePrompt: { type: Type.STRING, description: "Detailed English visual prompt." },
    aspectRatio: { type: Type.STRING },
    transition: { type: Type.STRING, description: "e.g. CUT TO." },
    filmGrain: { type: Type.BOOLEAN },
    chromaticAberration: { type: Type.BOOLEAN },
    volumetricLighting: { type: Type.BOOLEAN },
  },
  required: ["sceneNumber", "location", "action", "cameraAngle", "lighting", "imagePrompt"]
};

const storyboardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    synopsis: { type: Type.STRING },
    genre: { type: Type.STRING },
    visualStyle: { type: Type.STRING },
    location: { type: Type.STRING, description: "Primary setting." },
    scenes: { type: Type.ARRAY, items: sceneSchema },
    consistencySeed: { type: Type.NUMBER },
    aspectRatio: { type: Type.STRING }
  },
  required: ["title", "synopsis", "genre", "visualStyle", "scenes"]
};

const issueSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['consistency', 'missing_data', 'logic', 'visual'] },
    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    description: { type: Type.STRING },
    suggestion: { type: Type.STRING },
    sceneNumber: { type: Type.INTEGER }
  },
  required: ["type", "severity", "description", "suggestion"]
};

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    issues: { type: Type.ARRAY, items: issueSchema },
    overallScore: { type: Type.INTEGER }
  },
  required: ["issues", "overallScore"]
};

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

export const generateStoryboardScript = async (userIdea: string, seed?: number): Promise<Storyboard> => {
  try {
    const model = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: `Role: World-class Director & Line Producer.
      Task: Create a storyboard from the user idea.

      Strategy:
      1. Analyze idea & write a synopsis.
      2. Define a "Primary Setting" to minimize location moves.
      3. Define core "Characters" and keep names/descriptions consistent.
      4. Break down into 4-6 key scenes.
      5. Create detailed image prompts including character physical descriptions.

      User Idea: "${userIdea}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: storyboardSchema,
        seed: seed
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    const storyboard = JSON.parse(response.text) as Storyboard;
    storyboard.consistencySeed = seed !== undefined ? seed : Math.floor(Math.random() * 2000000000);
    return storyboard;
  } catch (error) {
    console.error("Script generation failed:", error);
    throw new Error(getErrorMessage(error, "Script generation failed"));
  }
};

export const repairStoryboard = async (current: Storyboard): Promise<Storyboard> => {
  try {
    const model = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: `Role: Script Doctor.
      Task: Fix data issues in this storyboard JSON.
      1. Fix typos/grammar.
      2. Fill missing fields (deduce from context).
      3. Ensure character name/description continuity.
      4. Ensure location name consistency.
      5. DO NOT change 'consistencySeed', 'imagePrompt', 'generatedImageUrl'.

      JSON: ${JSON.stringify(current)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: storyboardSchema,
      }
    });

    if (!response.text) throw new Error("Repair failed");
    const repaired = JSON.parse(response.text) as Storyboard;

    repaired.scenes = repaired.scenes.map((scene, i) => {
      const original = current.scenes.find(s => s.sceneNumber === scene.sceneNumber) || current.scenes[i];
      return {
        ...scene,
        generatedImageUrl: original?.generatedImageUrl,
        error: undefined
      };
    });
    repaired.consistencySeed = current.consistencySeed;
    return repaired;
  } catch (error) {
    console.error("Repair failed:", error);
    throw new Error(getErrorMessage(error, "Repair failed"));
  }
};

export const analyzeStoryboardIssues = async (storyboard: Storyboard): Promise<AnalysisResult> => {
  try {
    const model = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: `Role: Continuity Supervisor.
      Task: Analyze storyboard for issues.
      Check for: Consistency (names/places), Missing Data, Flow Logic.

      Storyboard: ${JSON.stringify(storyboard)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      }
    });

    if (!response.text) throw new Error("Analysis failed");
    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw new Error(getErrorMessage(error, "Analysis failed"));
  }
};

export const generateSceneImage = async (scene: Scene, visualStyle: string, seed?: number): Promise<string> => {
  try {
    const model = "gemini-2.5-flash-image";

    const neg = scene.negativePrompt ? `\n**EXCLUDE**: ${scene.negativePrompt}` : '';

    let optics = "Arri Alexa sensor";
    if (scene.filmGrain !== false) optics += ", 35mm grain";
    if (scene.chromaticAberration !== false) optics += ", chromatic aberration";
    if (scene.volumetricLighting !== false) optics += ", volumetric lighting";

    const prompt = `
      # VISUAL SPEC
      **STYLE**: ${visualStyle}
      **ANGLE**: ${scene.cameraAngle}
      ---
      **CONTEXT**:
      LOC: ${scene.location || 'N/A'}
      CHARS: ${scene.characters || 'N/A'}
      PROPS: ${scene.props || 'N/A'}
      DESC: ${scene.imagePrompt}
      ---
      **TECH**:
      Lens: 35mm Anamorphic.
      Focus: ${scene.cameraFocus || 'Sharp on subject'}.
      Depth: ${scene.depthOfField || 'Shallow bokeh'}.
      Light: ${scene.lighting}.
      Move: ${scene.cameraMovement || 'Static'}.
      Optics: ${optics}.
      Quality: 8k photorealistic.
      ${neg}

      **CMD**: Create high-fidelity movie still adhering to style/composition.
    `.trim();

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        seed: seed,
        imageConfig: { aspectRatio: scene.aspectRatio || "16:9" }
      }
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) {
       if (response.promptFeedback?.blockReason) throw new Error(`Blocked: ${response.promptFeedback.blockReason}`);
       throw new Error("No image generated.");
    }
    return `data:image/jpeg;base64,${data}`;

  } catch (error) {
    console.error(`Img gen error scene ${scene.sceneNumber}:`, error);
    throw new Error(getErrorMessage(error, "Generation failed"));
  }
};
