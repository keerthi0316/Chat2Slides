# 🧠 Chat2Slides

A **Next.js 14 + TypeScript** powered chat interface that generates **PowerPoint presentations** from natural language prompts using AI.  
Built with a clean  MagicSlides AI-Slide UI chat interface — featuring simulated reasoning cards, persistent history, and real-time slide previews.

---

## ✨ Features

- 💬 **Chat-first Interface** – Generate, refine, and preview your presentation through natural conversation.  
- 🎭 **Simulated Thinking Steps** – The AI visually “thinks” through steps like *Searching the web*, *Synthesizing sources*, etc.  
- 💾 **Session Persistence** – Chat history and generated slides are saved locally via IndexedDB.  
- 📑 **Presentation Preview** – Live slide deck rendering beside the chat with real-time updates.  
- ⏬ **Export to PowerPoint** – Instantly download your AI-generated presentation as `.pptx`.  
- 🎨 **Modern UI** – Minimalist dual-pane design with subtle animations and adaptive layout.  
- 🔁 **Copy as Prompt** – Reuse or tweak any AI response by copying it back into the input bar.  

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | **Next.js 14 (App Router)** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| Persistence | **IndexedDB** via `idb-keyval` |
| Image Rendering | `next/image` |
| File Export | Custom `/api/download-pptx` endpoint |
| AI Processing | Custom `/api/generate` endpoint |
| Package Manager | `npm` or `pnpm` |

---

## 🖼️ Screenshots

### ⏬ Intro
![Intro PPTX](public/screenshots/Screenshot%202025-10-29%20at%205.31.43 PM.png)

### 💬 Chat Interface
![Chat-1 UI](public/screenshots/Screenshot%202025-10-29%20at%205.31.50 PM.png)


### 🧩 Slide Preview
![Slide Preview](public/screenshots/Screenshot%202025-10-29%20at%205.30.34 PM.png)
![Chat UI](public/screenshots/Screenshot%202025-10-29%20at%205.31.06 PM.png)

---

## 🧠 Architecture Overview

```
├── app/
│   ├── api/
│   │   ├── generate/route.ts       # Handles slide generation via AI backend
│   │   └── download-pptx/route.ts  # Exports generated slides as PowerPoint
│   └── page.tsx                    # Main chat interface + preview
├── components/                     # (Optional) UI helpers
├── public/                         # Static assets
└── README.md
```

---

## ⚙️ Local Development Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/<your-username>/ai-presentation-generator.git
cd ai-presentation-generator
```

### 2️⃣ Install dependencies

```bash
npm install
# or
pnpm install
```

### 3️⃣ Configure environment variables

Create a `.env.local` file in the root directory:

```bash
GOOGLE_API_KEY=sk-...
UNSPLASH_ACCESS_KEY=sk-...
```

*(Adjust keys as needed for your API provider or custom model endpoint.)*

### 4️⃣ Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)  
and start chatting your way to AI-powered slides.

---

## 🧰 Commands

| Command | Description |
|----------|-------------|
| `npm run dev` | Run in development mode |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Lint TypeScript and JSX files |

---

## 🧑‍💻 API Endpoints

### `/api/generate`
Accepts a `prompt` and optional `currentSlides`.  
Returns structured `PresentationData`:

```json
{
  "slides": [
    {
      "title": "Introduction to AI",
      "content": ["Definition", "History", "Applications"],
      "image": "https://example.com/image.jpg"
    }
  ]
}
```

### `/api/download-pptx`
Accepts a JSON payload of slides and returns a `.pptx` file for download.

---

## 💡 Design Highlights

- Randomized **“simulated steps”** like _Searching the web_, _Drafting outline_, _Selecting imagery_ give a lifelike AI feel.
- Thought and action cards use soft **shadow + border accents**.
- **Right panel preview** updates in sync with chat responses.
- **Persistent session** ensures data continuity between reloads.

---

## 🌈 Customization

- 🎨 Change accent color: update `ACCENT_COLOR` constant in `page.tsx`.
- ⚙️ Modify simulated actions: edit the `SIMULATED_ACTIONS` array.
- 🪄 Replace font, radius, or animations: adjust Tailwind theme in `tailwind.config.js`.

---

## 🚀 Deployment

### Vercel (recommended)

1. Push your repository to GitHub.
2. Import into [Vercel](https://vercel.com/).
3. Add environment variables.
4. Deploy → instantly live.

### Manual (Node.js)
```bash
npm run build
npm start
```

---

## 🧠 Example Prompt

> “Create a 5-slide presentation about the future of renewable energy, focusing on solar, wind, and emerging technologies.”

The app will:
1. Simulate research and drafting steps.
2. Generate slide titles, bullet points, and imagery.
3. Display real-time previews.
4. Offer a single-click PowerPoint download.

---

## 🪪 License

This project is licensed under the **MIT License** — feel free to modify and build upon it.

---

## ❤️ Acknowledgements

- [Next.js](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [idb-keyval](https://github.com/jakearchibald/idb-keyval)
- [OpenAI](https://platform.openai.com)
- Icons via [Heroicons](https://heroicons.com)

---

> _Built with focus, creativity, and AI-powered imagination._  
> **by keerthi**
