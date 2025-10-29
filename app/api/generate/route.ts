import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } from "@google/generative-ai";
  import { NextRequest, NextResponse } from "next/server";
  
  // Model API Key (Gemini)
  const MODEL_NAME = "gemini-2.5-pro"; 
  const API_KEY = process.env.GOOGLE_API_KEY || "";
  
  // Unsplash API Key
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "";
  
  // **UPDATED JSON STRUCTURE - Now requires an image_keyword**
  const JSON_STRUCTURE = `
  {
    "slides": [
      {
        "title": "Slide 1 Title",
        "content": [
          "Bullet point 1",
          "Bullet point 2"
        ],
        "image_keyword": "<keyword>" 
      },
      {
        "title": "Slide 2 Title",
        "content": [
          "Content for slide 2..."
        ],
        "image_keyword": "<another-keyword>"
      }
    ]
  }
  `;
  
  /**
   * Extracts a JSON object from a string that might be wrapped in markdown.
   */
  function extractJson(text: string): string {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[2];
      if (jsonString) {
        return jsonString;
      }
    }
  
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrce) {
      return text.substring(firstBrace, lastBrace + 1);
    }
    return text;
  }
  
  /**
   * Fetches a relevant image URL from the official Unsplash API using the Access Key.
   */
  async function fetchUnsplashImage(keyword: string): Promise<string> {
    if (!keyword || !UNSPLASH_ACCESS_KEY) {
      // Fallback to the public source URL if key is missing or for empty keywords, 
      // though this is likely to fail as noted by the user.
      return keyword.trim() 
        ? `https://source.unsplash.com/1600x900/?${encodeURIComponent(keyword.trim())}` 
        : "";
    }
  
    // Use the /photos/random endpoint with a query for relevance
    const unsplashApiUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword.trim())}&orientation=landscape&count=1`;
  
    try {
      const response = await fetch(unsplashApiUrl, {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
        // Ensures the API gets a fresh image for each request
        cache: 'no-store' 
      });
  
      if (!response.ok) {
        console.error(`Unsplash API failed with status ${response.status} for keyword: ${keyword}`);
        // Return empty string if the authenticated API fails
        return ""; 
      }
  
      const data = await response.json();
      
      // Unsplash API returns an array or a single object. We want the 'regular' size URL.
      const photo = Array.isArray(data) ? data[0] : data;
  
      return photo?.urls?.regular || ""; 
      
    } catch (e) {
      console.error("Error fetching image from Unsplash API:", e);
      return "";
    }
  }
  
  /**
   * Prepares the input data for the model, transforming the client's 'image' URL 
   * back into a simple 'image_keyword' for the model to work with.
   */
  function prepareSlidesForModel(currentSlides: any) {
    if (!currentSlides || !currentSlides.slides || currentSlides.slides.length === 0) {
      return null;
    }
  
    // Map the current slides to the format the model expects (keyword only)
    const slidesForPrompt = {
      slides: currentSlides.slides.map((slide: any) => {
        let keyword = "";
        // Extract the keyword from the full Unsplash URL if present
        if (slide.image && typeof slide.image === 'string') {
          // Check for the old source URL format
          const match = slide.image.match(/\/\?([^/]+)$/);
          keyword = match ? match[1] : '';

          // If the image came from the official API (a long stable URL), 
          // we can't reliably extract the original keyword, so we just use the existing title
          if (!keyword) {
             keyword = slide.title.split(/\s+/).slice(0, 2).join('-');
          }
        }
        
        // Return the structure the model is being instructed to use
        return {
          title: slide.title,
          content: slide.content,
          image_keyword: keyword, 
        };
      })
    };
    
    return slidesForPrompt;
  }
  
  // **UPDATED PROMPT FUNCTION**
  function buildPrompt(prompt: string, currentSlides: any) {
    // Convert the current slide data to the keyword format for the model's review
    const slidesForPrompt = prepareSlidesForModel(currentSlides);
    const slideData = slidesForPrompt ? JSON.stringify(slidesForPrompt, null, 2) : '';
  
    let fullPrompt = `You are an assistant that helps create PowerPoint presentations.
  Your **ONLY** output must be a single, valid JSON object. Do not include any text before or after the JSON, and do not use markdown (e.g., \`\`\`json).
  The JSON object must follow this exact structure:
  ${JSON_STRUCTURE}
  
  **IMAGE RULE:** You **must** populate the "image_keyword" field for every slide.
  - The value **must** be a single, relevant, URL-safe keyword for the slide's content (e.g., "technology", "nature", "business").
  - If no image is relevant, you **must** set the image_keyword field to an empty string: \`"image_keyword": ""\`
  
  **User's Request:** ${prompt}
  `;
  
    if (slidesForPrompt) {
      fullPrompt += `
  **Current Slide Data (to be edited):**
  ${slideData}
  
  Based on the user's request, modify the "Current Slide Data". Do not just generate new slides unless the user asks to "add" new ones.
  `;
    } else {
      fullPrompt += `
  Generate a new presentation based on the user's request.
  `;
    }
  
    return fullPrompt;
  }
  
  export async function POST(req: NextRequest) {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not found" },
        { status: 500 }
      );
    }
  
    // Check if Unsplash key is available and warn if not
    if (!UNSPLASH_ACCESS_KEY) {
        console.warn("UNSPLASH_ACCESS_KEY not found. Images may fail to load due to rate limiting on the public endpoint.");
    }

    try {
      const { prompt, currentSlides } = await req.json();
  
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt is required" },
          { status: 400 }
        );
      }
  
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });
  
      const generationConfig = {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 8192,
      };
  
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];
  
      const fullPrompt = buildPrompt(prompt, currentSlides);
  
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig,
        safetySettings,
      });
  
      const response = result.response;
      const rawText = response.text();
      const jsonText = extractJson(rawText);
  
      try {
        const jsonData: { slides: { [key: string]: any }[] } = JSON.parse(jsonText);
  
        // **NEW: Process the model's keyword into a final Unsplash URL by fetching it**
        const slidesWithImagePromises = jsonData.slides.map(async (slide: any) => {
            const keyword = slide.image_keyword || '';
            
            // Fetch the actual image URL from the authenticated Unsplash API
            const imageUrl = await fetchUnsplashImage(keyword);
  
            // Destructure to remove image_keyword and add the final image URL
            const { image_keyword, ...rest } = slide; 
            
            return {
                ...rest,
                image: imageUrl, // Contains the actual fetched Unsplash URL
            };
        });

        // Wait for all image fetches to complete
        const resolvedSlides = await Promise.all(slidesWithImagePromises);
        
        const processedData = { slides: resolvedSlides };
        
        return NextResponse.json(processedData);
        
      } catch (parseError: any) {
        console.error("Failed to parse JSON. Cleaned text was:", jsonText);
        console.error("Original model response was:", rawText);
        throw new Error(`Failed to parse AI response as JSON. ${parseError.message}`);
      }
  
    } catch (error: any) {
      console.error("Error generating slides:", error);
      return NextResponse.json(
        { error: "Failed to generate slides", details: error.message },
        { status: 500 }
      );
    }
  }
