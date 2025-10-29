import { NextRequest, NextResponse } from "next/server";
// Install this package: npm install pptxgenjs
import PptxGenJS from "pptxgenjs";

/**
 * Downloads an external image URL and converts it to Base64 format.
 * This is necessary for embedding the image content into a PPTX file.
 */
async function getBase64ImageFromUrl(url: string): Promise<string> {
    if (!url) return '';
    try {
        // **FIX: Added User-Agent header to bypass potential hotlink protection**
        const response = await fetch(url, {
            headers: {
                // Mimic a standard browser request
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // Added explicit cache control to prevent stale content issues
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Failed to download image from: ${url}. Status: ${response.status}`);
            return '';
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // NOTE: The Content-Type header must be reliable for Base64 URI prefix
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64Image = buffer.toString('base64');

        return `data:${contentType};base64,${base64Image}`;

    } catch (error) {
        console.error("Error processing image for PPTX:", error);
        return '';
    }
}

// Define the Slide structure for type safety
interface Slide {
    title: string;
    content: string[];
    image: string; // The fetched Unsplash URL
}

export async function POST(req: NextRequest) {
    try {
        const { slides, presentationTitle = "AI Generated Presentation" } = await req.json();

        if (!slides || slides.length === 0) {
            return NextResponse.json({ error: "No slide data provided" }, { status: 400 });
        }
        
        const pptx = new PptxGenJS();
        pptx.title = presentationTitle;
        
        // **Theme and Layout**
        pptx.defineLayout({ name: 'AIGenerated', width: 10, height: 7.5 });
        pptx.layout = 'AIGenerated';

        // Process all slides and images concurrently
        const slidePromises = slides.map(async (slide: Slide) => {
            const pptxSlide = pptx.addSlide();
            pptxSlide.bkgd = "FFFFFF"; // White background for readability
            
            // 1. Add Title
            pptxSlide.addText(slide.title, {
                x: 0.5, y: 0.25, w: "90%", h: 1, fontSize: 32, bold: true, color: "000000",
            });

            // 2. Add Content (Moved to the left to make room for the image)
            const contentString = slide.content.join("\n");
            pptxSlide.addText(contentString, {
                x: 0.5,
                y: 1.5,
                w: "50%",
                h: 4,
                fontSize: 18,
                color: "363636",
                bullet: { type: "bullet" }, // ✅ changed from 'disc' to 'bullet'
              });
              

            // 3. Add Image (Now possible via server-side Base64 conversion)
            if (slide.image) {
                const base64DataUri = await getBase64ImageFromUrl(slide.image);
                
                if (base64DataUri) {
                    pptxSlide.addImage({
                        data: base64DataUri,
                        x: 5.8, // Slightly adjusted x position
                        y: 1.5, 
                        w: 4.0, // Increased width slightly
                        h: 5.0,
                        sizing: { type: 'contain', w: 4.0, h: 5.0 }
                    });
                } else {
                    // Fallback text if image download failed
                    pptxSlide.addText("Image Failed to Load (Server Error)", {
                        x: 6.0, y: 3.5, w: 3.5, h: 1.0, fontSize: 14, color: "FF0000", align: "center"
                    });
                }
            }
        });

        // Wait for all image fetches and slide generation to complete
        await Promise.all(slidePromises);

        // Generate the PPTX buffer
        const buffer = await pptx.write({ outputType: "nodebuffer" });

        // Send the PPTX file buffer back to the client
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "Content-Disposition": `attachment; filename="${presentationTitle.replace(/ /g, '_')}.pptx"`,
            },
        });

    } catch (error) {
        console.error("Server-side PPTX generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate presentation", details: (error as Error).message },
            { status: 500 }
        );
    }
}
