const router = require('express').Router();
const Joi = require('joi');
const axios = require('axios');
const path = require('path');
const { execFile } = require('child_process');
const auth = require('../middleware/auth');

const analyzeSchema = Joi.object({
  mode: Joi.string().valid('meal', 'workout').required(),
  imageDataUrl: Joi.string().pattern(/^data:image\/(png|jpeg|jpg|webp);base64,/i).required()
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const stripDataUrlPrefix = (imageDataUrl) => imageDataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

const extractJsonObject = (text) => {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
};

const runPython = (scriptPath, payload) =>
  new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || 'python';
    const child = execFile(
      pythonBin,
      [scriptPath],
      {
        timeout: 70000,
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr?.trim() || error.message;
          reject(new Error(`YOLO analyzer failed: ${detail}`));
          return;
        }
        resolve(stdout);
      }
    );

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });

const normalizeResult = (parsed, mode) => {
  const macros = parsed.macronutrients || parsed.micronutrients || {};
  const micros = parsed.micronutrients || {};
  return {
    itemName: typeof parsed.itemName === 'string' ? parsed.itemName : mode === 'meal' ? 'Meal' : 'Workout',
    quantity: typeof parsed.quantity === 'string' ? parsed.quantity : mode === 'meal' ? '1 serving' : '30 min',
    calories: Math.max(0, toNumber(parsed.calories)),
    macronutrients: {
      protein: mode === 'workout' ? 0 : Math.max(0, toNumber(macros.protein)),
      carbs: mode === 'workout' ? 0 : Math.max(0, toNumber(macros.carbs)),
      fat: mode === 'workout' ? 0 : Math.max(0, toNumber(macros.fat))
    },
    micronutrients: {
      fiber: mode === 'workout' ? 0 : Math.max(0, toNumber(micros.fiber))
    },
    confidence: Math.max(0, Math.min(1, toNumber(parsed.confidence))),
    notes: typeof parsed.notes === 'string' ? parsed.notes : ''
  };
};

const analyzeWithOpenAI = async ({ mode, imageDataUrl }) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const modeInstructions =
    mode === 'meal'
      ? 'Estimate total food calories and micronutrients for the full visible portion.'
      : 'Estimate calories burned for the workout shown. Set all micronutrients to 0 for workout entries.';

  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: process.env.VISION_MODEL || 'gpt-4.1',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'Return only JSON with keys: itemName, quantity, calories, macronutrients{protein,carbs,fat}, micronutrients{fiber}, confidence, notes.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                `Analyze this ${mode} image. ${modeInstructions} ` +
                'Use grams for macros and confidence in [0,1]. Return strict JSON only.'
            },
            {
              type: 'input_image',
              image_url: imageDataUrl
            }
          ]
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 45000
    }
  );

  const outputText = response.data?.output_text || '';
  const jsonText = extractJsonObject(outputText) || outputText;
  return JSON.parse(jsonText);
};

const analyzeWithLocalVision = async ({ mode, imageDataUrl }) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const model = process.env.LOCAL_VISION_MODEL || 'llama3.2-vision';

  const modeInstructions =
    mode === 'meal'
      ? 'Estimate total calories and micronutrients for the full meal in image.'
      : 'Estimate calories burned for workout in image. Micronutrients should all be 0 for workout.';

  const prompt =
    `Analyze this ${mode} image. ${modeInstructions} ` +
    'Return strict JSON with this structure only: ' +
    '{"itemName":"string","quantity":"string","calories":number,"macronutrients":{"protein":number,"carbs":number,"fat":number},"micronutrients":{"fiber":number},"confidence":number,"notes":"string"}';

  const response = await axios.post(
    `${ollamaUrl}/api/generate`,
    {
      model,
      prompt,
      images: [stripDataUrlPrefix(imageDataUrl)],
      stream: false,
      format: 'json'
    },
    {
      timeout: 60000
    }
  );

  const raw = response.data?.response;
  const jsonText = extractJsonObject(raw) || raw;
  return JSON.parse(jsonText);
};

const analyzeWithGemini = async ({ mode, imageDataUrl }) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('Please configure your GEMINI_API_KEY in the server/.env file to use real AI analysis.');
  }

  const modeInstructions =
    mode === 'meal'
      ? 'Estimate total food calories and micronutrients for the full visible portion. If you are not completely sure what the food is, output what you think is the closest possible approximation of its calories and macronutrients rather than failing or leaving them blank.'
      : 'Estimate calories burned for the workout shown. Set all micronutrients to 0 for workout entries.';

  const prompt =
    `Analyze this ${mode} image. ${modeInstructions} ` +
    'Return only JSON with keys: itemName, quantity, calories, macronutrients{protein,carbs,fat}, micronutrients{fiber}, confidence, notes.';

  const base64Data = stripDataUrlPrefix(imageDataUrl);
  // Default to image/jpeg if regex fails
  const mimeTypeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,/i);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 45000
    }
  );

  const outputText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonText = extractJsonObject(outputText) || outputText;
  return JSON.parse(jsonText);
};

const analyzeWithMock = async ({ mode }) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        mode === 'workout'
          ? {
            itemName: 'Workout Session',
            quantity: '45 min',
            calories: 350,
            macronutrients: { protein: 0, carbs: 0, fat: 0 },
            micronutrients: { fiber: 0 },
            confidence: 0.9,
            notes: 'Simulated workout analysis fallback.'
          }
          : {
            itemName: 'Healthy Meal Plate',
            quantity: '1 plate',
            calories: 650,
            macronutrients: { protein: 45, carbs: 55, fat: 20 },
            micronutrients: { fiber: 10 },
            confidence: 0.85,
            notes: 'Simulated meal analysis fallback.'
          }
      );
    }, 1200);
  });
};

const analyzeWithYolo = async ({ mode, imageDataUrl }) => {
  const scriptPath = path.join(__dirname, '..', 'ml', 'yolo_analyze.py');
  const raw = await runPython(scriptPath, { mode, imageDataUrl });
  const jsonText = extractJsonObject(raw) || raw;
  return JSON.parse(jsonText);
};

const getCoachNotesFromGroq = async (logs) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new Error('Please configure your GROQ_API_KEY in the server/.env file to use AI coaching.');
  }

  const prompt = `You are an expert fitness and nutrition coach. Here are today's verified logs for a user:\n\n${JSON.stringify(logs, null, 2)}\n\nBased on these logs, provide brief, personalized, and encouraging coach notes (max 3 sentences). Focus on actionable advice for their health goals. Do not use markdown or external formatting, just plain text.`;

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are an encouraging fitness and nutrition coach providing very brief insights based on daily logs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || 'Keep up the good work!';
};

router.post('/analyze', auth, async (req, res) => {
  try {
    const { error, value } = analyzeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
    let parsed;

    if (provider === 'gemini') {
      try {
        parsed = await analyzeWithGemini(value);
      } catch (e) {
        const errDetails = e.response?.data?.error?.message || e.response?.data?.error || e.message;
        const geminiErrorMsg = typeof errDetails === 'string' ? errDetails : JSON.stringify(errDetails);
        console.warn('Gemini failed, falling back to YOLO.', geminiErrorMsg);

        try {
          parsed = await analyzeWithYolo(value);
          // Append the Gemini failure note to the YOLO result
          parsed.notes = (parsed.notes ? parsed.notes + ' | ' : '') + 'Gemini AI Error Fallback: ' + geminiErrorMsg;
        } catch (yoloError) {
          console.error('YOLO fallback failed:', yoloError.message);
          parsed = await analyzeWithMock(value);
          parsed.notes = (parsed.notes ? parsed.notes + ' | ' : '') + 'Gemini AI Error Fallback: ' + geminiErrorMsg;
        }
      }
    } else if (provider === 'openai') {
      try {
        parsed = await analyzeWithOpenAI(value);
      } catch (e) {
        console.warn('OpenAI failed, falling back to mock.');
        parsed = await analyzeWithMock(value);
      }
    } else if (provider === 'yolo') {
      try {
        parsed = await analyzeWithYolo(value);
      } catch (e) {
        console.error('YOLO failed (possible PyTorch DLL error):', e.message);
        console.warn('Falling back to mock dataset.');
        parsed = await analyzeWithMock(value);
      }
    } else if (provider === 'local') {
      try {
        parsed = await analyzeWithLocalVision(value);
      } catch (e) {
        console.warn('Local vision failed, falling back to mock.');
        parsed = await analyzeWithMock(value);
      }
    } else {
      try {
        parsed = await analyzeWithYolo(value);
      } catch (yoloError) {
        try {
          parsed = await analyzeWithLocalVision(value);
        } catch (localError) {
          if (!process.env.OPENAI_API_KEY) {
            console.warn('No vision provider configured. Falling back to mock data.');
            parsed = await analyzeWithMock(value);
          } else {
            parsed = await analyzeWithOpenAI(value);
          }
        }
      }
    }

    return res.json(normalizeResult(parsed, value.mode));
  } catch (routeError) {
    const status = routeError.response?.status || 500;
    const details = routeError.response?.data?.error || routeError.response?.data?.message || routeError.message;
    return res.status(status).json({ message: 'Failed to analyze image.', details });
  }
});

router.post('/coach-notes', auth, async (req, res) => {
  try {
    const logs = req.body.logs;
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ message: 'Invalid logs array provided.' });
    }

    if (logs.length === 0) {
      return res.json({ notes: 'No logs yet for today. Upload a photo to get started!' });
    }

    const notes = await getCoachNotesFromGroq(logs);
    res.json({ notes });
  } catch (error) {
    console.error('Groq Coach Notes error:', error.message);
    const details = error.response?.data?.error?.message || error.message;
    res.status(500).json({ message: 'Failed to generate coach notes.', details });
  }
});

module.exports = router;
